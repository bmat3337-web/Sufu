import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface OwnProfile {
  display_name: string;
  is_business: boolean;
  category: string | null;
  city: string | null;
  suburb: string | null;
  member_since: string;
  verified_phone: boolean;
  verified_email: boolean;
  verified_identity: boolean;
  verified_business: boolean;
}

export interface AuthResult {
  error: string | null;
  /** true when the sign-up flow requires email confirmation before a session exists */
  needsConfirmation?: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: OwnProfile | null;
  /** true until the persisted session has been loaded from storage */
  loading: boolean;
  /** global sign-in sheet state — any component can trigger it */
  authOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  sendMagicLink: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

const PROFILE_COLUMNS =
  "display_name, is_business, category, city, suburb, member_since, " +
  "verified_phone, verified_email, verified_identity, verified_business";

/** Turn raw GoTrue error messages into plain-language copy. */
export function friendlyAuthError(message: string | undefined): string {
  const msg = (message ?? "").toLowerCase();
  if (msg.includes("email not confirmed"))
    return "Confirm your email first — check your inbox, or use the magic link below.";
  if (msg.includes("invalid login credentials"))
    return "That email or password doesn't match. Try again.";
  if (msg.includes("user already registered"))
    return "An account already exists for that email — sign in instead.";
  if (msg.includes("password should be") || msg.includes("at least 8 characters"))
    return "Pick a password with at least 8 characters.";
  if (msg.includes("rate limit") || msg.includes("too many requests"))
    return "A little slower — try again in a minute.";
  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("load failed"))
    return "Couldn't reach the server. Check your connection and try again.";
  return message || "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user: current },
    } = await supabase.auth.getUser();
    if (!current) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", current.id)
      .maybeSingle();
    setProfile((data as OwnProfile | null) ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Keep the signed-in user's own profile row in sync.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setProfile((data as OwnProfile | null) ?? null);
      });
    return () => {
      active = false;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: friendlyAuthError(error.message) };
    return { error: null };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string): Promise<AuthResult> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) return { error: friendlyAuthError(error.message) };
      // With email confirmation enabled, no session exists until the user
      // confirms — surface that instead of a silent success.
      if (!data.session) return { error: null, needsConfirmation: true };
      return { error: null };
    },
    []
  );

  const sendMagicLink = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) return { error: friendlyAuthError(error.message) };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      authOpen,
      openAuth,
      closeAuth,
      signIn,
      signUp,
      sendMagicLink,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading, authOpen, openAuth, closeAuth, signIn, signUp, sendMagicLink, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
