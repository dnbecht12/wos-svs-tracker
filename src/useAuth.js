import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

export function useAuth() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
