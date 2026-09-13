/* ------------------------------------------------------------------ *
 * SUFU client data-layer contract tests.                             *
 *                                                                    *
 * These assert the *shape* of every privileged interaction the       *
 * client can make: which rows it may touch, which columns it may     *
 * write, and that authorization-sensitive operations go through      *
 * server-side RPCs rather than direct table writes. RLS enforcement  *
 * itself lives in Postgres (verified live in the acceptance suite);  *
 * these tests guarantee the client never attempts a privileged       *
 * write in the first place.                                          *
 * ------------------------------------------------------------------ */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyToJob,
  createListing,
  createOrder,
  getOrCreateConversation,
  hasApplied,
  incrementViews,
  markConversationRead,
  messagesForConversation,
  myApplications,
  myConversations,
  myEntitlements,
  myOrders,
  mySavedListings,
  receivedApplications,
  sendMessage,
  toggleSavedListing,
  updateApplicationStatus,
  updateOwnProfile,
} from "../api";

/* --------------------------- mock harness --------------------------- */

interface ChainCall {
  method: string;
  args: unknown[];
}

interface MockState {
  insert?: unknown;
  update?: unknown;
  deleted?: boolean;
}

type Result = { data?: unknown; error?: unknown };

/** Fluent thenable query chain that records every method call. */
interface Chain {
  calls: ChainCall[];
  state: MockState;
  setResult(r: Result): Chain;
  queueResult(r: Result): Chain;
  then(resolve: (v: Result) => void): void;
}

interface MockSupabase {
  chains: Map<string, Chain>;
  rpcCalls: { name: string; args: unknown }[];
  /** When true, rpc() resolves with an error instead of success (failure-path tests). */
  rpcFail?: boolean;
  from(table: string): Chain;
  rpc(name: string, args: unknown): Chain;
}

function makeChain(result: Result = { data: [], error: null }): Chain {
  const calls: ChainCall[] = [];
  const state: MockState = {};
  let current: Result = result;
  const queued: Result[] = [];
  let proxy: Chain;
  const target = {
    calls,
    state,
    setResult(r: Result) {
      current = r;
      queued.length = 0;
      return proxy;
    },
    queueResult(r: Result) {
      queued.push(r);
      return proxy;
    },
    then(resolve: (v: Result) => void) {
      resolve(queued.shift() ?? current);
    },
  } as unknown as Chain;

  proxy = new Proxy(target, {
    get(t, prop) {
      if (
        prop === "then" ||
        prop === "setResult" ||
        prop === "queueResult" ||
        prop === "calls" ||
        prop === "state"
      ) {
        return Reflect.get(t, prop);
      }
      return (...args: unknown[]) => {
        calls.push({ method: String(prop), args });
        if (prop === "insert") state.insert = args[0];
        if (prop === "update") state.update = args[0];
        if (prop === "delete") state.deleted = true;
        return proxy;
      };
    },
  });
  return proxy;
}

function makeSupabaseMock(): MockSupabase {
  const chains = new Map<string, Chain>();
  const rpcCalls: { name: string; args: unknown }[] = [];
  return {
    chains,
    rpcCalls,
    from(table: string) {
      if (!chains.has(table)) chains.set(table, makeChain());
      return chains.get(table) as Chain;
    },
    rpc(name: string, args: unknown) {
      rpcCalls.push({ name, args });
      // Reuse a pre-seeded response if the test provided one, otherwise
      // succeed (or fail when rpcFail is set) by default.
      const existing = chains.get(`rpc:${name}`);
      const chain =
        existing ??
        makeChain(
          this.rpcFail ? { data: null, error: { message: "rpc failed" } } : { data: "ok", error: null }
        );
      chains.set(`rpc:${name}`, chain);
      return chain;
    },
  };
}

const { supabaseMock } = vi.hoisted(() => {
  return { supabaseMock: makeSupabaseMock() };
});

vi.mock("../supabase", () => ({ supabase: supabaseMock }));

beforeEach(() => {
  supabaseMock.chains.clear();
  supabaseMock.rpcCalls.length = 0;
  supabaseMock.rpcFail = false;
});

const chain = (table: string) => supabaseMock.chains.get(table);
const callList = (table: string) => chain(table)?.calls as ChainCall[] | undefined;

/* ------------------------------- tests ------------------------------- */

describe("listings — no client-side privilege escalation", () => {
  it("createListing never sends privileged columns (views/featured/verified_*)", async () => {
    chain("listings")?.setResult({ data: [{ id: "l1" }], error: null });
    await createListing("provider-1", {
      type: "service",
      title: "Garden makeover",
      description: "Full tidy-up",
      price: 25,
      city: "Harare",
    });

    const insert = chain("listings")?.state.insert as Record<string, unknown>;
    expect(insert).toBeDefined();
    expect(insert.provider_id).toBe("provider-1");
    expect(insert.status).toBe("active");
    // Privileged columns must never leave the browser.
    for (const forbidden of ["views", "featured", "verified_email", "verified_business", "rating"]) {
      expect(insert).not.toHaveProperty(forbidden);
    }
  });

  it("incrementViews goes through the owner-aware RPC with a viewer id", async () => {
    await incrementViews("l1", "viewer-9");
    expect(supabaseMock.rpcCalls).toContainEqual({
      name: "increment_views",
      args: { p_listing_id: "l1", p_viewer_id: "viewer-9" },
    });
  });
});

describe("saved listings — user isolation", () => {
  it("save inserts exactly the owner-scoped row", async () => {
    // Not currently saved → insert path.
    supabaseMock.from("saved_listings").setResult({ data: null, error: null });
    const res = await toggleSavedListing("me", "l1");
    expect(res).toEqual({ saved: true });
    expect(chain("saved_listings")?.state.insert).toEqual({
      profile_id: "me",
      listing_id: "l1",
    });
  });

  it("unsave deletes only the owner's row for that listing", async () => {
    supabaseMock.from("saved_listings").setResult({ data: { listing_id: "l1" }, error: null });
    const res = await toggleSavedListing("me", "l1");
    expect(res).toEqual({ saved: false });
    const calls = callList("saved_listings") ?? [];
    expect(calls).toContainEqual({ method: "delete", args: [] });
    expect(calls).toContainEqual({ method: "eq", args: ["profile_id", "me"] });
    expect(calls).toContainEqual({ method: "eq", args: ["listing_id", "l1"] });
  });

  it("mySavedListings is always scoped to the signed-in user", async () => {
    chain("saved_listings")?.setResult({ data: [], error: null });
    await mySavedListings("me");
    const calls = callList("saved_listings") ?? [];
    expect(calls).toContainEqual({ method: "eq", args: ["profile_id", "me"] });
    // No query shape exists that returns other users' saves.
    expect(calls.some((c) => c.method === "or")).toBe(false);
  });
});

describe("job applications — ownership + duplicate prevention", () => {
  it("applyToJob inserts only listing/applicant/cover_note (no status spoofing)", async () => {
    chain("applications")?.setResult({ data: null, error: null });
    await applyToJob("job-1", "me", "I can start Monday");
    expect(chain("applications")?.state.insert).toEqual({
      listing_id: "job-1",
      applicant_id: "me",
      cover_note: "I can start Monday",
    });
  });

  it("applyToJob with no note sends cover_note null", async () => {
    chain("applications")?.setResult({ data: null, error: null });
    await applyToJob("job-1", "me");
    expect(chain("applications")?.state.insert).toEqual({
      listing_id: "job-1",
      applicant_id: "me",
      cover_note: null,
    });
  });

  it("hasApplied checks the unique (listing, applicant) pair", async () => {
    chain("applications")?.setResult({ data: null, error: null });
    await hasApplied("job-1", "me");
    const calls = callList("applications") ?? [];
    expect(calls).toContainEqual({ method: "eq", args: ["listing_id", "job-1"] });
    expect(calls).toContainEqual({ method: "eq", args: ["applicant_id", "me"] });
  });

  it("receivedApplications is provider-scoped (listing owner only)", async () => {
    chain("applications")?.setResult({ data: [], error: null });
    await receivedApplications("owner-1");
    expect(callList("applications")).toContainEqual({
      method: "eq",
      args: ["listing.provider_id", "owner-1"],
    });
  });

  it("myApplications is applicant-scoped", async () => {
    chain("applications")?.setResult({ data: [], error: null });
    await myApplications("me");
    expect(callList("applications")).toContainEqual({
      method: "eq",
      args: ["applicant_id", "me"],
    });
  });

  it("updateApplicationStatus uses the owner-only RPC, never a direct table write", async () => {
    await updateApplicationStatus("app-1", "accepted");
    expect(supabaseMock.rpcCalls).toContainEqual({
      name: "update_application_status",
      args: { p_application_id: "app-1", p_status: "accepted" },
    });
    // A client-side status flip is impossible from this code path.
    expect(supabaseMock.chains.has("applications")).toBe(false);
  });
});

describe("messaging — participant-only authorization", () => {
  it("sendMessage cannot spoof the recipient or the read state", async () => {
    chain("messages")?.setResult({ data: null, error: null });
    await sendMessage("conv-1", "me", "hello");
    expect(chain("messages")?.state.insert).toEqual({
      conversation_id: "conv-1",
      sender_id: "me",
      body: "hello",
    });
  });

  it("markConversationRead only clears the other party's unread messages", async () => {
    chain("messages")?.setResult({ data: null, error: null });
    await markConversationRead("conv-1", "me");
    const calls = callList("messages") ?? [];
    expect(calls).toContainEqual({ method: "neq", args: ["sender_id", "me"] });
    expect(calls).toContainEqual({ method: "is", args: ["read_at", null] });
    expect((chain("messages")?.state.update as Record<string, unknown>).read_at).toBeDefined();
  });

  it("messagesForConversation is scoped to a single conversation", async () => {
    chain("messages")?.setResult({ data: [], error: null });
    await messagesForConversation("conv-1", "me");
    const calls = callList("messages") ?? [];
    expect(calls).toContainEqual({ method: "eq", args: ["conversation_id", "conv-1"] });
  });

  it("myConversations only ever returns threads I participate in", async () => {
    chain("conversations")?.setResult({ data: [], error: null });
    await myConversations("me");
    expect(callList("conversations")).toContainEqual({
      method: "or",
      args: ["user_a.eq.me,user_b.eq.me"],
    });
  });

  it("getOrCreateConversation delegates pair-normalization to the server RPC", async () => {
    await getOrCreateConversation("l1", "other-1");
    expect(supabaseMock.rpcCalls).toContainEqual({
      name: "get_or_create_conversation",
      args: { p_listing_id: "l1", p_other_id: "other-1" },
    });
  });
});

describe("profile — whitelisted self-edits only", () => {
  it("updateOwnProfile strips every non-whitelisted key (verified_*, rating, …)", async () => {
    chain("profiles")?.setResult({ data: null, error: null });
    await updateOwnProfile("me", {
      display_name: "New Name",
      city: "Harare",
      verified_email: true,
      rating: 5,
    } as Parameters<typeof updateOwnProfile>[1]);
    expect(chain("profiles")?.state.update).toEqual({
      display_name: "New Name",
      city: "Harare",
    });
  });

  it("no client function can grant ANY verification badge (all four verified_* + admin/privileged keys)", async () => {
    chain("profiles")?.setResult({ data: null, error: null });
    await updateOwnProfile("me", {
      display_name: "Hacker",
      verified_phone: true,
      verified_email: true,
      verified_identity: true,
      verified_business: true,
      is_admin: true,
      rating: 5,
      review_count: 999,
      completed_jobs: 999,
    } as Parameters<typeof updateOwnProfile>[1]);
    const update = chain("profiles")?.state.update as Record<string, unknown>;
    expect(update).toEqual({ display_name: "Hacker" });
    // Server-authoritative columns must never be attempted from the browser.
    for (const forbidden of [
      "verified_phone",
      "verified_email",
      "verified_identity",
      "verified_business",
      "is_admin",
      "rating",
      "review_count",
      "completed_jobs",
    ]) {
      expect(update).not.toHaveProperty(forbidden);
    }
  });
});

describe("failure paths — the client fails closed with friendly errors", () => {
  /** Create the table chain AND force its next resolution to fail. */
  const failChain = (table: string, message = "boom") =>
    supabaseMock.from(table).setResult({ data: null, error: { message } });

  it("createListing returns a message when the insert is rejected (e.g. RLS)", async () => {
    failChain("listings", "new row violates row-level security policy");
    const res = await createListing("provider-1", {
      type: "service",
      title: "x",
      description: "y",
    });
    expect(res.id).toBeUndefined();
    expect(res.error).toContain("row-level security");
  });

  it("sendMessage returns an error when the insert fails", async () => {
    failChain("messages", "new row violates row-level security policy");
    const res = await sendMessage("conv-1", "me", "hello");
    expect(res.error).toBeDefined();
  });

  it("hasApplied returns false when the query errors (no crash)", async () => {
    failChain("applications");
    await expect(hasApplied("job-1", "me")).resolves.toBe(false);
  });

  it("myConversations returns [] when the query errors", async () => {
    failChain("conversations");
    await expect(myConversations("me")).resolves.toEqual([]);
  });

  it("mySavedListings returns [] when the query errors", async () => {
    failChain("saved_listings");
    await expect(mySavedListings("me")).resolves.toEqual([]);
  });

  it("receivedApplications returns [] when the query errors", async () => {
    failChain("applications");
    await expect(receivedApplications("owner-1")).resolves.toEqual([]);
  });

  it("myApplications returns [] when the query errors", async () => {
    failChain("applications");
    await expect(myApplications("me")).resolves.toEqual([]);
  });

  it("updateApplicationStatus maps an RPC rejection to a human error (not a raw stack)", async () => {
    supabaseMock.rpcFail = true;
    const res = await updateApplicationStatus("app-1", "accepted");
    expect(res.error).toMatch(/couldn't update/i);
    expect(res.error).not.toContain("rpc failed");
  });

  it("toggleSavedListing surfaces an insert failure without losing state", async () => {
    // Not currently saved, and the insert fails (e.g. listing removed).
    const savedChain = supabaseMock.from("saved_listings");
    savedChain.queueResult({ data: null, error: null }); // isListingSaved → not saved
    savedChain.queueResult({ data: null, error: { message: "insert blocked" } }); // insert → fails
    const res = await toggleSavedListing("me", "l1");
    expect(res.saved).toBe(false);
    expect(res.error).toBeDefined();
  });
});

describe("commerce — zero-trust client contract", () => {
  it("createOrder delegates to the server RPC and never sends amount/fee/status", async () => {
    supabaseMock.chains.set(
      "rpc:create_order",
      makeChain({
        data: {
          id: "o1",
          listing_id: "l1",
          buyer_id: "me",
          seller_id: "seller-1",
          amount_minor: 700,
          platform_fee_minor: 35,
          currency: "USD",
          status: "pending",
          created_at: "2026-01-01T00:00:00Z",
          paid_at: null,
        },
        error: null,
      })
    );
    const res = await createOrder("l1", "idem-1");
    expect(res.order?.amountMinor).toBe(700); // $7.00 in integer minor units
    expect(res.order?.status).toBe("pending");
    expect(supabaseMock.rpcCalls).toContainEqual({
      name: "create_order",
      args: { p_listing_id: "l1", p_idempotency_key: "idem-1" },
    });
    // No direct table access: orders are created server-side only.
    expect(supabaseMock.chains.has("orders")).toBe(false);
  });

  it("createOrder without an idempotency key sends null (server tolerates)", async () => {
    supabaseMock.chains.set(
      "rpc:create_order",
      makeChain({ data: null, error: null })
    );
    await createOrder("l1");
    expect(supabaseMock.rpcCalls).toContainEqual({
      name: "create_order",
      args: { p_listing_id: "l1", p_idempotency_key: null },
    });
  });

  it("createOrder maps an RPC failure to a friendly message", async () => {
    supabaseMock.rpcFail = true;
    const res = await createOrder("l1");
    expect(res.order).toBeUndefined();
    expect(res.error).toMatch(/couldn't start that order/i);
  });

  it("myOrders is scoped to buyer OR seller (never everyone's orders)", async () => {
    supabaseMock.from("orders").setResult({ data: [], error: null });
    await myOrders("me");
    const calls = callList("orders") ?? [];
    expect(calls).toContainEqual({ method: "or", args: ["buyer_id.eq.me,seller_id.eq.me"] });
  });

  it("myOrders returns [] when the query errors", async () => {
    supabaseMock.from("orders").setResult({ data: null, error: { message: "boom" } });
    await expect(myOrders("me")).resolves.toEqual([]);
  });

  it("myEntitlements is scoped to the grantee only", async () => {
    supabaseMock.from("entitlements").setResult({ data: [], error: null });
    await myEntitlements("me");
    expect(callList("entitlements")).toContainEqual({ method: "eq", args: ["grantee_id", "me"] });
  });

  it("myEntitlements returns [] when the query errors", async () => {
    supabaseMock.from("entitlements").setResult({ data: null, error: { message: "boom" } });
    await expect(myEntitlements("me")).resolves.toEqual([]);
  });
});
