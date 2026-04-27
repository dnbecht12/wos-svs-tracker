import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

export function useAuth() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    // Validate the session — if token is expired/invalid, sign out cleanly
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionErr }) => {
      if (sessionErr || !session) {
        // No valid session — clear any stale auth state and show login
        await supabase.auth.signOut().catch(() => {});
        setUser(null);
        setLoading(false);
        return;
      }
      // Session exists — verify it's actually valid with Supabase
      const { data: { user: verifiedUser }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !verifiedUser) {
        // Token is stale/rejected (403) — sign out so user sees login screen
        await supabase.auth.signOut().catch(() => {});
        setUser(null);
      } else {
        setUser(verifiedUser);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // TOKEN_REFRESHED fires every ~55min or on tab focus — the user object is
      // technically new but the ID is identical. Calling setUser() with a new
      // reference would re-trigger the login useEffect in App.jsx and overwrite
      // the active character's data with the default character's data.
      // Only update user state on actual sign-in / sign-out events.
      if (event === "TOKEN_REFRESHED") return;
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email, password, displayName) => {
    setError("");
    const { data, error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } },
    });
    if (err) { setError(err.message); return false; }
    if (data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, display_name: displayName });
    }
    return true;
  }, []);

  const signIn = useCallback(async (email, password) => {
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); return false; }
    return true;
  }, []);

  const signInWithDiscord = useCallback(async () => {
    setError("");
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: window.location.origin },
    });
    if (err) setError(err.message);
  }, []);

  const signOut = useCallback(async () => {
    const USER_DATA_KEYS = [
      "wa-levels","wa-speedbuff","wa-buffs","wa-dailyshards",
      "rc-levels","rc-collapse","cp-speedbuff","cp-vip-level","cp-purchased-queue",
      "experts-data","cg-slots","cc-slots","troops-inventory-v2",
      "daybreak-buffs","daybreak-prosperity","hg-heroes","hg-hero-stats","hg-teams","pets-data",
      "cp-buildings","cp-buffs","cp-cycle","cp-dailyfc","cp-agnes","cp-nonfc-active",
      "wos-svs-inventory","wos-rfc-saved-plans","rfc-cycle","rfc-monref","rfc-wdmode","rfc-actuals2","rfc-est-event","heroes-roster-added","pets-gen-filter",
      "rfc-cycle","rfc-monref","rfc-wdmode","rfc-actuals2",
    ];
    USER_DATA_KEYS.forEach(k => {
      try { localStorage.removeItem(k); localStorage.removeItem(`${k}__ts`); } catch {}
    });
    await supabase.auth.signOut();
  }, []);

  const changePassword = useCallback(async () => {
    setError("");
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u?.email) { setError("No email address on this account."); return false; }
    const { error: err } = await supabase.auth.resetPasswordForEmail(u.email, {
      redirectTo: `${window.location.origin}?reset=1`,
    });
    if (err) { setError(err.message); return false; }
    return true;
  }, []);

  const requestDeleteAccount = useCallback(async () => {
    setError("");
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u?.email) { setError("No email address on this account."); return false; }
    const { error: err } = await supabase.auth.signInWithOtp({
      email: u.email,
      options: { shouldCreateUser: false },
    });
    if (err) { setError(err.message); return false; }
    return true;
  }, []);

  const confirmDeleteAccount = useCallback(async (otp, email) => {
    setError("");
    const { error: otpErr } = await supabase.auth.verifyOtp({
      email, token: otp, type: "email",
    });
    if (otpErr) { setError("Invalid or expired code. Please try again."); return false; }
    const { error: delErr } = await supabase.rpc("delete_user_account");
    if (delErr) { setError(delErr.message); return false; }
    await supabase.auth.signOut();
    return true;
  }, []);

  const clearError = useCallback(() => setError(""), []);

  return {
    user, loading, error,
    signUp, signIn, signInWithDiscord, signOut,
    changePassword, requestDeleteAccount, confirmDeleteAccount,
    clearError,
  };
}
