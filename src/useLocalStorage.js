import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

// ─── Guest / sync state ───────────────────────────────────────────────────────
// These module-level variables are singletons shared across all consumers.
// App.jsx calls setGuestFlag() and setSyncUserId() when auth resolves.

// _isGuest gates both localStorage reads AND cloud writes for guest users.
export let _isGuest = true;
export function setGuestFlag(isGuest) { _isGuest = isGuest; }

// Module-level user ID and active character ID — set when auth resolves
export let _syncUserId = null;
export let _syncCharId = null;
export function setSyncUserId(id) {
  _syncUserId = id;
  if (id) window.dispatchEvent(new CustomEvent("wos-user-ready", { detail: { id } }));
}
export function setSyncCharId(charId) {
  _syncCharId = charId;
}

// Keys that should NOT sync to cloud (UI preferences only)
export const NO_SYNC_KEYS = new Set([
  "wos-page", "wos-theme", "heroes-sort", "hg-gen-filter",
]);

// Pending write queue — batches rapid updates into a single Supabase write
const _writeTimers = {};
export function scheduleSync(key, value) {
  if (!_syncUserId || !_syncCharId || NO_SYNC_KEYS.has(key)) return;
  const timerKey = `${_syncCharId}:${key}`;
  clearTimeout(_writeTimers[timerKey]);
  _writeTimers[timerKey] = setTimeout(async () => {
    try {
      await supabase.from("user_data").upsert(
        { user_id: _syncUserId, char_id: _syncCharId, key,
          value: JSON.stringify(value), updated_at: new Date().toISOString() },
        { onConflict: "user_id,char_id,key" }
      );
    } catch {}
  }, 800);
}

// ─── useLocalStorage hook ─────────────────────────────────────────────────────
export function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      // _isGuest starts true — skip localStorage until auth resolves.
      // readFromLocal fires after wos-user-ready if the user is logged in.
      if (_isGuest) return initial;
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : initial;
    } catch { return initial; }
  });

  const readFromLocal = useCallback(() => {
    try {
      if (_isGuest) return; // never pull stale localStorage into a guest session
      const s = localStorage.getItem(key);
      if (s) setVal(JSON.parse(s));
    } catch {}
  }, [key]);

  useEffect(() => {
    if (NO_SYNC_KEYS.has(key)) return;
    if (_syncUserId) {
      readFromLocal();
    } else {
      const handler = () => readFromLocal();
      window.addEventListener("wos-user-ready", handler, { once: true });
      return () => window.removeEventListener("wos-user-ready", handler);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(v => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      try {
        const store = _isGuest ? sessionStorage : localStorage;
        store.setItem(key, JSON.stringify(next));
        if (!_isGuest) {
          localStorage.setItem(`${key}__ts`, new Date().toISOString());
        }
      } catch {}
      scheduleSync(key, next);
      return next;
    });
  }, [key]);

  return [val, set];
}
