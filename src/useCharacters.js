import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

// ─── Per-character cloud helpers ──────────────────────────────────────────────

export async function charLoadInventory(characterId) {
  if (!characterId) return null;
  const { data, error } = await supabase
    .from("inventory")
    .select("data")
    .eq("character_id", characterId)
    .maybeSingle();
  if (!error && data) return data.data;
  return null;
}

export async function charSaveInventory(characterId, inv) {
  if (!characterId) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("inventory").upsert(
    { character_id: characterId, data: inv, updated_at: new Date().toISOString() },
    { onConflict: "character_id" }
  );
}

export async function charLoadPlans(characterId) {
  if (!characterId) return {};
  // Try new character_id-based rows
  const { data, error } = await supabase
    .from("saved_plans")
    .select("plan_key, data")
    .eq("character_id", characterId);
  if (!error && data && data.length > 0)
    return Object.fromEntries(data.map(r => [r.plan_key, r.data]));

  // Fallback: old user_id-based rows
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { data: old } = await supabase
    .from("saved_plans")
    .select("plan_key, data")
    .eq("user_id", user.id)
    .is("character_id", null);
  if (old && old.length > 0) {
    const plans = Object.fromEntries(old.map(r => [r.plan_key, r.data]));
    // Migrate: re-save under character_id
    await Promise.all(Object.entries(plans).map(([k, v]) => charSavePlan(characterId, k, v)));
    return plans;
  }
  return {};
}

export async function charSavePlan(characterId, planKey, planData) {
  if (!characterId) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("saved_plans").upsert(
    { character_id: characterId, plan_key: planKey, data: planData, updated_at: new Date().toISOString() },
    { onConflict: "character_id,plan_key" }
  );
}

export async function charDeletePlan(characterId, planKey) {
  if (!characterId) return;
  await supabase.from("saved_plans").delete()
    .eq("character_id", characterId)
    .eq("plan_key", planKey);
}

export async function charLoadBuildings(characterId) {
  if (!characterId) return null;
  const { data, error } = await supabase
    .from("building_selections")
    .select("data")
    .eq("character_id", characterId)
    .single();
  if (error || !data) return null;
  return data.data;
}

export async function charSaveBuildings(characterId, buildings) {
  if (!characterId) return;
  await supabase.from("building_selections").upsert(
    { character_id: characterId, data: buildings, updated_at: new Date().toISOString() },
    { onConflict: "character_id" }
  );
}

// ─── Plan snapshot helpers (stored in characters.plan_snapshot) ───────────────

export async function savePlanSnapshot(characterId, snapshot) {
  if (!characterId) return;
  const { error } = await supabase
    .from("characters")
    .update({ plan_snapshot: snapshot })
    .eq("id", characterId);
  if (error) console.error("[savePlanSnapshot]", error.message);
}

export async function loadPlanSnapshot(characterId) {
  if (!characterId) return null;
  const { data, error } = await supabase
    .from("characters")
    .select("plan_snapshot")
    .eq("id", characterId)
    .single();
  if (error || !data) return null;
  return data.plan_snapshot || null;
}

// ─── Character management helpers ─────────────────────────────────────────────

export async function fetchCharacters(userId) {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function createCharacter(userId, name, stateNumber) {
  const { data, error } = await supabase
    .from("characters")
    .insert({ user_id: userId, name, state_number: stateNumber || null, is_default: false })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCharacter(characterId, updates) {
  const { error } = await supabase
    .from("characters")
    .update(updates)
    .eq("id", characterId);
  if (error) throw new Error(error.message);
}

export async function deleteCharacter(characterId) {
  const { error } = await supabase
    .from("characters")
    .delete()
    .eq("id", characterId);
  if (error) throw new Error(error.message);
}

export async function setDefaultCharacter(userId, characterId) {
  // Clear all defaults for user, then set the chosen one
  await supabase.from("characters").update({ is_default: false }).eq("user_id", userId);
  await supabase.from("characters").update({ is_default: true }).eq("id", characterId);
}

// ─── useCharacters hook ────────────────────────────────────────────────────────

export function useCharacters(user) {
  const [characters,       setCharacters]       = useState([]);
  const [activeCharId,     setActiveCharId]     = useState(null);
  const [loadingChars,     setLoadingChars]     = useState(false);
  const [charError,        setCharError]        = useState("");

  // Load characters whenever user changes — auto-create one if account has none
  useEffect(() => {
    if (!user) { setCharacters([]); setActiveCharId(null); return; }
    setLoadingChars(true);
    fetchCharacters(user.id).then(async chars => {
      if (chars.length === 0) {
        // First-time user or pre-character account — create a default character
        try {
          const newChar = await createCharacter(user.id, "Main", null);
          await supabase.from("characters")
            .update({ is_default: true })
            .eq("id", newChar.id);
          newChar.is_default = true;
          setCharacters([newChar]);
          setActiveCharId(newChar.id);
        } catch {
          setCharacters([]);
        }
      } else {
        setCharacters(chars);
        const def = chars.find(c => c.is_default) || chars[0];
        if (def) setActiveCharId(def.id);
      }
      setLoadingChars(false);
    }).catch(() => {
      setCharacters([]);
      setLoadingChars(false);
    });
  }, [user]);

  const activeCharacter = characters.find(c => c.id === activeCharId) || null;

  const switchCharacter = useCallback((charId) => {
    setActiveCharId(charId);
  }, []);

  const addCharacter = useCallback(async (name, stateNumber) => {
    if (!user) return null;
    setCharError("");
    try {
      if (characters.length >= 5) throw new Error("Maximum of 5 characters per account.");
      const newChar = await createCharacter(user.id, name, stateNumber);
      setCharacters(prev => [...prev, newChar]);
      return newChar;
    } catch (e) {
      setCharError(e.message);
      return null;
    }
  }, [user, characters]);

  const removeCharacter = useCallback(async (charId) => {
    setCharError("");
    try {
      await deleteCharacter(charId);
      setCharacters(prev => prev.filter(c => c.id !== charId));
      // If we deleted the active character, switch to first remaining
      if (activeCharId === charId) {
        const remaining = characters.filter(c => c.id !== charId);
        setActiveCharId(remaining[0]?.id || null);
      }
    } catch (e) {
      setCharError(e.message);
    }
  }, [activeCharId, characters]);

  const renameCharacter = useCallback(async (charId, name, stateNumber) => {
    setCharError("");
    try {
      await updateCharacter(charId, { name, state_number: stateNumber || null });
      setCharacters(prev => prev.map(c =>
        c.id === charId ? { ...c, name, state_number: stateNumber || null } : c
      ));
    } catch (e) {
      setCharError(e.message);
    }
  }, []);

  const makeDefault = useCallback(async (charId) => {
    if (!user) return;
    await setDefaultCharacter(user.id, charId);
    setCharacters(prev => prev.map(c => ({ ...c, is_default: c.id === charId })));
  }, [user]);

  const clearCharError = useCallback(() => setCharError(""), []);

  return {
    characters, activeCharacter, activeCharId,
    loadingChars, charError, clearCharError,
    switchCharacter, addCharacter, removeCharacter, renameCharacter, makeDefault,
  };
}
