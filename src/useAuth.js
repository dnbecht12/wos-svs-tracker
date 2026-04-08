import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

// ─── Cloud sync helpers ───────────────────────────────────────────────────────

export async function cloudLoadInventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("data")
    .single();
  if (error || !data) return null;
  return data.data;
}

export async function cloudSaveInventory(inv) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("inventory")
    .upsert({ id: user.id, data: inv, updated_at: new Date().toISOString() });
}

export async function cloudLoadPlans() {
  const { data, error } = await supabase
    .from("saved_plans")
    .select("plan_key, data");
  if (error || !data) return {};
  return Object.fromEntries(data.map(r => [r.plan_key, r.data]));
}

export async function cloudSavePlan(planKey, planData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("saved_plans")
    .upsert(
      { user_id: user.id, plan_key: planKey, data: planData, updated_at: new Date().toISOString() },
      { onConflict: "user_id,plan_key" }
    );
}

export async function cloudDeletePlan(planKey) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("saved_plans")
    .delete()
    .eq("user_id", user.id)
    .eq("plan_key", planKey);
}

export async function cloudLoadBuildings() {
  const { data, error } = await supabase
    .from("building_selections")
    .select("data")
    .single();
  if (error || !data) return null;
  return data.data;
}

export async function cloudSaveBuildings(buildings) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("building_selections")
    .upsert({ id: user.id, data: buildings, updated_at: new Date().toISOString() });
}

// ─── useAuth hook ─────────────────────────────────────────────────────────────

export function useAuth() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
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
    // Create profile row
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        display_name: displayName,
      });
    }
    return true;
  }, []);

  const signIn = useCallback(async (email, password) => {
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); return false; }
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const clearError = useCallback(() => setError(""), []);

  return { user, loading, error, signUp, signIn, signOut, clearError };
}