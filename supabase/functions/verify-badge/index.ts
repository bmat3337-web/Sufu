// verify-badge — server-side trust-badge grants for SUFU.
//
// Invoked from the browser with the user's session JWT
// (supabase.functions.invoke). The JWT is verified in code; the legacy
// platform verify_jwt check is disabled at deploy time (compatibility with
// the latest Supabase SDK). CORS preflight is handled so the browser can
// call this function directly.
//
// Actions:
//   verify_email       — grants verified_email when auth.email_confirmed_at
//                        is set. Only the auth system can set
//                        email_confirmed_at, so a user cannot forge this
//                        badge.
//   verify_identity    — manual-approval placeholder; only profiles.is_admin
//   verify_business      callers may grant these (to any user).
//   verify_phone       — explicitly out of scope until an SMS provider is
//                        wired up (phase 2).

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) {
    return json({ ok: false, error: "server_not_configured" }, 500);
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- authenticate the caller (JWT verified against the auth server) ---
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ ok: false, error: "unauthorized" }, 401);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return json({ ok: false, error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "verify_email") {
    // Only the auth system sets email_confirmed_at — a confirmed email is
    // proof the address belongs to the caller. profiles.verified_email is
    // not grantable to clients (column grants), so this is the only path.
    const {
      data: { user: full },
    } = await supabase.auth.admin.getUserById(user.id);
    if (!full?.email_confirmed_at) {
      return json({ ok: false, error: "email_not_confirmed" }, 400);
    }
    const { error } = await supabase
      .from("profiles")
      .update({ verified_email: true })
      .eq("id", user.id);
    if (error) return json({ ok: false, error: "update_failed" }, 500);
    return json({ ok: true, badge: "verified_email" });
  }

  if (action === "verify_identity" || action === "verify_business") {
    // Manual-approval placeholder: only admins may grant these, to any user.
    const { data: caller } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!caller?.is_admin) return json({ ok: false, error: "forbidden" }, 403);

    const targetId = typeof body.user_id === "string" ? body.user_id : "";
    if (!targetId) return json({ ok: false, error: "missing_user_id" }, 400);

    const patch =
      action === "verify_identity"
        ? { verified_identity: true }
        : { verified_business: true };
    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", targetId);
    if (error) return json({ ok: false, error: "update_failed" }, 500);
    return json({
      ok: true,
      badge: action === "verify_identity" ? "verified_identity" : "verified_business",
    });
  }

  if (action === "verify_phone") {
    // Phase 2: needs an SMS provider secret (e.g. Twilio). Out of scope here.
    return json({ ok: false, error: "phone_verification_unavailable" }, 400);
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});
