/* LIVE TWO-USER SECURITY + COMMERCE SAFETY — SUFU beta gate (API/RPC level).
 * Executed against the LIVE Supabase project (zrbeofmdyaxkcpsyqiqy) using the
 * public anon key + real password sessions — exactly what the deployed browser
 * would be able to do. No service-role credential anywhere in this file.
 *   node live-api-security.mjs
 *
 * Re-run hygiene (important): each run creates ONE probe order (buyer=A buys B's
 * listing, idempotency_key `gate-probe-*`) and the authenticated role has NO
 * DELETE grant (by design — the RLS/grant surface stays closed), so the script
 * cannot remove it itself. Every run therefore grows `orders` by 1. Clean up with
 * the printed CLEANUP_SQL (or any postgres/service-role session):
 *   DELETE FROM orders WHERE idempotency_key LIKE 'gate-probe-%';
 * check r5 asserts the real invariant ("A never sees an order A is not a party
 * to"), so re-runs pass 25/25 regardless of leftover probe rows.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || "https://zrbeofmdyaxkcpsyqiqy.supabase.co";
const ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYmVvZm1keWF4a2Nwc3lxaXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMjEyMzQsImV4cCI6MjEwMzU5NzIzNH0.y3iXHTmL2KstCDDlcJD-8M1CkbbnnW2BYWZLLY2lVmk";

const A = { email: "uismoke-buyer@sufu.co.zw", pass: "SufuTest123!", label: "A (buyer)" };
const B = { email: "uismoke-seller@sufu.co.zw", pass: "SufuTest123!", label: "B (seller)" };

// Listing owned by B (Gaming chair) + job listing owned by B
const B_LISTING = "a6b16298-7874-4931-a1c7-fb7fd9fae389";
const B_JOB = "8710837b-e643-400c-9e8d-b8b5d5293eb2";
// Conversation A↔B (both participants) and a foreign conversation A is NOT in
const CONV_AB = "fbbf979f-67db-49a8-ab88-1cdd6de294d7";
const CONV_FOREIGN = "773b3fb1-6f7a-ee28-46aa-03b570e1b356";

const results = [];
const check = (name, ok, detail = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);

async function main() {
  const anon = createClient(URL, ANON);
  const userA = createClient(URL, ANON);
  const userB = createClient(URL, ANON);

  const sa = await userA.auth.signInWithPassword({ email: A.email, password: A.pass });
  const sb = await userB.auth.signInWithPassword({ email: B.email, password: B.pass });
  if (sa.error || sb.error) {
    console.error("FAIL to establish sessions:", sa.error?.message, sb.error?.message);
    process.exit(2);
  }
  const aId = sa.data.user.id;
  const bId = sb.data.user.id;
  check("User A + B sessions established against live project", true);

  // ============ READ MATRIX — cross-user reads must return 0 rows ============
  const q = async (c, table, extra = "", opts = {}) => {
    let qb = c.from(table).select(opts.select || "*");
    if (extra) qb = qb.or(extra);
    const { data, error } = await qb;
    return { rows: Array.isArray(data) ? data.length : 0, data, error };
  };

  // Foreign conversation read as A (A is not a participant)
  const r1 = await q(userA, "conversations", `id.eq.${CONV_FOREIGN}`);
  check("A cannot read foreign conversation", r1.rows === 0, r1.error ? r1.error.message : `${r1.rows} rows`);
  const r2 = await q(userA, "messages", `conversation_id.eq.${CONV_FOREIGN}`);
  check("A cannot read foreign messages", r2.rows === 0, r2.error ? r2.error.message : `${r2.rows} rows`);

  // A reads B's saved listings / applications / orders / entitlements
  const r3 = await q(userA, "saved_listings", `profile_id.eq.${bId}`);
  check("A cannot read B's saved listings", r3.rows === 0, r3.error ? r3.error.message : `${r3.rows} rows`);
  const r4 = await q(userA, "applications", `applicant_id.eq.${bId}`);
  check("A cannot read B's job applications", r4.rows === 0, r4.error ? r4.error.message : `${r4.rows} rows`);
  // Real invariant for orders: A must never see an order A is NOT a party to.
  // A IS the buyer on this suite's own probe orders (A buys B's listing via
  // create_order below) and orders SELECT-own = `buyer_id = auth.uid() OR
  // seller_id = auth.uid()` (both transaction parties may read, by design) — so
  // the previous `seller_id = B` probe counted the suite's own leftovers and
  // false-alarmed on re-runs. Assert instead: B's orders that A is NOT a party
  // to are invisible to A (0 rows).
  const r5 = await userA.from("orders").select("id").eq("seller_id", bId).neq("buyer_id", aId);
  check("A cannot read B's orders (A never a party)", r5.error ? false : (Array.isArray(r5.data) ? r5.data.length === 0 : false),
    r5.error ? r5.error.message : `${Array.isArray(r5.data) ? r5.data.length : 0} rows`);
  const r6 = await q(userA, "entitlements", `grantee_id.eq.${bId}`);
  check("A cannot read B's entitlements", r6.rows === 0, r6.error ? r6.error.message : `${r6.rows} rows`);

  // Own data still visible (A sees own saved listing)
  const r7 = await q(userA, "saved_listings", `profile_id.eq.${aId}`);
  check("A still sees own saved listings (no over-lock)", r7.rows > 0, `${r7.rows} row(s)`);

  // ============ WRITE MATRIX — foreign writes must hit 0 rows or be denied ============
  const w1 = await userA.from("listings").update({ title: "HACKED" }).eq("id", B_LISTING).select();
  check("A cannot UPDATE B's listing", w1.error ? false : w1.data.length === 0, w1.error?.message || `${w1.data.length} rows`);
  const w2 = await userA.from("profiles").update({ display_name: "HACKED" }).eq("id", bId).select();
  check("A cannot UPDATE B's profile", w2.error ? false : w2.data.length === 0, w2.error?.message || `${w2.data.length} rows`);
  const w3 = await userA.from("profiles").update({ verified_email: true }).eq("id", bId).select();
  check("A cannot self-grant verification on B (column grant)", !!w3.error, w3.error?.message || "unexpectedly allowed");
  const w4 = await userA.from("saved_listings").delete().eq("profile_id", bId).select();
  check("A cannot DELETE B's saved listings", w4.error ? false : w4.data.length === 0, w4.error?.message || `${w4.data.length} rows`);
  const w5 = await userA.from("messages").update({ read_at: new Date().toISOString() }).eq("conversation_id", CONV_AB).select();
  check("A cannot UPDATE messages in own thread (RLS blocks cross-party)", w5.error ? false : w5.data.length === 0, w5.error?.message || `${w5.data.length} rows`);
  const w6 = await userA.from("orders").update({ status: "paid" }).eq("id", "00000000-0000-0000-0000-000000000000").select();
  check("A cannot UPDATE orders (permission denied — no UPDATE grant)", !!w6.error, w6.error?.message || "unexpectedly allowed");
  const w7 = await userA.from("payments").select("id").limit(1);
  check("A cannot SELECT payments (no grants)", !!w7.error, w7.error?.message || "unexpectedly readable");

  // ============ SPOOFED INSERTS ============
  const i1 = await userA.from("conversations").insert({ user_a: bId, user_b: aId, listing_id: B_LISTING }).select();
  check("A cannot spoof-insert a conversation on behalf of B", !!i1.error, i1.error?.message || "unexpectedly allowed");
  const i2 = await userA.from("applications").insert({ listing_id: B_JOB, applicant_id: bId }).select();
  check("A cannot spoof-insert an application on behalf of B", !!i2.error, i2.error?.message || "unexpectedly allowed");
  const i3 = await anon.from("listings").insert({ title: "ANON HACK", description: "x", category_id: null, city_id: null, price: 1 }).select();
  check("anon cannot INSERT listings", !!i3.error, i3.error?.message || "unexpectedly allowed");
  const i4 = await userA.from("orders").insert({ listing_id: B_LISTING, buyer_id: aId, seller_id: bId, amount_minor: 1, status: "pending" }).select();
  check("A cannot INSERT orders directly (no INSERT grant)", !!i4.error, i4.error?.message || "unexpectedly allowed");
  const i5 = await userA.rpc("record_payment_event", { p_provider: "stripe", p_provider_event_id: "evt_test", p_amount_minor: 100 }).select();
  check("A cannot EXECUTE record_payment_event (service-role only)", !!i5.error, i5.error?.message || "unexpectedly allowed");

  // ============ COMMERCE: order creation is foundation-only, server-derived ============
  const idemKey = `gate-probe-${Date.now()}`;
  const co = await userA.rpc("create_order", { p_listing_id: B_LISTING, p_idempotency_key: idemKey });
  if (co.error) {
    check("create_order RPC executes (foundation)", false, co.error.message);
  } else {
    const order = co.data;
    const feeOk = Number(order.platform_fee_minor) === Math.round(Number(order.amount_minor) * 0.05);
    check("create_order derives amount+fee server-side (5% platform fee)", feeOk && order.status === "pending",
      `amount_minor=${order.amount_minor} fee=${order.platform_fee_minor} status=${order.status}`);
    // Buyer sees own order; third party (anon) sees none
    const oSelf = await q(userA, "orders", `id.eq.${order.id}`);
    const oAnon = await q(anon, "orders", `id.eq.${order.id}`);
    check("buyer sees own order; anon sees 0", oSelf.rows === 1 && oAnon.rows === 0, `A=${oSelf.rows} anon=${oAnon.rows}`);
    // Duplicate idempotency key must be rejected (unique constraint)
    const dup = await userA.rpc("create_order", { p_listing_id: B_LISTING, p_idempotency_key: idemKey });
    check("duplicate idempotency key rejected (DB-unique)", !!dup.error, dup.error?.message || "unexpectedly allowed");
    console.log(`CLEANUP_ORDER_ID=${order.id}`);
    console.log(`CLEANUP_SQL=DELETE FROM orders WHERE idempotency_key = '${idemKey}';`);
  }

  // ============ OBSERVABILITY / perimeter ============
  const rest = await fetch(`${URL}/rest/v1/`);
  check("REST gateway blocks keyless access (401)", rest.status === 401, `HTTP ${rest.status}`);
  const ef = await fetch(`${URL}/functions/v1/verify-badge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ action: "verify_email" }),
  });
  check("verify-badge EF rejects unauthenticated call (401)", ef.status === 401, `HTTP ${ef.status}`);

  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL"));
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("API SECURITY ERROR:", e);
  process.exit(2);
});
