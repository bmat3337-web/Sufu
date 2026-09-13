import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for the web app.
 *
 * Uses the publishable anon key only — safe to ship to the browser. The
 * service_role key never touches client code (it lives in Supabase Secret
 * Manager and is read only inside Edge Functions).
 *
 * RLS is the single source of truth: anonymous visitors read published
 * public data; signed-in users create + own their writes.
 *
 * ---- Missing-config resilience ----
 * When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are absent (e.g. a local
 * sandbox without Environment settings), the module MUST NOT throw — a
 * module-scope throw prevents React from mounting and blanks the whole app.
 * Instead we export `isSupabaseConfigured = false` and a degraded facade that
 * fails closed: every data call resolves to `{ data: null, error }` so the
 * API layer returns its empty/error paths, and every auth call behaves like a
 * signed-out client. The UI therefore renders fully (with empty states) and
 * backend-dependent actions surface an honest error message.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Shown by the header banner and by failed backend actions in preview mode. */
export const MISSING_CONFIG_MESSAGE =
  "SUFU's live data isn't connected in this preview — you can still explore the app.";

/* ------------------------- degraded (no-backend) mode ------------------------- */

/**
 * A query-builder chain that keeps every `.from().select().eq()…` call alive
 * but resolves to a fail-closed result: destructuring `{ data, error }` from
 * the awaited chain yields `data: null` and a truthy `error`, so every api.ts
 * function takes its empty/error branch without touching the network.
 */
function makeDegradedChain(): Record<string, unknown> {
  const chain = new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      // `await chain` → resolves to the proxy itself (not a thenable)…
      if (prop === "then") return undefined;
      // …and destructuring then reads these real values.
      if (prop === "data") return null;
      if (prop === "error") return { message: MISSING_CONFIG_MESSAGE };
      // Any query-builder method (select/eq/order/insert/rpc/…) keeps chaining.
      return () => chain;
    },
  });
  return chain;
}

/** Signed-out-safe auth facade so AuthProvider renders as logged out. */
const degradedAuth = {
  getUser: async () => ({ data: { user: null }, error: null }),
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({
    data: { subscription: { unsubscribe: () => {} } },
  }),
  signInWithPassword: async () => ({
    data: { user: null },
    error: { message: MISSING_CONFIG_MESSAGE },
  }),
  signUp: async () => ({
    data: { user: null, session: null },
    error: { message: MISSING_CONFIG_MESSAGE },
  }),
  signInWithOtp: async () => ({
    data: {},
    error: { message: MISSING_CONFIG_MESSAGE },
  }),
  signOut: async () => {},
};

const degradedClient = {
  from: () => makeDegradedChain(),
  rpc: () => makeDegradedChain(),
  auth: degradedAuth,
} as unknown as SupabaseClient;

/* ------------------------------ client export ------------------------------ */

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Implicit flow keeps email/magic-link sign-ins working inside
        // ephemeral preview URLs.
        flowType: "implicit",
      },
    })
  : degradedClient;
