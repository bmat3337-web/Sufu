/* ------------------------------------------------------------------ *
 * SUFU auth error-mapping tests — raw GoTrue errors must never reach  *
 * the user; every failure mode has plain-language copy.               *
 * ------------------------------------------------------------------ */

import { describe, expect, it, vi } from "vitest";
import { friendlyAuthError } from "../auth";

// auth.tsx imports ./supabase, which throws at module load unless env vars are
// set — irrelevant to these pure-mapping tests, so stub it.
vi.mock("../supabase", () => ({ supabase: {} }));

describe("friendlyAuthError", () => {
  it("explains email confirmation is pending", () => {
    expect(friendlyAuthError("Email not confirmed")).toContain("Confirm your email");
  });

  it("explains invalid credentials without echoing them", () => {
    const msg = friendlyAuthError("Invalid login credentials");
    expect(msg).toContain("doesn't match");
    expect(msg).not.toContain("credentials");
  });

  it("tells an existing account holder to sign in", () => {
    expect(friendlyAuthError("User already registered")).toContain("sign in");
  });

  it("gives a concrete password requirement", () => {
    expect(friendlyAuthError("Password should be at least 8 characters")).toContain(
      "at least 8 characters"
    );
  });

  it("softens rate-limit errors", () => {
    expect(friendlyAuthError("Too many requests. Try again later.")).toContain("a minute");
  });

  it("covers network failures", () => {
    expect(friendlyAuthError("Failed to fetch")).toContain("Couldn't reach the server");
  });

  it("passes through unknown messages verbatim", () => {
    expect(friendlyAuthError("Something unusual")).toBe("Something unusual");
  });

  it("falls back to a generic message when none is given", () => {
    expect(friendlyAuthError(undefined)).toBe("Something went wrong. Please try again.");
  });
});
