import React, { useState, useEffect, useCallback, useRef, useMemo, Component } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./supabase.js";
import ResearchCenterPage, { getRCTechPower, getRCDeployRally } from "./ResearchCenter.jsx";

const ADMIN_UID = "c5c3392e-2399-4cc9-b2ab-f22a61e7b91c";

// ── Stat submission helpers ───────────────────────────────────────────────────
async function submitHeroStats(payload) {
  const { error } = await supabase.from("stat_submissions").insert({
    ...payload,
    status: "pending",
    submitted_at: new Date().toISOString(),
  });
  return !error;
}
async function fetchSubmissions() {
  const { data, error } = await supabase
    .from("stat_submissions")
    .select("*")
    .order("submitted_at", { ascending: false });
  return error ? [] : data;
}
async function updateSubmission(id, updates) {
  // Try with reviewed_at first; if that column doesn't exist, retry without it
  let { error } = await supabase
    .from("stat_submissions")
    .update({ ...updates, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error && error.message?.includes("reviewed_at")) {
    const result = await supabase
      .from("stat_submissions")
      .update(updates)
      .eq("id", id);
    error = result.error;
  }
  if (error) console.error("updateSubmission error:", JSON.stringify(error));
  return !error;
}

// ── Issue reporting helpers ───────────────────────────────────────────────────
async function submitIssue(payload) {
  const { error } = await supabase.from("issue_reports").insert({
    ...payload,
    status: "submitted",
    submitted_at: new Date().toISOString(),
  });
  return !error;
}
async function fetchIssues() {
  const { data, error } = await supabase
    .from("issue_reports")
    .select("*")
    .order("submitted_at", { ascending: false });
  return error ? [] : data;
}
async function updateIssue(id, updates) {
  const { error } = await supabase
    .from("issue_reports")
    .update(updates)
    .eq("id", id);
  return !error;
}
async function closeIssue(id, adminNote) {
  const { error } = await supabase
    .from("issue_reports")
    .update({ status: "closed", admin_note: adminNote, closed_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}
async function fetchNotifications(userId) {
  const { data, error } = await supabase
    .from("issue_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return error ? [] : data;
}
async function markNotificationRead(id) {
  const { error } = await supabase
    .from("issue_notifications")
    .update({ read: true })
    .eq("id", id);
  return !error;
}


// SR/R heroes cannot have widgets — always store/query widget as null for them
function isSSRHero(heroName) {
  const h = HERO_ROSTER.find(h => h.name === heroName);
  return h ? h.quality === "SSR" : true; // default to SSR if unknown
}
function heroWidget(heroName, widgetVal) {
  return isSSRHero(heroName) ? (widgetVal ?? 0) : null;
}

async function getHeroStatsFromDB(heroName, level, stars, widget) {
  const w = heroWidget(heroName, widget);
  const q = supabase.from("hero_stats_data")
    .select("*")
    .eq("hero_name", heroName)
    .eq("level", level)
    .eq("stars", stars)
    .eq("is_current", true);
  if (w === null) q.is("widget", null);
  else q.eq("widget", w);
  const { data } = await q.maybeSingle();
  return data || null;
}

async function acceptSubmission(submission, forceAccept = false) {
  const now = new Date().toISOString();
  const w = heroWidget(submission.hero_name, submission.widget);

  const existing = await getHeroStatsFromDB(
    submission.hero_name, submission.level, submission.stars, submission.widget
  );

  if (existing && !forceAccept) {
    const subStats = submission.stats || {};
    const exStats  = existing.stats || {};
    const diffs = Object.keys(subStats).filter(k =>
      subStats[k] != null && exStats[k] != null &&
      Math.abs(Number(subStats[k]) - Number(exStats[k])) > 0.0001
    );
    if (diffs.length > 0) return { needsValidation: true, existing, diffs };
  }

  const newRowData = {
    hero_name:   submission.hero_name,
    stars:       submission.stars,
    level:       submission.level,
    widget:      w,
    stats:       submission.stats,
    accepted_at: now,
    accepted_by: ADMIN_UID,
    is_current:  true,
  };

  if (existing) {
    const { data: newRow, error: insertErr } = await supabase.from("hero_stats_data")
      .insert(newRowData).select().single();
    if (newRow) {
      await supabase.from("hero_stats_data")
        .update({ is_current: false, superseded_at: now, superseded_by: newRow.id })
        .eq("id", existing.id);
    }
  } else {
    await supabase.from("hero_stats_data").insert(newRowData);
  }

  await updateSubmission(submission.id, { status: "accepted" });
  return { needsValidation: false };
}
import ConstructionPlanner, { getBuildingPower, BUILDINGS_LIST } from "./ConstructionPlanner.jsx";
import RFCPlanner from "./RFCPlanner.jsx";
import SvSCalendar from "./SvSCalendar.jsx";
import { useAuth } from "./useAuth.js";
import { useCharacters, charLoadInventory, charSaveInventory, charLoadPlans, charSavePlan, charDeletePlan, savePlanSnapshot, loadPlanSnapshot } from "./useCharacters.js";
import { GEAR_DB, EMPOWERMENT, GEAR_TYPE, HERO_GEAR_SET, SLOT_TO_GEAR, getGearStats, getUnlockedEmpowerments } from "./GearData.js";

// ─── Theme & Design System ────────────────────────────────────────────────────
// ─── Theme System ─────────────────────────────────────────────────────────────

const THEMES = {
  dark: {
    bg:        "#0a0c10",
    surface:   "#111418",
    card:      "#161b22",
    border:    "#21262d",
    borderHi:  "#30363d",
    accent:    "#4A9EBF",
    accentDim: "#1E5A7A",
    accentBg:  "#071620",
    blue:      "#388bfd",
    blueDim:   "#1f4b8c",
    blueBg:    "#0c1929",
    green:     "#3fb950",
    greenDim:  "#1a5c26",
    greenBg:   "#0a1f0e",
    red:       "#f85149",
    redDim:    "#7d1f1a",
    redBg:     "#1f0c0b",
    amber:     "#d29922",
    amberBg:   "#1a1408",
    textPri:   "#e6edf3",
    textSec:   "#b1bac4",
    textDim:   "#768390",
    hover:     "rgba(255,255,255,0.04)",
    btnText:   "#0a0c10",
  },
  light: {
    bg:        "#f4f5f7",
    surface:   "#ffffff",
    card:      "#ffffff",
    border:    "#d0d7de",
    borderHi:  "#afb8c1",
    accent:    "#1E7FA8",
    accentDim: "#4A9EBF",
    accentBg:  "#E6F4FA",
    blue:      "#0969da",
    blueDim:   "#54aeff",
    blueBg:    "#ddf4ff",
    green:     "#1a7f37",
    greenDim:  "#2da44e",
    greenBg:   "#dafbe1",
    red:       "#cf222e",
    redDim:    "#ff8182",
    redBg:     "#ffebe9",
    amber:     "#9a6700",
    amberBg:   "#fff8c5",
    textPri:   "#1f2328",
    textSec:   "#57606a",
    textDim:   "#8c959f",
    hover:     "rgba(0,0,0,0.04)",
    btnText:   "#ffffff",
  },
};

// Detect system preference
function getSystemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

// Apply theme by setting CSS variables on :root
function applyTheme(theme) {
  const colors = THEMES[theme] || THEMES.dark;
  const root = document.documentElement;
  Object.entries(colors).forEach(([k, v]) => root.style.setProperty(`--c-${k}`, v));
  root.setAttribute("data-theme", theme);
}

// COLORS proxy — always reads the current CSS variable values at render time
// Used for inline styles throughout the app
const COLORS = new Proxy({}, {
  get(_, key) {
    return `var(--c-${key})`;
  }
});

const css = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (vals[i] ?? ""), "");

// ─── Local Storage Hook ───────────────────────────────────────────────────────
// _isGuest gates cloud WRITES only — reads always come from localStorage.
// We cannot reliably detect guest status synchronously on a fresh device because
// the Supabase session token may not exist in localStorage until auth resolves.
let _isGuest = true; // assume guest until auth resolves
function setGuestFlag(isGuest) { _isGuest = isGuest; }

// Module-level user ID — set when auth resolves
let _syncUserId = null;
function setSyncUserId(id) {
  _syncUserId = id;
  // Broadcast to all mounted useLocalStorage hooks so they re-fetch from Supabase
  if (id) window.dispatchEvent(new CustomEvent("wos-user-ready", { detail: { id } }));
}

// Keys that should NOT sync to cloud (UI preferences only)
const NO_SYNC_KEYS = new Set([
  "wos-page", "wos-theme", "heroes-sort", "hg-gen-filter",
]);

// Pending write queue — batches rapid updates into a single Supabase write
const _writeTimers = {};
function scheduleSync(key, value) {
  if (!_syncUserId || NO_SYNC_KEYS.has(key)) return; // only sync when logged in
  clearTimeout(_writeTimers[key]);
  _writeTimers[key] = setTimeout(async () => {
    try {
      await supabase.from("user_data").upsert(
        { user_id: _syncUserId, key, value: JSON.stringify(value),
          updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" }
      );
    } catch {}
  }, 800);
}

function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : initial;
    } catch { return initial; }
  });

  // Re-read from localStorage (which bulk sync already populated) and update state
  const readFromLocal = useCallback(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) setVal(JSON.parse(s));
    } catch {}
  }, [key]);

  // On mount: if auth already resolved re-read local (bulk sync already ran),
  // otherwise wait for wos-user-ready which fires after bulk sync completes
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

// ─── Theme Hook ───────────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setThemeRaw] = useState(() => {
    try {
      const saved = localStorage.getItem("wos-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return getSystemTheme();
  });

  // Apply on mount and whenever theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Also listen for system preference changes (when set to "auto")
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      const saved = localStorage.getItem("wos-theme");
      if (!saved) setThemeRaw(getSystemTheme());
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setTheme = (t) => {
    try { localStorage.setItem("wos-theme", t); } catch {}
    setThemeRaw(t);
  };

  const resetToSystem = () => {
    try { localStorage.removeItem("wos-theme"); } catch {}
    setThemeRaw(getSystemTheme());
  };

  return { theme, setTheme, resetToSystem };
}
const INITIAL_INVENTORY = {
  fireCrystals:    0,
  refinedFC:       0,
  // Raw materials (stored as raw numbers, displayed as M/B)
  meat:            0, meatUnit: "M",
  wood:            0, woodUnit: "M",
  coal:            0, coalUnit: "M",
  iron:            0, ironUnit: "M",
  // Hero gear
  mithril:         0,
  stones:          0,
  mythicGear:      0,
  mythicGenShards: 0,
  // Research (War Academy)
  shards:          0,
  steel:           0, steelUnit: "M",
  dailyIntel:      0,
  steelHourlyRate: 0,
  // Misc / Other
  stamina:         0,
  speedGenD:       0, speedGenH:       0, speedGenM:       0,
  speedTroopD:     0, speedTroopH:     0, speedTroopM:     0,
  speedConstD:     0, speedConstH:     0, speedConstM:     0,
  speedResearchD:  0, speedResearchH:  0, speedResearchM:  0,
  speedLearningD:  0, speedLearningH:  0, speedLearningM:  0,
  speedHealingD:   0, speedHealingH:   0, speedHealingM:   0,
  // Experts
  books:           0,
  generalSigils:   0,
  cyrilleSigils:   0,
  agnesSigils:     0,
  romulusSigils:   0,
  holgerSigils:    0,
  fabianSigils:    0,
  baldurSigils:    0,
  valeriaSigils:   0,
  ronneSigils:     0,
  kathySigils:     0,
  // Chief gear & charms
  chiefPlans:      0,
  chiefPolish:     0,
  chiefAlloy:      0,
  chiefAmber:      0,
  charmDesigns:    0,
  charmGuides:     0,
  charmSecrets:    0,
};

// ─── Helpers to read building costs dynamically from Construction Planner state ─
// Rather than hardcoding FC/RFC totals, we read the user's actual building
// selections from localStorage so the Inventory hub always reflects reality.
function getInventoryBuildingTotals() {
  try {
    const raw = localStorage.getItem("cp-buildings");
    if (!raw) return { fcNeeded: 0, rfcNeeded: 0 };
    const buildings = JSON.parse(raw);
    // Use the same FC level order the Construction Planner uses
    const FC_LEVELS = ["FC1","FC2","FC3","FC4","FC5","FC6","FC7","FC8","FC9","FC10"];
    // Minimal per-level FC costs for a rough total (from BLDG_DB — just the base FCx row)
    // For Inventory hub we just need a reasonable "what you need" number
    // The Construction Planner has the accurate per-sub-level data; here we show 0
    // if current === goal (done), otherwise show the Construction Planner's numbers.
    // Simplest correct approach: return 0 and let user check Construction Planner for details.
    // But that's not helpful — instead sum from the cp-buildings selections via a lightweight lookup.
    let fcNeeded = 0, rfcNeeded = 0;
    // These are approximate totals per major-level step, good enough for the hub display
    const FC_COST_PER_LEVEL = {
      Furnace:     {FC2:790,FC3:1190,FC4:1675,FC5:2025,FC6:1600,FC7:1560,FC8:1400,FC9:1540,FC10:875},
      Embassy:     {FC2:195,FC3:295,FC4:415,FC5:498,FC6:300,FC7:330,FC8:380,FC9:425,FC10:215},
      Infantry:    {FC2:355,FC3:535,FC4:628,FC5:750,FC6:585,FC7:648,FC8:648,FC9:819,FC10:392},
      Marksman:    {FC2:355,FC3:535,FC4:628,FC5:750,FC6:585,FC7:648,FC8:648,FC9:819,FC10:392},
      Lancer:      {FC2:355,FC3:535,FC4:628,FC5:750,FC6:585,FC7:648,FC8:648,FC9:819,FC10:392},
      Command:     {FC2:155,FC3:235,FC4:279,FC5:335,FC6:220,FC7:264,FC8:264,FC9:308,FC10:175},
      Infirmary:   {FC2:155,FC3:235,FC4:279,FC5:335,FC6:220,FC7:264,FC8:264,FC9:308,FC10:175},
      "War Academy":{FC2:355,FC3:535,FC4:628,FC5:750,FC6:585,FC7:648,FC8:648,FC9:819,FC10:392},
    };
    const RFC_COST_PER_LEVEL = {
      Furnace:     {FC2:0,FC3:0,FC4:0,FC5:0,FC6:80,FC7:110,FC8:160,FC9:300,FC10:350},
      Embassy:     {FC2:0,FC3:0,FC4:0,FC5:8,FC6:20,FC7:32,FC8:50,FC9:88,FC10:87},
      Infantry:    {FC2:0,FC3:0,FC4:0,FC5:16,FC6:45,FC7:76,FC8:114,FC9:166,FC10:157},
      Marksman:    {FC2:0,FC3:0,FC4:0,FC5:16,FC6:45,FC7:76,FC8:114,FC9:166,FC10:157},
      Lancer:      {FC2:0,FC3:0,FC4:0,FC5:16,FC6:45,FC7:76,FC8:114,FC9:166,FC10:157},
      Command:     {FC2:0,FC3:0,FC4:0,FC5:8,FC6:20,FC7:32,FC8:50,FC9:84,FC10:70},
      Infirmary:   {FC2:0,FC3:0,FC4:0,FC5:8,FC6:20,FC7:32,FC8:50,FC9:84,FC10:70},
      "War Academy":{FC2:0,FC3:0,FC4:0,FC5:16,FC6:45,FC7:76,FC8:114,FC9:166,FC10:157},
    };
    buildings.forEach(b => {
      const fromIdx = FC_LEVELS.indexOf(b.current);
      const toIdx   = FC_LEVELS.indexOf(b.goal);
      if (fromIdx < 0 || toIdx <= fromIdx) return;
      const fc  = FC_COST_PER_LEVEL[b.name]  || {};
      const rfc = RFC_COST_PER_LEVEL[b.name] || {};
      for (let i = fromIdx + 1; i <= toIdx; i++) {
        const lvl = FC_LEVELS[i];
        fcNeeded  += fc[lvl]  || 0;
        rfcNeeded += rfc[lvl] || 0;
      }
    });
    return { fcNeeded, rfcNeeded };
  } catch {
    return { fcNeeded: 0, rfcNeeded: 0 };
  }
}

// ─── Hero Roster (from whiteout_survival_heroes_v2.xlsx) ─────────────────────
const HERO_ROSTER = [
  // Gen 1–9: all SSR
  { name:"Jeronimo",   type:"Infantry", gen:"Gen 1", quality:"SSR" },
  { name:"Natalia",    type:"Infantry", gen:"Gen 1", quality:"SSR" },
  { name:"Flint",      type:"Infantry", gen:"Gen 2", quality:"SSR" },
  { name:"Logan",      type:"Infantry", gen:"Gen 3", quality:"SSR" },
  { name:"Ahmose",     type:"Infantry", gen:"Gen 4", quality:"SSR" },
  { name:"Hector",     type:"Infantry", gen:"Gen 5", quality:"SSR" },
  { name:"Wu Ming",    type:"Infantry", gen:"Gen 6", quality:"SSR" },
  { name:"Edith",      type:"Infantry", gen:"Gen 7", quality:"SSR" },
  { name:"Gatot",      type:"Infantry", gen:"Gen 8", quality:"SSR" },
  { name:"Magnus",     type:"Infantry", gen:"Gen 9", quality:"SSR" },
  { name:"Molly",      type:"Lancer",   gen:"Gen 1", quality:"SSR" },
  { name:"Philly",     type:"Lancer",   gen:"Gen 2", quality:"SSR" },
  { name:"Mia",        type:"Lancer",   gen:"Gen 3", quality:"SSR" },
  { name:"Reina",      type:"Lancer",   gen:"Gen 4", quality:"SSR" },
  { name:"Norah",      type:"Lancer",   gen:"Gen 5", quality:"SSR" },
  { name:"Renee",      type:"Lancer",   gen:"Gen 6", quality:"SSR" },
  { name:"Gordon",     type:"Lancer",   gen:"Gen 7", quality:"SSR" },
  { name:"Sonya",      type:"Lancer",   gen:"Gen 8", quality:"SSR" },
  { name:"Fred",       type:"Lancer",   gen:"Gen 9", quality:"SSR" },
  { name:"Zinman",     type:"Marksman", gen:"Gen 1", quality:"SSR" },
  { name:"Alonso",     type:"Marksman", gen:"Gen 2", quality:"SSR" },
  { name:"Greg",       type:"Marksman", gen:"Gen 3", quality:"SSR" },
  { name:"Lynn",       type:"Marksman", gen:"Gen 4", quality:"SSR" },
  { name:"Gwen",       type:"Marksman", gen:"Gen 5", quality:"SSR" },
  { name:"Wayne",      type:"Marksman", gen:"Gen 6", quality:"SSR" },
  { name:"Bradley",    type:"Marksman", gen:"Gen 7", quality:"SSR" },
  { name:"Hendrik",    type:"Marksman", gen:"Gen 8", quality:"SSR" },
  { name:"Xura",       type:"Marksman", gen:"Gen 9", quality:"SSR" },
  // Base SR
  { name:"Sergey",     type:"Infantry", gen:"Base",  quality:"SR"  },
  { name:"Jessie",     type:"Lancer",   gen:"Base",  quality:"SR"  },
  { name:"Ling Xue",   type:"Lancer",   gen:"Base",  quality:"SR"  },
  { name:"Patrick",    type:"Lancer",   gen:"Base",  quality:"SR"  },
  { name:"Lumak Bokan",type:"Lancer",   gen:"Base",  quality:"SR"  },
  { name:"Bahiti",     type:"Marksman", gen:"Base",  quality:"SR"  },
  { name:"Gina",       type:"Marksman", gen:"Base",  quality:"SR"  },
  { name:"Jasser",     type:"Marksman", gen:"Base",  quality:"SR"  },
  { name:"Seo-yoon",   type:"Marksman", gen:"Base",  quality:"SR"  },
  // Base R
  { name:"Eugene",     type:"Infantry", gen:"Base",  quality:"R"   },
  { name:"Smith",      type:"Infantry", gen:"Base",  quality:"R"   },
  { name:"Charlie",    type:"Lancer",   gen:"Base",  quality:"R"   },
  { name:"Cloris",     type:"Marksman", gen:"Base",  quality:"R"   },
];

// Generation order for cumulative filtering
const GEN_ORDER = ["Base","Gen 1","Gen 2","Gen 3","Gen 4","Gen 5","Gen 6","Gen 7","Gen 8","Gen 9"];

// ─── Hero Base Stats — snapshot data imported from spreadsheet ────────────────
// Each entry is one recorded snapshot: { stars, level, widget, heroAtk, ... }
// More snapshots can be added per hero as data is collected over time.
const HERO_BASE_STATS = {
  "Jeronimo":   {stars:5,   level:80, widget:10, levelPower:233250,  starPower:864750,  skillPower:101520, gearStrength:281250, heroAtk:2559,  heroDef:2782,  heroHp:50061,  escorts:10, troopCap:13470, escortHp:1687,  escortDef:927,  escortAtk:851,  infAtk:2.602,  infDef:2.602,  infLeth:0.625, infHp:0.625},
  "Natalia":    {stars:1,   level:80, widget:0,  levelPower:205260,  starPower:136440,  skillPower:101520, gearStrength:null,   heroAtk:607,   heroDef:720,   heroHp:11880,  escorts:10, troopCap:13470, escortHp:3960,  escortDef:240,  escortAtk:201,  infAtk:0.4123, infDef:0.4123, infLeth:0,     infHp:0},
  "Flint":      {stars:5,   level:80, widget:10, levelPower:223920,  starPower:830160,  skillPower:101520, gearStrength:270000, heroAtk:2457,  heroDef:3204,  heroHp:48060,  escorts:10, troopCap:13470, escortHp:16020, escortDef:1068, escortAtk:818,  infAtk:2.4019, infDef:2.4019, infLeth:0.6,   infHp:0.6},
  "Logan":      {stars:3,   level:80, widget:0,  levelPower:279900,  starPower:560700,  skillPower:101520, gearStrength:null,   heroAtk:1408,  heroDef:1836,  heroHp:27540,  escorts:10, troopCap:13470, escortHp:9180,  escortDef:612,  escortAtk:468,  infAtk:1.3763, infDef:1.3763, infLeth:0,     infHp:0},
  "Ahmose":     {stars:3.3, level:80, widget:1,  levelPower:345210,  starPower:856620,  skillPower:101520, gearStrength:56700,  heroAtk:2084,  heroDef:2719,  heroHp:40792,  escorts:10, troopCap:13470, escortHp:13597, escortDef:906,  escortAtk:693,  infAtk:2.1138, infDef:2.1138, infLeth:0.0925,infHp:0.0925},
  "Hector":     {stars:5,   level:80, widget:10, levelPower:414252,  starPower:1535796, skillPower:101520, gearStrength:499500, heroAtk:4545,  heroDef:5927,  heroHp:88911,  escorts:10, troopCap:13470, escortHp:29367, escortDef:1975, escortAtk:1513, infAtk:4.4435, infDef:4.4435, infLeth:1.11,  infHp:1.11},
  "Wu Ming":    {stars:0,   level:1,  widget:0,  levelPower:41850,   starPower:0,       skillPower:0,      gearStrength:null,   heroAtk:183,   heroDef:240,   heroHp:3604,   escorts:10, troopCap:13470, escortHp:1201,  escortDef:80,   escortAtk:58,   infAtk:0.6817, infDef:0.6817, infLeth:0,     infHp:0},
  "Sergey":     {stars:5,   level:80, widget:0,  levelPower:149280,  starPower:553440,  skillPower:67680,  gearStrength:null,   heroAtk:1361,  heroDef:2220,  heroHp:26640,  escorts:10, troopCap:13470, escortHp:8880,  escortDef:740,  escortAtk:453,  infAtk:1.4011, infDef:1.4011, infLeth:0,     infHp:0},
  "Eugene":     {stars:5,   level:80, widget:0,  levelPower:121290,  starPower:449670,  skillPower:40608,  gearStrength:null,   heroAtk:1106,  heroDef:2220,  heroHp:21644,  escorts:10, troopCap:13470, escortHp:7215,  escortDef:740,  escortAtk:368,  infAtk:0.9007, infDef:0.9007, infLeth:0,     infHp:0},
  "Smith":      {stars:5,   level:80, widget:0,  levelPower:121290,  starPower:449670,  skillPower:40608,  gearStrength:null,   heroAtk:1106,  heroDef:2220,  heroHp:21644,  escorts:10, troopCap:13470, escortHp:7215,  escortDef:740,  escortAtk:368,  infAtk:0.9007, infDef:0.9007, infLeth:0,     infHp:0},
  "Molly":      {stars:5,   level:80, widget:10, levelPower:186600,  starPower:691800,  skillPower:101520, gearStrength:225000, heroAtk:2670,  heroDef:2670,  heroHp:26700,  escorts:10, troopCap:13470, escortHp:8900,  escortDef:890,  escortAtk:890,  infAtk:2.0016, infDef:2.0016, infLeth:0.5,   infHp:0.5},
  "Philly":     {stars:4,   level:75, widget:0,  levelPower:223920,  starPower:692640,  skillPower:101520, gearStrength:null,   heroAtk:1921,  heroDef:1602,  heroHp:19224,  escorts:10, troopCap:13470, escortHp:6408,  escortDef:534,  escortAtk:640,  infAtk:1.6653, infDef:1.6653, infLeth:0,     infHp:0},
  "Mia":        {stars:5,   level:80, widget:10, levelPower:279900,  starPower:1037700, skillPower:101520, gearStrength:315000, heroAtk:3960,  heroDef:3960,  heroHp:39600,  escorts:10, troopCap:13470, escortHp:13200, escortDef:1320, escortAtk:1320, infAtk:2.9023, infDef:2.9023, infLeth:0.7,   infHp:0.7},
  "Reina":      {stars:5,   level:80, widget:10, levelPower:345210,  starPower:1279830, skillPower:101520, gearStrength:416250, heroAtk:4938,  heroDef:4938,  heroHp:49395,  escorts:10, troopCap:13470, escortHp:16465, escortDef:1646, escortAtk:1646, infAtk:3.7029, infDef:3.7029, infLeth:0.925, infHp:0.925},
  "Norah":      {stars:5,   level:80, widget:9,  levelPower:414252,  starPower:1535796, skillPower:101520, gearStrength:499500, heroAtk:7199,  heroDef:5927,  heroHp:44454,  escorts:10, troopCap:13470, escortHp:14818, escortDef:1975, escortAtk:2397, infAtk:4.4435, infDef:4.4435, infLeth:1.11,  infHp:1.11},
  "Renee":      {stars:3,   level:80, widget:0,  levelPower:498222,  starPower:756000,  skillPower:101520, gearStrength:null,   heroAtk:3267,  heroDef:3267,  heroHp:32680,  escorts:10, troopCap:13470, escortHp:10893, escortDef:1089, escortAtk:1089, infAtk:2.5628, infDef:2.5628, infLeth:0,     infHp:0},
  "Jessie":     {stars:5,   level:80, widget:0,  levelPower:149280,  starPower:553440,  skillPower:67680,  gearStrength:null,   heroAtk:1776,  heroDef:2220,  heroHp:17760,  escorts:10, troopCap:13470, escortHp:5920,  escortDef:740,  escortAtk:592,  infAtk:1.4011, infDef:1.4011, infLeth:0,     infHp:0},
  "Ling Xue":   {stars:4,   level:80, widget:0,  levelPower:149280,  starPower:440640,  skillPower:67680,  gearStrength:null,   heroAtk:1310,  heroDef:1638,  heroHp:12104,  escorts:10, troopCap:13470, escortHp:4368,  escortDef:546,  escortAtk:436,  infAtk:0.9713, infDef:0.9713, infLeth:0,     infHp:0},
  "Patrick":    {stars:5,   level:80, widget:0,  levelPower:149280,  starPower:553440,  skillPower:67680,  gearStrength:null,   heroAtk:1776,  heroDef:2220,  heroHp:17760,  escorts:10, troopCap:13470, escortHp:5920,  escortDef:740,  escortAtk:592,  infAtk:1.4011, infDef:1.4011, infLeth:0,     infHp:0},
  "Lumak Bokan":{stars:4.2, level:80, widget:0,  levelPower:149280,  starPower:488320,  skillPower:67680,  gearStrength:null,   heroAtk:1449,  heroDef:1812,  heroHp:14496,  escorts:10, troopCap:13470, escortHp:4832,  escortDef:604,  escortAtk:483,  infAtk:1.0977, infDef:1.0977, infLeth:0,     infHp:0},
  "Charlie":    {stars:5,   level:80, widget:0,  levelPower:121290,  starPower:449670,  skillPower:40608,  gearStrength:null,   heroAtk:1106,  heroDef:2220,  heroHp:21644,  escorts:10, troopCap:13470, escortHp:7215,  escortDef:740,  escortAtk:368,  infAtk:0.9007, infDef:0.9007, infLeth:0,     infHp:0},
  "Zinman":     {stars:4,   level:80, widget:1,  levelPower:186600,  starPower:537600,  skillPower:101520, gearStrength:56700,  heroAtk:2061,  heroDef:1698,  heroHp:12735,  escorts:10, troopCap:13470, escortHp:4245,  escortDef:566,  escortAtk:686,  infAtk:1.3877, infDef:1.3877, infLeth:0.05,  infHp:0.05},
  "Alonso":     {stars:4.2, level:80, widget:4,  levelPower:223920,  starPower:691200,  skillPower:101520, gearStrength:135000, heroAtk:2911,  heroDef:2035,  heroHp:17982,  escorts:10, troopCap:13470, escortHp:5994,  escortDef:678,  escortAtk:969,  infAtk:1.8818, infDef:1.8818, infLeth:0.24,  infHp:0.24},
  "Greg":       {stars:4.1, level:80, widget:1,  levelPower:279900,  starPower:821700,  skillPower:101520, gearStrength:56700,  heroAtk:3236,  heroDef:2667,  heroHp:20002,  escorts:10, troopCap:13470, escortHp:6667,  escortDef:889,  escortAtk:1077, infAtk:2.1429, infDef:2.1429, infLeth:0.07,  infHp:0.07},
  "Lynn":       {stars:5,   level:80, widget:4,  levelPower:345210,  starPower:1279830, skillPower:101520, gearStrength:172050, heroAtk:5407,  heroDef:4450,  heroHp:33382,  escorts:10, troopCap:13470, escortHp:11127, escortDef:1483, escortAtk:1799, infAtk:3.7029, infDef:3.7029, infLeth:0.37,  infHp:0.37},
  "Gwen":       {stars:4,   level:80, widget:4,  levelPower:414252,  starPower:1152000, skillPower:101520, gearStrength:135000, heroAtk:4916,  heroDef:4048,  heroHp:30368,  escorts:10, troopCap:13470, escortHp:10122, escortDef:1249, escortAtk:1635, infAtk:3.0806, infDef:3.0806, infLeth:0.444, infHp:0.444},
  "Wayne":      {stars:4,   level:80, widget:0,  levelPower:498222,  starPower:1150800, skillPower:101520, gearStrength:null,   heroAtk:5309,  heroDef:4372,  heroHp:32800,  escorts:10, troopCap:13470, escortHp:10933, escortDef:1457, escortAtk:1767, infAtk:3.7467, infDef:3.7467, infLeth:0,     infHp:0},
  "Bahiti":     {stars:5,   level:80, widget:0,  levelPower:149280,  starPower:553440,  skillPower:67680,  gearStrength:null,   heroAtk:2157,  heroDef:2220,  heroHp:13320,  escorts:10, troopCap:13470, escortHp:4440,  escortDef:740,  escortAtk:718,  infAtk:1.4011, infDef:1.4011, infLeth:0,     infHp:0},
  "Jasser":     {stars:5,   level:80, widget:0,  levelPower:149280,  starPower:553440,  skillPower:67680,  gearStrength:null,   heroAtk:2157,  heroDef:2220,  heroHp:13320,  escorts:10, troopCap:13470, escortHp:4440,  escortDef:740,  escortAtk:718,  infAtk:1.4011, infDef:1.4011, infLeth:0,     infHp:0},
  "Seo-yoon":   {stars:4.3, level:80, widget:0,  levelPower:149280,  starPower:410480,  skillPower:67680,  gearStrength:null,   heroAtk:1842,  heroDef:1896,  heroHp:11376,  escorts:10, troopCap:13470, escortHp:3792,  escortDef:632,  escortAtk:613,  infAtk:1.1609, infDef:1.1609, infLeth:0,     infHp:0},
  "Gina":       {stars:5,   level:80, widget:0,  levelPower:149280,  starPower:553440,  skillPower:67680,  gearStrength:null,   heroAtk:2157,  heroDef:2220,  heroHp:13320,  escorts:10, troopCap:13470, escortHp:4440,  escortDef:740,  escortAtk:718,  infAtk:1.1008, infDef:1.1008, infLeth:0,     infHp:0},
  "Cloris":     {stars:5,   level:80, widget:0,  levelPower:121290,  starPower:449670,  skillPower:40608,  gearStrength:null,   heroAtk:1106,  heroDef:2220,  heroHp:21644,  escorts:10, troopCap:13470, escortHp:7215,  escortDef:740,  escortAtk:368,  infAtk:0.9007, infDef:0.9007, infLeth:0,     infHp:0},
};
const QUALITY_ORDER = ["R","SR","SSR"]; // ascending

// Sort heroes by quality desc, then gen desc, then type (Inf→Lan→Mks), then name asc
function sortHeroesByQuality(heroes) {
  const typeOrder = { Infantry:0, Lancer:1, Marksman:2 };
  return [...heroes].sort((a,b) => {
    const qDiff = QUALITY_ORDER.indexOf(b.quality) - QUALITY_ORDER.indexOf(a.quality);
    if (qDiff !== 0) return qDiff;
    const gDiff = GEN_ORDER.indexOf(b.gen) - GEN_ORDER.indexOf(a.gen);
    if (gDiff !== 0) return gDiff;
    const tDiff = typeOrder[a.type] - typeOrder[b.type];
    if (tDiff !== 0) return tDiff;
    return a.name.localeCompare(b.name);
  });
}
function sortHeroesByType(heroes) {
  const typeOrder = { Infantry:0, Lancer:1, Marksman:2 };
  return [...heroes].sort((a,b) => {
    const tDiff = typeOrder[a.type] - typeOrder[b.type];
    if (tDiff !== 0) return tDiff;
    const qDiff = QUALITY_ORDER.indexOf(b.quality) - QUALITY_ORDER.indexOf(a.quality);
    if (qDiff !== 0) return qDiff;
    const gDiff = GEN_ORDER.indexOf(b.gen) - GEN_ORDER.indexOf(a.gen);
    if (gDiff !== 0) return gDiff;
    return a.name.localeCompare(b.name);
  });
}
function sortHeroesByName(heroes) {
  return [...heroes].sort((a, b) => a.name.localeCompare(b.name));
}
function sortHeroesByGen(heroes) {
  const typeOrder = { Infantry:0, Lancer:1, Marksman:2 };
  return [...heroes].sort((a,b) => {
    const gDiff = GEN_ORDER.indexOf(b.gen) - GEN_ORDER.indexOf(a.gen);
    if (gDiff !== 0) return gDiff;
    const tDiff = typeOrder[a.type] - typeOrder[b.type];
    if (tDiff !== 0) return tDiff;
    return a.name.localeCompare(b.name);
  });
}

// Default stats for a single hero in the Heroes module
// Star options: 0, 0.1, 0.2 ... 0.5, 1, 1.1 ... 5.5
const STAR_OPTS = [];
for (let s = 0; s <= 4; s++) {
  for (let sub = 0; sub <= 5; sub++) {
    STAR_OPTS.push(parseFloat((s + sub * 0.1).toFixed(1)));
  }
}
STAR_OPTS.push(5); // max is exactly 5

function defaultHeroStats() {
  return {
    level: 0, stars: 0, widget: 0,
    expS1: 0, expS2: 0, expS3: 0,
    expdS1: 0, expdS2: 0, expdS3: 0,
    // Power details
    totalPower: 0, levelPower: 0, starPower: 0, skillPower: 0, gearStrength: 0,
    // Exploration base stats (escorts & troopCap moved to power details display)
    heroAtk: 0, heroDef: 0, heroHp: 0,
    escorts: 0, troopCap: 0,
    escortHp: 0, escortDef: 0, escortAtk: 0,
    // Expedition base stats
    infAtk: 0, infDef: 0, infLeth: 0, infHp: 0,
  };
}

// Build default heroStats map: { heroName: { level, expS1..., widget } }
function defaultAllHeroStats() {
  const map = {};
  HERO_ROSTER.forEach(h => { map[h.name] = defaultHeroStats(); });
  return map;
}

// Mithril & Mythic milestone costs for Legendary gear (from AG4:AJ104)
// Only paid when crossing or landing on these levels
const GEAR_MILESTONES = [
  { level:1,   mithril:0,  mythic:2  },
  { level:20,  mithril:10, mythic:3  },
  { level:40,  mithril:20, mythic:5  },
  { level:60,  mithril:30, mythic:5  },
  { level:80,  mithril:40, mythic:10 },
  { level:100, mithril:50, mythic:10 },
];

// Stones & Mythic per Mastery level (from AA69:AC90)
const MASTERY_COSTS = [
  { level:1,  stones:10,  mythic:0  },
  { level:2,  stones:20,  mythic:0  },
  { level:3,  stones:30,  mythic:0  },
  { level:4,  stones:40,  mythic:0  },
  { level:5,  stones:50,  mythic:0  },
  { level:6,  stones:60,  mythic:0  },
  { level:7,  stones:70,  mythic:0  },
  { level:8,  stones:80,  mythic:0  },
  { level:9,  stones:90,  mythic:0  },
  { level:10, stones:100, mythic:0  },
  { level:11, stones:110, mythic:1  },
  { level:12, stones:120, mythic:2  },
  { level:13, stones:130, mythic:3  },
  { level:14, stones:140, mythic:4  },
  { level:15, stones:150, mythic:5  },
  { level:16, stones:160, mythic:6  },
  { level:17, stones:170, mythic:7  },
  { level:18, stones:180, mythic:8  },
  { level:19, stones:190, mythic:9  },
  { level:20, stones:200, mythic:10 },
];

// Compute Mithril + Mythic needed for Legendary gear (currentLevel → goalLevel)
// Sum milestones strictly > current and <= goal
function calcGearCosts(currentLevel, goalLevel, isLegendary) {
  if (goalLevel <= currentLevel) return { mithril:0, mythic:0 };
  if (!isLegendary) return { mithril:0, mythic:0 };
  let mithril = 0, mythic = 0;
  GEAR_MILESTONES.forEach(m => {
    if (m.level > currentLevel && m.level <= goalLevel) {
      mithril += m.mithril;
      mythic  += m.mythic;
    }
  });
  return { mithril, mythic };
}

// Compute Stones + Mythic needed for Mastery levels (currentMastery → goalMastery)
// Sum costs for each mastery level strictly > current and <= goal
function calcMasteryCosts(currentMastery, goalMastery) {
  if (goalMastery <= currentMastery) return { stones:0, mythic:0 };
  let stones = 0, mythic = 0;
  MASTERY_COSTS.forEach(m => {
    if (m.level > currentMastery && m.level <= goalMastery) {
      stones += m.stones;
      mythic += m.mythic;
    }
  });
  return { stones, mythic };
}

// 6 fixed hero slots in requested order
// ─── Hero Skill Names & Descriptions ─────────────────────────────────────────
// Parsed from WOS_Hero_skill_details_(gen1-7).xlsx
// Each skill has a name and a description with level values in [v1/v2/v3/v4/v5] format
const HERO_SKILLS = {
"Charlie":{"expS1":{"name":"Shrapnel Load","desc":"Charlie throws out a homemade explosive, dealing Attack * [140% / 154% / 168% / 182% / 196%] Area of Effect damage to the target and its nearby enemies."},"expS2":{"name":"","desc":""},"expS3":{"name":"Grenadier","desc":"Charlie's grenades have a [10% / 15% / 15% / 20% / 20%] chance of stunning targets for [0.5 / 0.5 / 1 / 1 / 1.5s]."},"expdS1":{"name":"Demolitions Expert","desc":"Charlie's precise demolition experience has raised City Coal Mine Output by [5% / 10% / 15% / 20% / 25%]."},"expdS2":{"name":"","desc":""},"expdS3":{"name":"Coal Extraction","desc":"Charlie is an old hand at coal mining. + [5% / 10% / 15% / 20% / 25%] Coal Gathering Speed on the map."}},
"Cloris":{"expS1":{"name":"Rain of Arrows","desc":"Cloris launches a hail of arrows, dealing Attack * [180% / 198% / 216% / 234% / 252%] Area of Effect Damage around the target."},"expS2":{"name":"","desc":""},"expS3":{"name":"Hunter's Mark","desc":"Cloris paints a bullseye on a target, raising damage inflicted on the target by [10% / 15% / 20% / 25% / 30%] for this attack."},"expdS1":{"name":"Top Hunter","desc":"Cloris, the tundra's best hunter, has single-handedly raised City Hunter's Hut Output by [5% / 10% / 15% / 20% / 25%]."},"expdS2":{"name":"","desc":""},"expdS3":{"name":"Predator","desc":"Cloris knows the ecosystem like the back of her hand. + [5% / 10% / 15% / 20% / 25%] Meat Gathering Speed on the map."}},
"Eugene":{"expS1":{"name":"Axe Whirl","desc":"Eugene's axe pirouette deals damage of Attack * [80% / 88% / 96% / 104% / 110%] per 0.5s to nearby enemies for 3s."},"expS2":{"name":"","desc":""},"expS3":{"name":"Razor Sharp","desc":"Eugene's sharpened axe deals [10% / 15% / 20% / 25% / 30%] more damage per second."},"expdS1":{"name":"Woodland Inheritor","desc":"Eugene's consummate knowledge of timber processing has raised City Sawmill Output by [5% / 10% / 15% / 20% / 25%]."},"expdS2":{"name":"","desc":""},"expdS3":{"name":"Master Woodcutter","desc":"Eugene is always focused on achieving the perfect logging technique. + [5% / 10% / 15% / 20% / 25%] Wood Gathering Speed on the map."}},
"Smith":{"expS1":{"name":"Hammer Burn","desc":"Smith swings his hammer forward in a devastating arc, dealing Attack * [200% / 220% / 240% / 260% / 280%] damage."},"expS2":{"name":"","desc":""},"expS3":{"name":"Armor Enhancement","desc":"Smith upgrades his armor to reduce damage taken by [10% / 15% / 20% / 25% / 30%]."},"expdS1":{"name":"Burnished Iron","desc":"Smith's contagious passion for the art of crafting has raised City Iron Mine Output by [5% / 10% / 15% / 20% / 25%]."},"expdS2":{"name":"","desc":""},"expdS3":{"name":"Craftsmanship","desc":"Smith has an extraordinary sixth sense when it comes to iron. + [5% / 10% / 15% / 20% / 25%] Iron Gathering Speed on the map."}},
"Bahiti":{"expS1":{"name":"Precise Shot","desc":"Bahiti targets enemy weak points with devastating precision, dealing Attack * [400% / 440% / 480% / 520% / 560%] damage."},"expS2":{"name":"Quick Shot","desc":"Bahiti gains +[10% / 15% / 20% / 25% / 30%] Attack Speed as he is very experienced in wilderness survival."},"expS3":{"name":"Pathfinder Vision","desc":"Bahiti deals [10% / 15% / 20% / 25% / 30%] extra damage."},"expdS1":{"name":"Sixth Sense","desc":"Bahiti senses for dangers ahead, reducing damage taken by [4% / 8% / 12% / 16% / 20%] for all troops."},"expdS2":{"name":"","desc":""},"expdS3":{"name":"Fluorescence","desc":"Bahiti's battlefield instincts grants all troops' attack a 50% chance of increasing damage dealt by [10% / 20% / 30% / 40% / 50%]."}},
"Gina":{"expS1":{"name":"Incendiary Arrow","desc":"Gina's Incendiary Shot deals Attack * [210% / 230% / 250% / 270% / 290%] damage to an enemy target as well as Attack * [70% / 77% / 84% / 91% / 98%] damage to others nearby."},"expS2":{"name":"Windtalker","desc":"Gina improves the design of her crossbow, increasing Attack Speed by [10% / 15% / 20% / 25% / 30%]."},"expS3":{"name":"Eagle Eyes","desc":"Gina can quickly latch onto an enemy's weakness, increasing Crit Rate by [7% / 10% / 13% / 16% / 20%]."},"expdS1":{"name":"Endurance Training","desc":"Gina's strict Governor training regimen can be counted upon to reduce Stamina cost by [10% / 12% / 15% / 18% / 20%]."},"expdS2":{"name":"","desc":""},"expdS3":{"name":"Quick Paced","desc":"Gina is a fast and aggressive wilderness rider, boosting Wilderness March Speed by [20% / 40% / 60% / 80% / 100%]."}},
"Jasser":{"expS1":{"name":"Triple Volley","desc":"Jasser precisely aims and fires three consecutive bullets, dealing Attack * 100%, Attack * [125% / 137.5% / 150% / 162.5% / 175%], and Attack * [150% / 165% / 180% / 195% / 210%] damage respectively, with the third being area of effect damage."},"expS2":{"name":"Suppressive Fire","desc":"Jasser relies on masterful marksmanship and overwhelming firepower to suppress the enemy, dealing Attack * [100% / 110% / 120% / 130% / 140%] damage and reducing the target's Attack Speed by [30% / 35% / 40% / 45% / 50%] for 2s."},"expS3":{"name":"Natural Precision","desc":"Jasser's impeccable marksmanship has become second nature, increasing Attack by [8% / 12% / 16% / 20% / 24%]."},"expdS1":{"name":"Tactical Genius","desc":"Jasser's combination of courage and wisdom enriches the army, increasing damage dealt by [5% / 10% / 15% / 20% / 25%] for all troops."},"expdS2":{"name":"","desc":""},"expdS3":{"name":"Enlightened Warfare","desc":"Jasser's profound knowledge increases the city's Research Speed by [3% / 6% / 9% / 12% / 15%]."}},
"Jessie":{"expS1":{"name":"Burst Fire","desc":"Jessie sprays enemies in a forward arc with her machine gun, dealing Attack * [55% / 60% / 65% / 70% / 75%] damage every 0.5s for 2s."},"expS2":{"name":"Defense Upgrade","desc":"Jessie upgrades her armor, increasing Defense by [25% / 37.5% / 50% / 62.5% / 70%]."},"expS3":{"name":"Weapon Upgrade","desc":"Jessie's upgraded weapon boosts Attack by [8% / 12% / 16% / 20% / 24%]."},"expdS1":{"name":"Stand of Arms","desc":"Jessie implements advanced weaponry for our troops, increasing damage dealt by [5% / 10% / 15% / 20% / 25%] for all troops."},"expdS2":{"name":"","desc":""},"expdS3":{"name":"Bulwarks","desc":"With a keen engineering eye, Jessie enhances troops' armor, reducing damage taken by [4% / 8% / 12% / 16% / 20%] for all troops."}},
"Patrick":{"expS1":{"name":"BBQ Feast","desc":"Patrick prepares a lavish feast, restoring Health by Attack * [200% / 220% / 240% / 260% / 280%] to all troops and increasing Attack by [5% / 5.5% / 6% / 6.5% / 7%] for all troops for 4s."},"expS2":{"name":"Thick Belly","desc":"Patrick's protective blubber reduces damage taken by [10% / 15% / 20% / 25% / 30%]."},"expS3":{"name":"Emergency Snack","desc":"Patrick's regular snacking restores Health equal to Attack * [50% / 55% / 60% / 65% / 70%] every 5s."},"expdS1":{"name":"Super Nutrients","desc":"Patrick's culinary masterpieces invigorate our troops, increasing Health by [5% / 10% / 15% / 20% / 25%] for all troops."},"expdS2":{"name":"","desc":""},"expdS3":{"name":"Caloric Booster","desc":"Patrick's gourmet meals motivate and unleash the potential of our soldiers, increasing Attack * [5% / 10% / 15% / 20% / 25%] for all troops."}},
"Seo-yoon":{"expS1":{"name":"Heartbeat of Valor","desc":"Seo-Yoon lifts the army's spirits with invigorating drum beats, increasing all hero and troops' Attack by [1.5% / 2% / 2.5% / 3% / 3.5%] and Attack Speed by [2.5% / 3% / 3.5% / 4% / 4.5%] for 4s."},"expS2":{"name":"Bullseye Bash","desc":"Seo-Yoon aims for the enemy's weak spot and hurls the drumstick with full force, dealing Attack * [150% / 165% / 180% / 195% / 210%] damage."},"expS3":{"name":"Gale's Pulse","desc":"Seo-Yoon dances to the rhythm, sharpening her assault. For every 3 basic attacks, increases Attack Speed by [1% / 2% / 3% / 4% / 5%]. Lasts until the end of the battle."},"expdS1":{"name":"Rallying Beat","desc":"As the march nears, Seo-Yoon drums to bolster everyone's morale, increasing Attack by [5% / 10% / 15% / 20% / 25%] for all troops."},"expdS2":{"name":"","desc":""},"expdS3":{"name":"Soothing Dance","desc":"Seo-Yoon treats wounded troops with traditional medicine, increasing Healing Speed in the Infirmary by [10% / 20% / 30% / 40% / 50%]."}},
"Sergey":{"expS1":{"name":"Shielded Strike","desc":"Sergey gives an enemy a solid whack with his heavy shield, knocking the target back while dealing Attack * [200% / 220% / 240% / 260% / 280%] Area of Effect damage."},"expS2":{"name":"Joint Defense","desc":"Sergey can organize strong perimeters, increasing all friendly hero Defense by [5% / 7.5% / 10% / 12.5% / 15%]."},"expS3":{"name":"Shield Block","desc":"Sergey trades his shield for an upgraded model, reducing damage taken by [10% / 15% / 20% / 25% / 30%]."},"expdS1":{"name":"Defenders' Edge","desc":"Sergey guards our troops with his shield, reducing damage taken by [4% / 8% / 12% / 16% / 20%] for all troops."},"expdS2":{"name":"","desc":""},"expdS3":{"name":"Weaken","desc":"Sergey's intimidating presence reduces Attack by [4% / 8% / 12% / 16% / 20%] for all enemy troops."}},
"Lumak Bokan":{"expS1":{"name":"Earthshake","desc":"Lumak Bokan lets out an intimidating war cry, reducing Attack by [1% / 2% / 3% / 4% / 5%] for all enemy troops for 2s."},"expS2":{"name":"Echoing Boost","desc":"Beyond intimidating enemies, Lumak Bokan's war cry invigorates allies. Upon casting Earthshake, increases his and nearby friendly troops' Attack by [15% / 20% / 25% / 30% / 35%] for 2s."},"expS3":{"name":"Jungle-Born Agility","desc":"Years of fighting in the jungles and mountains grant Lumak Bokan swift agility, increasing his Attack Speed by [10% / 15% / 20% / 25% / 30%]."},"expdS1":{"name":"Tactical Deception","desc":"With Lumak Bokan's expert guerrilla tactics, all enemy troops' damage dealt is reduced by [4% / 8% / 12% / 16% / 20%]."},"expdS2":{"name":"","desc":""},"expdS3":{"name":"Huntsman's Gift","desc":"Lumak Bokan passes on the islander's hunting techniques to the soldiers, increasing Hunting (Wilderness) March Speed by [20% / 40% / 60% / 80% / 100%]."}},
"Molly":{"expS1":{"name":"Super Snowball","desc":"Molly launches a Super Snowball which plops down to deal Attack * [180% / 198% / 216% / 234% / 252%] Area of Effect Damage and freezes them for 1.5s."},"expS2":{"name":"Frost Ambush","desc":"Molly ambushes the enemy with her great camouflage skills, dealing Attack * [150% / 165% / 180% / 195% / 210%] damage."},"expS3":{"name":"Youthful Persistence","desc":"Molly loves a challenge, gaining + [20% / 30% / 40% / 50% / 60%] Attack Speed under 50% Health."},"expdS1":{"name":"Calling of the Snow","desc":"Molly leads a charge as overwhelming as an avalanche, granting all troops' attack a [4% / 8% / 12% / 16% / 20%] chance of stunning the target for 1 turn."},"expdS2":{"name":"Ice Dominion","desc":"Molly excels in snowy terrains, granting all troops' attack a 50% chance of increasing damage dealt by [10% / 20% / 30% / 40% / 50%]."},"expdS3":{"name":"Youthful Rage","desc":"Hell hath no fury like an angry Molly, increasing damage dealt by [5% / 10% / 15% / 20% / 25%] for all troops."}},
"Zinman":{"expS1":{"name":"Nail Scatter","desc":"Zinman covers the target in a stream of nails, each dealing Attack * [55% / 60% / 65% / 70% / 75%] damage and a 2-second stun."},"expS2":{"name":"Quick Defense","desc":"Zinman works well under pressure, fortifying his position under 50% Health with a + [50% / 75% / 100% / 125% / 150%] boost to his Defense."},"expS3":{"name":"Robust","desc":"Zinman's energetic poise provides a + [10% / 15% / 20% / 25% / 30%] Attack Speed boost."},"expdS1":{"name":"Construction Emergency","desc":"Zinman's logistics expertise has accelerated City construction upgrades by [3% / 6% / 9% / 12% / 15%]."},"expdS2":{"name":"Resourceful","desc":"Zinman's talent for maximising efficiency has lowered City Building Upgrade costs by [3% / 6% / 9% / 12% / 15%]."},"expdS3":{"name":"Positional Battler","desc":"Zinman masterfully manipulates the battlefield, increasing damage dealt by [5% / 10% / 15% / 20% / 25%] for all troops."}},
"Natalia":{"expS1":{"name":"Beast Charge","desc":"Natalia's bear violently smashes the ground, knocking back enemies in range and stunning them for 1s, while dealing Attack * [160% / 176% / 192% / 208% / 224%] Area of Effect Damage."},"expS2":{"name":"Whip","desc":"Natalia wields her whip against a target for Attack * [150% / 165% / 180% / 195% / 210%] damage."},"expS3":{"name":"Rage Response","desc":"Only fools would dare anger Natalia or her furry companion. Natalia has a 10% chance of gaining a + [4% / 6% / 8% / 10% / 12%] Attack boost for 3s upon taking damage (max 5 stacks)."},"expdS1":{"name":"Wildling Roar","desc":"Natalia's bear roars and instills terror into the hearts of enemies, granting all troops' attack a [4% / 8% / 12% / 16% / 20%] chance of stunning the target for 1 turn."},"expdS2":{"name":"Queen of the Wild","desc":"Natalia is a natural leader, increasing Attack by [5% / 10% / 15% / 20% / 25%] for all troops."},"expdS3":{"name":"Call of the Wild","desc":"Natalia's unexplained connection with nature allows her to rally wild beasts, increasing damage dealt by [5% / 10% / 15% / 20% / 25%] for all troops."}},
"Jeronimo":{"expS1":{"name":"Combo Slash","desc":"Jeronimo launches enemies in the target area into the air, following up with three slashes, each dealing Attack * [160% / 176% / 192% / 208% / 224%] damage."},"expS2":{"name":"Sword Art","desc":"Each of Jeronimo's attacks releases sword energy, dealing Attack * [15% / 17% / 19% / 21% / 23%] damage to enemies in a rectangular area straight ahead."},"expS3":{"name":"Lone Wolf","desc":"Jeronimo is a master at pressing advantages, gaining a + [16% / 24% / 32% / 40% / 48%] Attack boost over 50% Health."},"expdS1":{"name":"Battle Manifesto","desc":"Jeronimo delivers a rousing rally speech ahead of the battle, increasing damage dealt by [5% / 10% / 15% / 20% / 25%] for all troops."},"expdS2":{"name":"Swordmentor","desc":"Jeronimo imparts the secrets of swordsmanship, increasing Attack by [5% / 10% / 15% / 20% / 25%] for all troops."},"expdS3":{"name":"Expert Swordsmanship","desc":"Jeronimo's teachings in sword arts grants all troops' attack a [4% / 8% / 12% / 16% / 20%] chance of stunning the target for 1 turn."}},
"Alonso":{"expS1":{"name":"Trapnet","desc":"Alonso casts a wide net over the target area, dealing Attack * [200% / 220% / 240% / 260% / 280%] Area of Effect Damage and immobilizing enemies for 1.5s."},"expS2":{"name":"Tidal Force","desc":"Alonso shoots a harpoon with tsunami-like force at a target, dealing Attack * [50% / 55% / 60% / 65% / 70%] Area of Effect Damage."},"expS3":{"name":"Harpoon Blast","desc":"Alonso's heavy harpoon can really do some damage, stunning targets for [0.2s / 0.2s / 0.4s / 0.4s / 0.5s] after every [8 / 7 / 7 / 6 / 5] strikes."},"expdS1":{"name":"Onslaught","desc":"Alonso's strength, like a massive wave, grants all troops' attack a [4% / 8% / 12% / 16% / 20%] chance of stunning the target for 1 turn."},"expdS2":{"name":"Iron Strength","desc":"Alonso's indomitable will grants all troops' attack a 20% chance of reducing damage dealt by [10% / 20% / 30% / 40% / 50%] for all enemy troops for 2 turns."},"expdS3":{"name":"Poison Harpoon","desc":"Alonso coats weapons with lethal toxins, granting all troops' attack a 50% chance of dealing [10% / 20% / 30% / 40% / 50%] more damage."}},
"Flint":{"expS1":{"name":"Fires of Vengeance","desc":"Flint's fire-breathing attack deals Attack * [60% / 66% / 72% / 78% / 84%] damage every 0.5s and amplifies damage taken by the target by [10% / 15% / 20% / 25% / 30%] for 2s."},"expS2":{"name":"Incinerator","desc":"Pain only boosts Flint's potential. Flint immediately regains [20% / 25% / 30% / 35% / 40%] of his max Health when Health is below 50%. Can only activate once per battle."},"expS3":{"name":"Heat Diffusion","desc":"The warmth of Flint's fire represents hope in troubling times, boosting your heroes' Attack Speed by [3% / 4% / 5% / 6% / 7%]."},"expdS1":{"name":"Pyromaniac","desc":"Every flame, no matter how small, can ignite a roaring fire. Flint grants all troops' attack a 20% chance of setting the target on fire, dealing [8% / 16% / 24% / 32% / 40%] damage per turn for 3 turns."},"expdS2":{"name":"Burning Resolve","desc":"Flint's fire not only dispels the cold but also ignites the passion for battle, increasing Attack by [5% / 10% / 15% / 20% / 25%] for all troops."},"expdS3":{"name":"Immolation","desc":"Flint's burning vengeance threatens all foes, granting all troops' attack a 50% chance of increasing enemy troops' damage taken by [10% / 20% / 30% / 40% / 50%]."}},
"Philly":{"expS1":{"name":"First Aid","desc":"Philly's advanced medical training immediately restores Health equal to her Attack * [200% / 220% / 240% / 260% / 280%] to all friendly heroes."},"expS2":{"name":"Restorative Hands","desc":"A master of first aid on the point of death, Philly immediately restores Health equal to her Attack * [100% / 110% / 120% / 130% / 140%] to the weakest friendly hero."},"expS3":{"name":"Paralytic Lotion","desc":"Philly poisons the target, disabling the enemy for 1s while dealing Attack * [140% / 154% / 168% / 182% / 196%] damage."},"expdS1":{"name":"Vigor Tactics","desc":"Philly's secret remedy strengthens the soldiers, increasing Attack by [3% / 6% / 9% / 12% / 15%] and Defense by [2% / 4% / 6% / 8% / 10%] for all troops."},"expdS2":{"name":"Dosage Boost","desc":"Philly uses her secret tonic to enhance the warriors' strength, granting all troops' attack a 25% chance of dealing [120% / 140% / 160% / 180% / 200%] damage."},"expdS3":{"name":"Numbing Spores","desc":"Philly coats weapons with a mysterious fungal extract, granting all troops' attack a [4% / 8% / 12% / 16% / 20%] chance of stunning the target for 1 turn."}},
"Greg":{"expS1":{"name":"Righteous Wind","desc":"Summons a cage from the sky, dealing Attack * [160% / 176% / 192% / 208% / 224%] damage to enemies within range and stunning them for 2s."},"expS2":{"name":"Poetic Justice","desc":"Puts an enemy target on trial and imposes punishment or gives commendation. Punishment will deal damage equal to Greg's Attack * [220% / 240% / 260% / 280% / 300%] to the target whereas commendation will restore Health equal to Greg's Attack * 50% for the target."},"expS3":{"name":"Fair Judgement","desc":"Let the enemies be severely punished for the crimes they have committed, increasing their damage taken by [10% / 15% / 20% / 25% / 30%] for 3s."},"expdS1":{"name":"Sword of Justice","desc":"Greg transforms our troops into a relentless sword of justice, granting a 20% chance of increasing damage dealt by [8% / 16% / 24% / 32% / 40%] for all troops for 3 turns."},"expdS2":{"name":"Deterrence of Law","desc":"Greg uses the authority of the law to intimidate enemies, granting all troops' attack a 20% chance of reducing enemy damage dealt by [10% / 20% / 30% / 40% / 50%] for 2 turns."},"expdS3":{"name":"Law and Order","desc":"Greg's faith in law and order uplifts everyone, increasing Health by [5% / 10% / 15% / 20% / 25%] for all troops."}},
"Logan":{"expS1":{"name":"Fists of Destruction","desc":"Smashes Fists of Steel on the ground, releasing a powerful blast that deals Attack * [120% / 132% / 144% / 156% / 168%] damage to the target and reduces the Attack Speed of the target by 50% for 4s."},"expS2":{"name":"Power Suit","desc":"Logan's Power Suit provides extraordinary protection and has a [8% / 10% / 12% / 14% / 16%] chance of increasing Defense by [8% / 11% / 14% / 17% / 20%] when attacked for 2s up to 5 stacks."},"expS3":{"name":"Blustery Strike","desc":"Performs a powerful punch that comes with a freezing and blustery wind, dealing Attack * [80% / 88% / 96% / 104% / 112%] damage to the targets in a cone-shaped area with a 30% chance of stunning the targets for 1s."},"expdS1":{"name":"Lion Strike","desc":"Logan's modified weapon can tear into enemies more easily, granting all troops' attack a 20% chance of dealing [8% / 16% / 24% / 32% / 40%] extra damage per turn for 3 turns."},"expdS2":{"name":"Lion Intimidation","desc":"Logan intimidates his opponents with the ferocity of a lion, reducing damage taken by [4% / 8% / 12% / 16% / 20%] for all troops."},"expdS3":{"name":"Leader Inspiration","desc":"Logan inspires everyone with his inherent leadership qualities, increasing Health by [5% / 10% / 15% / 20% / 25%] for all troops."}},
"Mia":{"expS1":{"name":"Fate's Finale","desc":"Mia throws a tarot card at enemies, dealing Attack * [270% / 297% / 324% / 351% / 378%] damage, and can either reduce the target's Attack by 20% for 2s, or stun the target for 1.5s."},"expS2":{"name":"Bad Omen","desc":"Mia curses an enemy target, dealing fluctuating damage based on a \"base value\" of Mia's Attack * [50% / 55% / 60% / 65% / 70%]. The final damage dealt will be a random figure ranging from 5% to 600% of the \"base value\"."},"expS3":{"name":"Guardian of Destiny","desc":"Mia protects the hero with the lowest remaining Health and restores Health for the hero based on a \"base value\" of Mia's Attack * [100% / 110% / 120% / 130% / 140%]. The final Health restored will be a random figure ranging from 5% to 400% of the \"base value\"."},"expdS1":{"name":"Bad Luck Streak","desc":"Grants all troops' attack a 50% chance of cursing the target, increasing their damage taken by [10% / 20% / 30% / 40% / 50%]."},"expdS2":{"name":"Lucky Charm","desc":"Mia brings good luck to the Troops, granting a 50% chance of boosting troops' Attack by [10% / 20% / 30% / 40% / 50%]."},"expdS3":{"name":"Ritual Deciphering","desc":"Mia foresees potential dangers before battle, granting a 40% chance of reducing damage taken by [10% / 20% / 30% / 40% / 50%] for all troops."}},
"Ahmose":{"expS1":{"name":"Cthugha's Protection","desc":"Ahmose wield his robust shield, entering an invulnerable state (unable to move or cast skills, immune to control effects) and reducing damage taken by [30% / 40% / 50% / 60% / 70%] for nearby friendly troops for 2s."},"expS2":{"name":"Daybreak Knife","desc":"Ahmose pierces the enemies at the front with a sharp spear, dealing Attack * [70% / 77% / 84% / 91% / 98%] damage, tearing apart the enemy's defense, and making enemies take 20% more damage for the next 2s."},"expS3":{"name":"Ancestral Blessing","desc":"The energy of Fire Crystal, which is akin to the blessing of ancestors, heals Ahmose's wounds. After casting \"Cthugha's Protection\", Ahmose will recover Attack * [30% / 33% / 36% / 39% / 42%] Health for 5s."},"expdS1":{"name":"Viper Formation","desc":"Ahmose revives the lost art of ancient guardians. His Infantry pauses the attack once every four times, reducing damage taken by Lancers and Marksmen by [10% / 15% / 20% / 25% / 30%] and Infantry by [10% / 25% / 40% / 55% / 70%] for 2 turns."},"expdS2":{"name":"Prayer of Flame","desc":"Ahmose amplifies the combat spirit of friendly infantry with the power of the Fire Crystal, increasing their damage dealt by [20% / 40% / 60% / 80% / 100%]."},"expdS3":{"name":"Blade of Light","desc":"Ahmose infuses friendly Infantry's weapons with the essence of Fire Crystals, increasing his infantries' damage dealt per attack by [12% / 24% / 36% / 48% / 60%] and the target's damage taken by [5% / 10% / 15% / 20% / 25%] for 1 turn."}},
"Lynn":{"expS1":{"name":"Hymn of Sidrak","desc":"Lynn strikes a rousing battle hymn to uplift the troops, clearing all debuffs (Freeze, Stun, etc.) for all troops and increasing their Attack by [3% / 4% / 5% / 6% / 7%] for [3s / 3.5s / 4s / 4.5s / 5s], during which they remain immune to all debuffs."},"expS2":{"name":"Lethal Finale","desc":"Seizes the opportunity to fire a bullet with strong penetrating power, dealing Attack * [220% / 240% / 260% / 280% / 300%] damage to enemies along the way."},"expS3":{"name":"Discordant Tune","desc":"Lynn bewilders the enemies with a mysterious and strange tune, reducing Attack Speed by [1% / 1.5% / 2% / 2.5% / 3%] and Healing effects by [40% / 45% / 50% / 55% / 60%] for all enemy troops."},"expdS1":{"name":"Song of Lion","desc":"Lynn uplifts our troops with an enthusiastic rhythm, granting a 40% chance of increasing damage dealt by [10% / 20% / 30% / 40% / 50%] for all troops."},"expdS2":{"name":"Melancholic Ballad","desc":"Lynn demoralizes the enemies with a somber tune, reducing damage dealt by [4% / 8% / 12% / 16% / 20%] for all enemy troops."},"expdS3":{"name":"Oonai Cadenza","desc":"Lynn harnesses the power of music to elevate troops morale, increasing her Marksmen's attack by [1% / 2% / 3% / 4% / 5%] for every 3 attacks. Stackable and lasts until the end of the battle."}},
"Reina":{"expS1":{"name":"Phantom Assault","desc":"Reina conjures an illusion enemy forces from behind, dealing Attack * [300% / 330% / 360% / 390% / 420%] Area of Effect Damage."},"expS2":{"name":"Vanishing Technique","desc":"Reina has a [5% / 10% / 15% / 20% / 25%] chance of confusing the opponent with illusion and dodging the damage when receiving a Normal Attack."},"expS3":{"name":"Poison of Demon","desc":"Reina inflicts illusion on enemy targets (hero first), dealing damage equal to Attack * [100% / 110% / 120% / 130% / 140%] and immobilising them for 1.5s."},"expdS1":{"name":"Assassin's Instinct","desc":"Reina targets enemy weak spots, increasing normal attack damage by [10% / 15% / 20% / 25% / 30%] for all troops."},"expdS2":{"name":"Swift Jive","desc":"Reina's adept leadership grants all troops a [4% / 8% / 12% / 16% / 20%] chance of dodging normal attacks."},"expdS3":{"name":"Shadow Blade","desc":"With Reina's clever tactics, her Lancers have a 25% chance of performing an extra attack, dealing [120% / 140% / 160% / 180% / 200%] damage."}},
"Gwen":{"expS1":{"name":"Salvo","desc":"Gwen unleashes a devastating salvo against enemies at the rear (heroes first), dealing Attack * [180% / 198% / 216% / 234% / 252%] Area of Effect Damage. Shockwaves will also decrease target's Attack Speed by 50% for 2 seconds."},"expS2":{"name":"Sky Sniper","desc":"Gwen unleashes a devastating air-assisted precision strike against the target (heroes first), dealing Attack * [100% / 110% / 120% / 130% / 140%] damage with a 50% chance of dealing double damage."},"expS3":{"name":"Hellfire","desc":"Gwen launches an incendiary grenade to burn all enemy targets in the area, dealing Attack * [35% / 38.5% / 42% / 45.5% / 49%] damage per second, for 3s."},"expdS1":{"name":"Eagle Vision","desc":"Gwen provides unfettered vision of enemy weakpoints during flights, increasing target's Damage Taken by [5% / 10% / 15% / 20% / 25%]."},"expdS2":{"name":"Air Dominance","desc":"Gwen dominates the skies, granting all troops' attack [20% / 40% / 60% / 80% / 100%] extra damage after every 5 attacks."},"expdS3":{"name":"Blastmaster","desc":"Gwen equips her marksmen with grenades, dealing [10% / 20% / 30% / 40% / 50%] extra damage to all enemies on the next attack of every 4 attacks."}},
"Hector":{"expS1":{"name":"Sword Whirlwind","desc":"Hector unleashes a whirlwind of swordplay, increasing Attack Speed by [80% / 90% / 100% / 110% / 120%] and becoming immune to Freeze, Stun and other control effect, for 4s."},"expS2":{"name":"Desperado","desc":"Hector thrives with danger, reducing Damage Taken by [20% / 30% / 40% / 50% / 60%] under 50% health."},"expS3":{"name":"Adrenaline Surge","desc":"Mortal peril is a powerful elixir to Hector's battle-hardened will. Hector gains + [16% / 24% / 32% / 40% / 48%] Attack under 50% Health."},"expdS1":{"name":"Survival Instincts","desc":"A seasoned warrior with an uncanny knack for reading the battlefield, Hector's presence has a 40% chance of reducing damage taken by [10% / 20% / 30% / 40% / 50%] for all troops."},"expdS2":{"name":"Rampant","desc":"Hector excels at raiding on fortified positions with well-coordinated Marksmen, increasing his Infantry's damage dealt by [100% / 125% / 150% / 175% / 200%] and Marksmen's damage dealt by [10% / 20% / 30% / 40% / 50%]. The effect decreases by 80% with each attack and is removed after the fifth."},"expdS3":{"name":"Blitz","desc":"Hector has mastered the offensive strategy, granting all troops' attack a 25% chance of dealing [120% / 140% / 160% / 180% / 200%] damage."}},
"Norah":{"expS1":{"name":"Barrage","desc":"Norah unleashes a 5-grenade cascade against random targets (heroes first), dealing Attack * [60% / 66% / 72% / 78% / 84%] Area of Effect damage."},"expS2":{"name":"Flashbang","desc":"Norah throws the flashbang, dealing Attack * [50% / 55% / 60% / 65% / 70%] damage and stuns the target for 1.5s."},"expS3":{"name":"Valkyrie Cry","desc":"Norah blitzes the enemy, boosting all Troops Attack by [3% / 3.5% / 4% / 4.5% / 5%]."},"expdS1":{"name":"Combined Arms","desc":"Norah is well trained in combined arms tactics, decreasing Damage Taken by [3% / 6% / 9% / 12% / 15%] and boosting Damage Dealt by [3% / 6% / 9% / 12% / 15%] for Infantry and Marksman."},"expdS2":{"name":"Sneak Strike","desc":"Norah has an eye for weaknesses, granting her Lancers a 20% chance of dealing [20% / 40% / 60% / 80% / 100%] extra damage to all enemies on attack."},"expdS3":{"name":"Momentum","desc":"Norah motivates our troops, increasing all troops' damage dealt by [5% / 10% / 15% / 20% / 25%] and reducing their damage taken by [5% / 10% / 15% / 20% / 25%] every 5 attacks made by lancers for 2 turns."}},
"Renee":{"expS1":{"name":"Illusion Cloud","desc":"Renee's colorful ball explodes and releases a strange cloud, dealing Attack * [100% / 110% / 120% / 130% / 140%] Area of Effect damage to enemies and confuses them for 1s."},"expS2":{"name":"Starpaint","desc":"Renee splashes dreamy paint, dealing Attack * [50% / 55% / 60% / 65% / 70%] damage to targets and placing a Star Mark, increasing target's damage taken by [2% / 3% / 4% / 5% / 6%] for 4s."},"expS3":{"name":"Dream Vision","desc":"Renee's targets painted with a Star Mark cannot escape her detection, increasing her Attack by [8% / 12% / 16% / 20% / 24%], increasing damage dealt to marked targets by [4% / 6% / 8% / 10% / 12%]."},"expdS1":{"name":"Nightmare Trace","desc":"Renee always fights in unbelievable ways. Her Lancers can place Dream Marks on their targets every two turns, dealing [40% / 80% / 120% / 160% / 200%] extra Lancer damage once next turn. The Dream Marks last for 1 turn."},"expdS2":{"name":"Dreamcatcher","desc":"Renee's Dream Marks highlight enemy vulnerabilities, increasing her Lancers' damage dealt to marked targets by [30% / 60% / 90% / 120% / 150%]."},"expdS3":{"name":"Dreamslice","desc":"Renee's Dream Marks expose enemy weaknesses, increasing damage dealt to marked targets by [15% / 20% / 45% / 60% / 75%] for all troops."}},
"Wayne":{"expS1":{"name":"Hurricane Blowback","desc":"Wayne throws a boomerang, dealing Attack * [100% / 110% / 120% / 130% / 140%] area of effect damage to enemies in a straight line. On its return, it deals the same amount of damage to enemies in its path."},"expS2":{"name":"Phantom Blitz","desc":"Wayne draws and fires in the blink of an eye. Each normal attack has a [15% / 20% / 25% / 30% / 35%] chance of triggering another normal attack."},"expS3":{"name":"Noon Time!","desc":"Wayne's impeccable aim grants a [3% / 6% / 9% / 12% / 15%] Crit Rate on dealing damage."},"expdS1":{"name":"Thunder Strike","desc":"Wayne's brilliant battle planning allows all troops to launch an extra attack every 4 turns, dealing [20% / 40% / 60% / 80% / 100%] damage."},"expdS2":{"name":"Roundabout Hit","desc":"Wayne's stratagems can pierce the thickest of defenses. On every other attack, his Marksmen deal [8% / 16% / 24% / 32% / 40%] extra damage to enemy Lancers and [4% / 8% / 12% / 16% / 20%] extra damage to enemy Marksmen."},"expdS3":{"name":"Fleet","desc":"Wayne ensures no misstep goes unpunished with an eagle's eye for weakness, granting all troops' attacks a [5% / 10% / 15% / 20% / 25%] Crit Rate."}},
"Wu Ming":{"expS1":{"name":"Cyclone Barrier","desc":"Wu Ming twirls his staff at blinding speed and forms an unyielding barrier, dealing Attack * [100% / 110% / 120% / 130% / 140%] Area of Effect damage, gaining invulnerability for 2s."},"expS2":{"name":"Inner Clarity","desc":"Wu Ming finds unparalleled clarity by silencing the chaos within, increasing Attack by [8% / 12% / 16% / 20% / 24%] and Defense by [16% / 24% / 32% / 40% / 48%] for 4s."},"expS3":{"name":"Remote Impact","desc":"Wu Ming hones his martial arts to perfection, dealing Attack * [20% / 22% / 24% / 26% / 28%] damage to a random enemy with every normal attack."},"expdS1":{"name":"Shadow's Evasion","desc":"Wu Ming moves like a shadow, dodging and countering enemies, reducing his Infantry's damage taken from normal attacks by [5% / 10% / 15% / 20% / 25%] and from skills by [6% / 12% / 18% / 24% / 30%]."},"expdS2":{"name":"Crescent Uplift","desc":"Wu Ming spreads his wisdom and techniques, increasing damage dealt by [4% / 8% / 12% / 16% / 20%] for all troops."},"expdS3":{"name":"Elemental Resonance","desc":"Wu Ming leads everyone to heightened affinity with their combat techniques, increasing skill damage dealt by [5% / 10% / 15% / 20% / 25%] for all troops."}},
"Gordon":{"expS1":{"name":"Poison Blast","desc":"Gordon throws a vase that disintegrates into a toxic mist, dealing Attack * [50% / 55% / 60% / 65% / 70%] damage to nearby enemies every 0.5s for 3s."},"expS2":{"name":"Toxic Molotov","desc":"Gordon hurls a chemical flask with precision and poisons the target, dealing Attack * [25% / 27.5% / 30% / 32.5% / 35%] damage every 0.5s and increasing its Damage Taken by [5% / 10% / 15% / 20% / 25%] for 2s."},"expS3":{"name":"Tolerization","desc":"Gordon's body has adapted to toxic over-exposure by generating new responses, increasing his Defense by [25% / 37.5% / 50% / 62.5% / 75%]."},"expdS1":{"name":"Venom Infusion","desc":"Gordon dips Lancers' weapons in venom. Every 2 attacks, Lancers deal [20% / 40% / 60% / 80% / 100%] extra damage and apply poison to the target for 1 turn. Poisoned enemies deal [4% / 8% / 12% / 16% / 20%] less damage."},"expdS2":{"name":"Chemical Terror","desc":"Gordon's envenomed weapons terrorizes the field, increasing Lancers' Damage Dealt by [30% / 60% / 90% / 120% / 150%] and reducing Damage Dealt by [6% / 12% / 18% / 24% / 30%] for all enemy troops for 1 turn, every 3 turns."},"expdS3":{"name":"Toxic Release","desc":"Gordon generates a defensive bio-toxic fog, confusing enemy frontline infantry, increasing their Damage Taken by [6% / 12% / 18% / 24% / 30%], while blocking enemy Marksmen's line of sight to reduce their Damage Dealt by [6% / 12% / 18% / 24% / 30%] for 2 turns every 4 turns."}},
"Bradley":{"expS1":{"name":"Destructor","desc":"Bradley primes his artillery with an extremely potent shell, dealing Attack * [300% / 330% / 360% / 390% / 420%] Area of Effect Damage."},"expS2":{"name":"Incendiary Shell","desc":"Bradley fires a special incendiary shell, dealing Attack * [60% / 66% / 72% / 78% / 84%] Area of Effect Damage. The flaming crater in its wake also deals Attack * [15% / 16.5% / 18% / 19.5% / 21%] damage to enemies every 0.5s for 2s."},"expS3":{"name":"Audacious","desc":"The prospect of death only energizes a seasoned warrior like Bradley, increasing his Attack by [8% / 12% / 16% / 20% / 24%]."},"expdS1":{"name":"Veteran's Might","desc":"Bradley's years of combat experience enables him to destroy enemies efficiently, increasing Attack by [5% / 10% / 15% / 20% / 25%] for all troops."},"expdS2":{"name":"Power Shot","desc":"Bradley uses his expertise in suppressive artillery against the enemy vanguard, increasing Damage Dealt to Lancers by [6% / 12% / 18% / 24% / 30%], and to Infantry by [5% / 10% / 15% / 20% / 25%] for all troops."},"expdS3":{"name":"Tactical Assistance","desc":"Bradley will press every advantage against a beleaguered enemy, increasing Damage Dealt by [6% / 12% / 18% / 24% / 30%] for all troops for 2 turns every 4 turns."}},
"Edith":{"expS1":{"name":"Ironclad Punch","desc":"Mr. Tin unleashes ironclad fury against Edith's assailants, punching all enemies in a fan-shaped area ahead, dealing Attack * [100% / 110% / 120% / 130% / 140%] damage and stuns the targets by 1s, while increasing his own Attack by [20% / 40% / 60% / 80% / 100%] for 2s."},"expS2":{"name":"Escape Capsule","desc":"Mr. Tin ejects his core as an escape capsule for Edith at 0 Health, detonating the rest of his body in a fiery explosion, dealing Attack * [200% / 220% / 240% / 260% / 280%] damage to nearby enemies."},"expS3":{"name":"Preemptive Alerts","desc":"Edith's battlefield intel warns Mr. Tin of potential dangers, granting him a [10% / 20% / 30% / 40% / 50%] chance of reducing Damage Taken by 50%."},"expdS1":{"name":"Strategic Balance","desc":"Mr Tin's colossal presence automatically shields friendly ranged units, reducing Damage Taken by [4% / 8% / 12% / 16% / 20%] for Marksmen, and suppressess the enemy, increasing Damage Dealt by [4% / 8% / 12% / 16% / 20%] for Lancers."},"expdS2":{"name":"Ironclad","desc":"Mr Tin's metallic body functions as a fortified wall on the field, reducing damage taken by [4% / 8% / 12% / 16% / 20%] for Infantry."},"expdS3":{"name":"Steel Sentinel","desc":"Edith's mobile defense system is reliable, increasing Health by [5% / 10% / 15% / 20% / 25%] for all troops."}},
};

const HERO_SLOTS = [
  { slotId:"Infantry1",  type:"Infantry",  label:"Infantry 1"  },
  { slotId:"Marksman1",  type:"Marksman",  label:"Marksman 1"  },
  { slotId:"Lancer1",    type:"Lancer",    label:"Lancer 1"    },
  { slotId:"Infantry2",  type:"Infantry",  label:"Infantry 2"  },
  { slotId:"Marksman2",  type:"Marksman",  label:"Marksman 2"  },
  { slotId:"Lancer2",    type:"Lancer",    label:"Lancer 2"    },
];

const GEAR_SLOTS = ["Goggles","Gloves","Belt","Boots","Widget"];

// Default state for one hero slot
function defaultHeroState(type) {
  const firstHero = HERO_ROSTER.find(h => h.type === type);
  return {
    hero: firstHero?.name ?? "",
    slots: GEAR_SLOTS.map(slot => ({
      slot,
      status:       "Mythic",  // Gear Status (slots 1-4 only)
      goalStatus:   "Mythic",  // Goal Gear Status
      gearCurrent:  0,
      gearGoal:     0,
      masteryCurrent: 0,
      masteryGoal:  0,
      widgetCurrent:0,
      widgetGoal:   0,
    })),
  };
}

// Read hero gear data for a specific hero from HeroGearPage storage
function getHeroGearData(heroName) {
  try {
    // Check sessionStorage first (guests), then localStorage (logged-in users)
    const raw = sessionStorage.getItem("hg-heroes") || localStorage.getItem("hg-heroes");
    if (!raw) return null;
    const heroData = JSON.parse(raw);
    const slot = heroData.find(h => h.hero === heroName);
    return slot || null;
  } catch { return null; }
}

// ─── Hero Profile Modal ───────────────────────────────────────────────────────

function HeroProfileModal({ hero, stats, onUpdate, onClose, currentUser, activeCharacter, hgHeroes, externalRefreshKey }) {
  const C = COLORS;
  // Derive gear data live from lifted hgHeroes state so profile updates instantly
  // when gear levels change in the Hero Gear Calculator
  const liveGearData = hgHeroes?.find(h => h.hero === hero.name) ?? getHeroGearData(hero.name);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [baseStatsConfirmed, setBaseStatsConfirmed] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [gearView, setGearView] = useState("detailed");
  const [gearStatModal, setGearStatModal] = useState(null);
  const [showAllStats, setShowAllStats] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    heroAtk:"", heroDef:"", heroHp:"", escortHp:"", escortDef:"", escortAtk:"",
    infAtk:"", infDef:"", infLeth:"", infHp:"",
    levelPower:"", starPower:"", skillPower:"", gearStrength:"",
    wgtHeroAtk:"", wgtHeroDef:"", wgtHeroHp:"",
    wgtEscortAtk:"", wgtEscortDef:"", wgtEscortHp:"",
    wgtTroopLeth:"", wgtTroopHp:"",
  });

  // Fetch this user's existing submissions for this hero
  const [existingSubs, setExistingSubs] = useState([]);
  useEffect(() => {
    if (!currentUser || !hero) return;
    supabase.from("stat_submissions")
      .select("id,hero_name,stars,level,widget,status,submitted_at,admin_note")
      .eq("submitted_by", currentUser.id)
      .eq("hero_name", hero.name)
      .order("submitted_at", { ascending: false })
      .then(({ data }) => setExistingSubs(data || []));
  }, [currentUser, hero?.name, submitDone]);

  // Fetch current hero stats from Supabase first, fall back to hardcoded HERO_BASE_STATS
  const [dbRef, setDbRef] = useState(null);
  const [dbRefLoading, setDbRefLoading] = useState(false);
  const [dbRefreshKey, setDbRefreshKey] = useState(0);
  const heroLevel  = (stats && stats.level)  ?? 0;
  const heroStars  = (stats && stats.stars)  ?? 0;
  const heroWidget = (stats && stats.widget) ?? 0;
  // Re-query whenever submitDone fires (user just submitted — admin may approve soon)
  // or when refreshKey changes
  useEffect(() => {
    if (!hero) return;
    setDbRef(null);
    setDbRefLoading(true);
    const widget = isSSRHero(hero.name) ? heroWidget : null;

    // Primary query: exact level + stars + widget match
    const runQuery = (useExact) => {
      const q = supabase.from("hero_stats_data")
        .select("*")
        .eq("hero_name", hero.name)
        .eq("is_current", true);
      if (useExact) {
        q.eq("level", Number(heroLevel)).eq("stars", Number(heroStars));
        if (widget === null) q.is("widget", null);
        else q.eq("widget", Number(widget));
        return q.maybeSingle();
      } else {
        return q.order("accepted_at", { ascending: false }).limit(1).maybeSingle();
      }
    };

    runQuery(true).then(({ data }) => {
      if (data) {
        setDbRef(data);
        setDbRefLoading(false);
      } else {
        runQuery(false).then(({ data: fallback }) => {
          setDbRef(fallback || null);
          setDbRefLoading(false);
        });
      }
    });
  }, [hero?.name, heroLevel, heroStars, heroWidget, dbRefreshKey, externalRefreshKey]);

  const local   = { ...defaultHeroStats(), ...stats };
  const set     = (field, val) => onUpdate(hero.name, field, val);
  const isSSR   = hero.quality === "SSR";

  // Build ref: Supabase row wins over hardcoded HERO_BASE_STATS
  const hardcodedRef = HERO_BASE_STATS[hero.name];
  const ref = dbRef ? { ...dbRef, ...(dbRef.stats || {}) } : hardcodedRef;

  // statsMatch: true when ref data exists for current level/stars/widget
  const statsMatch = dbRefLoading ? false
    : dbRef ? true  // fetched by exact level/stars/widget so always matches
    : !!(hardcodedRef &&
        hardcodedRef.level === local.level &&
        hardcodedRef.stars === local.stars &&
        hardcodedRef.widget === local.widget);

  // Find if user has an existing submission matching current level/stars/widget
  const matchingSub = existingSubs.find(s =>
    Number(s.stars)  === Number(local.stars) &&
    Number(s.level)  === Number(local.level) &&
    Number(s.widget ?? 0) === Number(local.widget ?? 0)
  );
  // "pending" or "accepted" blocks new submission; "rejected" allows resubmit
  const subBlocked = matchingSub && (matchingSub.status === "pending" || matchingSub.status === "accepted");

  const qualityColor = q => q === "SSR" ? C.accent : q === "SR" ? C.blue : C.textSec;
  const typeColor    = t => t === "Infantry" ? C.green : t === "Lancer" ? C.blue : C.amber;

  const sel = {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 5,
    color: C.textPri, fontSize: 12, padding: "4px 8px",
    fontFamily: "'Space Mono',monospace", outline: "none", cursor: "pointer",
  };

  const skillOpts  = Array.from({length:6},  (_,i) => i);
  const levelOpts  = Array.from({length:81}, (_,i) => i);
  const widgetOpts = Array.from({length:11}, (_,i) => i);

  const sectionHead = (title) => (
    <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
      color:C.textDim,fontFamily:"'Space Mono',monospace",marginBottom:10,
      paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>{title}</div>
  );

  const StatRow = ({ label, val, isPercent }) => (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:"5px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
      <span style={{color:C.textSec}}>{label}</span>
      <span style={{fontFamily:"'Space Mono',monospace",fontWeight:700,color:C.textPri}}>
        {val == null || val === 0 ? <span style={{color:C.textDim}}>—</span>
          : isPercent ? `${Math.round(val * 100) / 100}%` : Number(val).toLocaleString()}
      </span>
    </div>
  );

  const DataUnavailable = () => (
    <div style={{padding:"12px 14px",background:C.amberBg,border:`1px solid ${C.amber}40`,
      borderRadius:8,marginBottom:16,display:"flex",alignItems:"flex-start",gap:10}}>
      <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
      <div>
        <div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:4}}>Data unavailable</div>
        <div style={{fontSize:11,color:C.textSec,lineHeight:1.5}}>
          Stats for this hero at their current level/stars/widget haven't been compiled yet.
          Help the community by submitting your in-game stats!
        </div>
        <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
          <button onClick={() => setShowSubmit(true)}
            style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,
              cursor:"pointer",fontFamily:"Syne,sans-serif",border:`1px solid ${C.amber}`,
              background:"transparent",color:C.amber,
              display: subBlocked ? "none" : "inline-block"}}>
            📤 Submit My Stats
          </button>
          <button onClick={() => setDbRefreshKey(k => k + 1)}
            style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,
              cursor:"pointer",fontFamily:"Syne,sans-serif",border:`1px solid ${C.border}`,
              background:"transparent",color:C.textSec}}>
            🔄 Refresh Stats
          </button>
        </div>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    const pctFields = new Set(["infAtk","infDef","infLeth","infHp","wgtTroopLeth","wgtTroopHp"]);
    const statsPayload = {};
    Object.entries(submitForm).forEach(([k,v]) => {
      if (v !== "") {
        const num = parseFloat(v) || 0;
        // % fields: user enters e.g. 26.70, store as 0.2670
        statsPayload[k] = pctFields.has(k) ? Math.round(num / 100 * 1e6) / 1e6 : num;
      }
    });
    const ok = await submitHeroStats({
      hero_name:      hero.name,
      submitted_by:   currentUser?.id || null,
      character_name: activeCharacter?.name || null,
      stars:          local.stars,
      level:          local.level,
      widget:         local.widget,
      stats:          statsPayload,
    });
    setSubmitting(false);
    if (ok) { setSubmitDone(true); setShowSubmit(false); setBaseStatsConfirmed(false); setDbRefreshKey(k => k + 1); }
  };

  const NumField = ({ label, field, isPct }) => {
    const [local, setLocal] = React.useState(submitForm[field] ?? "");
    const inputRef = React.useRef(null);
    React.useEffect(() => { setLocal(submitForm[field] ?? ""); }, [field]);
    return (
      <div>
        <div style={{fontSize:11,color:C.textSec,marginBottom:3}}>
          {label}{isPct && <span style={{fontSize:10,color:C.accent,marginLeft:4}}>enter as % (e.g. 26.70)</span>}
        </div>
        <input ref={inputRef} type="number" min={0} step="any"
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={e => setSubmitForm(p => ({...p,[field]:e.target.value}))}
          onFocus={e => e.target.select()}
          onClick={e => e.stopPropagation()}
          style={{...sel,width:"100%",padding:"5px 8px",textAlign:"right"}} />
      </div>
    );
  };

  return createPortal(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:9999,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{background:"var(--c-card)",border:"1px solid var(--c-borderHi)",
        borderRadius:14,width:"100%",maxWidth:580,maxHeight:"92vh",overflowY:"auto",
        boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,
          display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"var(--c-card)",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:C.accentBg,
              border:`2px solid ${C.accentDim}`,display:"flex",alignItems:"center",
              justifyContent:"center",fontSize:14,fontWeight:800,color:C.accent}}>
              {hero.name[0]}
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:C.textPri}}>{hero.name}</div>
              <div style={{display:"flex",gap:8,marginTop:2}}>
                <span style={{fontSize:11,fontWeight:700,color:typeColor(hero.type)}}>{hero.type}</span>
                <span style={{fontSize:11,color:C.textDim}}>·</span>
                <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>{hero.gen}</span>
                <span style={{fontSize:11,color:C.textDim}}>·</span>
                <span style={{fontSize:11,fontWeight:700,color:qualityColor(hero.quality)}}>{hero.quality}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:18,lineHeight:1,padding:4}}>✕</button>
        </div>

        <div style={{padding:"20px 24px"}}>

          {/* Core stats row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
            <div>
              <div style={{fontSize:11,color:C.textSec,marginBottom:4}}>Level</div>
              <select value={local.level} onChange={e => set("level", Number(e.target.value))} style={{...sel,width:"100%"}}>
                {levelOpts.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,color:C.textSec,marginBottom:4}}>Stars</div>
              <select value={local.stars} onChange={e => set("stars", parseFloat(e.target.value))} style={{...sel,width:"100%"}}>
                {STAR_OPTS.map(v => <option key={v} value={v}>{"★".repeat(Math.floor(v))}{v % 1 > 0 ? `+${Math.round((v%1)*10)}/5` : ""} ({v})</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,color:C.textSec,marginBottom:4}}>Widget</div>
              <select value={local.widget} onChange={e => set("widget", Number(e.target.value))} style={{...sel,width:"100%"}}>
                {widgetOpts.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Gear section */}
          {(() => {
            const gearData = liveGearData;
            const troopType = hero.type; // "Infantry" | "Marksman" | "Lancer"
            const gearSlots = ["Goggles","Gloves","Belt","Boots"];

            // SVG icons per slot
            const SlotIcon = ({ slot, color }) => {
              const stroke = color;
              const fill = color + "22";
              if (slot === "Goggles") return (
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <rect x="6" y="18" width="16" height="14" rx="6" fill={fill} stroke={stroke} strokeWidth="2"/>
                  <rect x="30" y="18" width="16" height="14" rx="6" fill={fill} stroke={stroke} strokeWidth="2"/>
                  <rect x="8" y="21" width="12" height="7" rx="3.5" fill={color} fillOpacity="0.35"/>
                  <rect x="32" y="21" width="12" height="7" rx="3.5" fill={color} fillOpacity="0.35"/>
                  <line x1="22" y1="25" x2="30" y2="25" stroke={stroke} strokeWidth="2"/>
                  <path d="M6 22 Q3 22 3 25 Q3 28 6 28" fill="none" stroke={stroke} strokeWidth="1.5"/>
                  <path d="M46 22 Q49 22 49 25 Q49 28 46 28" fill="none" stroke={stroke} strokeWidth="1.5"/>
                </svg>
              );
              if (slot === "Gloves") return (
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <rect x="18" y="28" width="20" height="14" rx="3" fill={fill} stroke={stroke} strokeWidth="2"/>
                  <rect x="20" y="18" width="6" height="12" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5"/>
                  <rect x="28" y="16" width="6" height="14" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5"/>
                  <rect x="36" y="18" width="6" height="12" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5"/>
                  <rect x="16" y="24" width="24" height="7" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5"/>
                  <line x1="18" y1="34" x2="38" y2="34" stroke={stroke} strokeWidth="1" strokeOpacity="0.4"/>
                  <line x1="18" y1="38" x2="38" y2="38" stroke={stroke} strokeWidth="1" strokeOpacity="0.4"/>
                </svg>
              );
              if (slot === "Belt") return (
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <rect x="4" y="21" width="44" height="10" rx="4" fill={fill} stroke={stroke} strokeWidth="2"/>
                  <rect x="21" y="18" width="10" height="16" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5"/>
                  <rect x="23" y="22" width="6" height="8" rx="1.5" fill={color} fillOpacity="0.3"/>
                  <rect x="24.5" y="24.5" width="3" height="3" rx="0.75" fill={stroke} fillOpacity="0.7"/>
                  <line x1="4" y1="25" x2="21" y2="25" stroke={stroke} strokeWidth="1" strokeOpacity="0.4"/>
                  <line x1="31" y1="25" x2="48" y2="25" stroke={stroke} strokeWidth="1" strokeOpacity="0.4"/>
                </svg>
              );
              if (slot === "Boots") return (
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <rect x="18" y="8" width="10" height="22" rx="3" fill={fill} stroke={stroke} strokeWidth="2"/>
                  <path d="M18 26 L18 34 Q18 38 22 40 L40 40 Q44 40 44 36 L44 34 Q44 32 42 32 L30 32 Q26 32 26 28 L26 26 Z" fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
                  <rect x="22" y="40" width="22" height="5" rx="2.5" fill={fill} stroke={stroke} strokeWidth="1.5"/>
                  <line x1="18" y1="14" x2="28" y2="14" stroke={stroke} strokeWidth="1.2" strokeOpacity="0.5"/>
                  <line x1="18" y1="19" x2="28" y2="19" stroke={stroke} strokeWidth="1.2" strokeOpacity="0.5"/>
                  <line x1="18" y1="24" x2="28" y2="24" stroke={stroke} strokeWidth="1.2" strokeOpacity="0.5"/>
                </svg>
              );
              return null;
            };

            // Single detailed gear card
            const DetailedGearCard = ({ slotName }) => {
              const slotIdx = GEAR_SLOTS.indexOf(slotName);
              const s = gearData?.slots?.[slotIdx];
              const gearName = SLOT_TO_GEAR(troopType, slotName);
              const tier = s?.status || "Legendary";
              const gearLv = s?.gearCurrent ?? 0;
              const mastery = s?.masteryCurrent ?? 0;
              const isMythic = tier === "Mythic";
              const ringColor = isMythic ? "#B8860B" : "#C0392B";
              const tierColor = isMythic ? C.amber : C.red;
              const stats = gearName ? getGearStats(gearName, tier, gearLv, mastery) : null;

              if (!gearData || !s) return (
                <div style={{background:C.surface,border:`1px dashed ${C.border}`,borderRadius:10,
                  padding:"14px 10px",textAlign:"center",display:"flex",
                  alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6,minHeight:160}}>
                  <div style={{fontSize:20,opacity:0.3}}>+</div>
                  <div style={{fontSize:10,color:C.textDim}}>No {slotName} equipped</div>
                </div>
              );

              return (
                <div onClick={() => setGearStatModal({ slotName, gearName, s })}
                  style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,
                    padding:"12px 10px",textAlign:"center",cursor:"pointer",transition:"border-color 0.15s",
                    display:"flex",flexDirection:"column",alignItems:"center",gap:6}}
                  onMouseEnter={e => e.currentTarget.style.borderColor = ringColor}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  {/* Tier label */}
                  <div style={{fontSize:10,fontWeight:700,color:tierColor,letterSpacing:"0.5px",textTransform:"uppercase"}}>{tier}</div>
                  {/* Ring + icon + level badge */}
                  <div style={{position:"relative",width:72,height:72,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{position:"absolute",inset:0,borderRadius:"50%",
                      border:`2.5px solid ${ringColor}`,opacity:0.75}}/>
                    <div style={{position:"absolute",inset:4,borderRadius:"50%",
                      background:ringColor,opacity:0.08}}/>
                    <SlotIcon slot={slotName} color={ringColor}/>
                    {/* Level badge */}
                    <div style={{position:"absolute",top:-4,right:-4,
                      background:ringColor,color:"#fff",fontSize:10,fontWeight:700,
                      padding:"2px 5px",borderRadius:6,fontFamily:"'Space Mono',monospace",
                      lineHeight:1.2,whiteSpace:"nowrap"}}>
                      +{gearLv}
                    </div>
                  </div>
                  {/* Gear name */}
                  <div style={{fontSize:11,fontWeight:600,color:C.textPri,lineHeight:1.3,
                    fontFamily:"'Space Mono',monospace"}}>{gearName || slotName}</div>
                  {/* Mastery */}
                  <div style={{fontSize:11,color:C.textSec}}>Mastery <span style={{color:C.textPri,fontWeight:700}}>Lv. {mastery}</span></div>
                  {/* Power */}
                  <div style={{fontSize:12,fontWeight:700,color:C.textPri}}>
                    <span style={{marginRight:4}}>👊</span>
                    {stats ? stats.power.toLocaleString() : "—"}
                  </div>
                </div>
              );
            };

            // Simple gear card (original condensed style)
            const SimpleGearCard = ({ slotName }) => {
              const slotIdx = GEAR_SLOTS.indexOf(slotName);
              const s = gearData?.slots?.[slotIdx];
              const statusColor = st => st === "Mythic" ? C.amber : C.red;
              if (!gearData || !s) return (
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
                  padding:"10px 12px",textAlign:"center",minHeight:72,display:"flex",
                  alignItems:"center",justifyContent:"center",flexDirection:"column",gap:4}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>{slotName}</div>
                  <div style={{fontSize:9,color:C.textDim}}>—</div>
                </div>
              );
              return (
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.textDim,fontFamily:"'Space Mono',monospace",marginBottom:6}}>{slotName}</div>
                  <div style={{fontSize:11,fontWeight:700,color:statusColor(s.status),marginBottom:3}}>{s.status || "Legendary"}</div>
                  <div style={{fontSize:11,color:C.textSec}}>Lvl <span style={{color:C.textPri,fontWeight:700}}>{s.gearCurrent ?? 0}</span></div>
                  <div style={{fontSize:11,color:C.textSec}}>Mastery <span style={{color:C.textPri,fontWeight:700}}>{s.masteryCurrent ?? 0}</span></div>
                </div>
              );
            };

            // Single-piece stat modal
            const GearStatModal = ({ slotName, gearName, s, onClose }) => {
              const tier = s?.status || "Legendary";
              const gearLv = s?.gearCurrent ?? 0;
              const mastery = s?.masteryCurrent ?? 0;
              const isATK = GEAR_TYPE[gearName] === "ATK";
              const stats = gearName ? getGearStats(gearName, tier, gearLv, mastery) : null;
              const emps = getUnlockedEmpowerments(gearName, tier, gearLv);
              const isMythic = tier === "Mythic";
              const tierColor = isMythic ? C.amber : C.red;

              return createPortal(
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:10100,
                  display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
                  onClick={e => e.target === e.currentTarget && onClose()}>
                  <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:14,
                    width:"100%",maxWidth:380,maxHeight:"85vh",overflowY:"auto",padding:"20px 18px"}}
                    onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                      <div>
                        <div style={{fontSize:10,fontWeight:700,color:tierColor,textTransform:"uppercase",letterSpacing:"0.5px"}}>{tier}</div>
                        <div style={{fontSize:15,fontWeight:700,color:C.textPri,marginTop:2}}>{gearName || slotName}</div>
                        <div style={{fontSize:11,color:C.textSec,marginTop:2}}>+{gearLv} · Mastery Lv. {mastery} · 👊 {stats?.power?.toLocaleString() ?? "—"}</div>
                      </div>
                      <button onClick={onClose}
                        style={{background:"none",border:"none",color:C.textSec,fontSize:18,cursor:"pointer",padding:"0 4px",lineHeight:1}}>✕</button>
                    </div>

                    {/* Stats */}
                    <div style={{marginBottom:14}}>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",
                        color:C.textDim,fontFamily:"'Space Mono',monospace",marginBottom:8,
                        paddingBottom:5,borderBottom:`1px solid ${C.border}`}}>Gear Stats (Mastery ×{(1+mastery*0.1).toFixed(1)})</div>
                      {stats && [
                        [isATK ? "Hero Attack" : "Hero Defense", stats.heroMain],
                        ["Hero Health", stats.heroHp],
                        [isATK ? "Escort Attack" : "Escort Defense", stats.escMain],
                        ["Escort Health", stats.escHp],
                        [gearName?.split(" ")[0] + (GEAR_TYPE[gearName]==="ATK" ? " Lethality" : " Health"), null, stats.troop + "%"],
                      ].map(([label, val, pct]) => (
                        <div key={label} style={{display:"flex",justifyContent:"space-between",
                          padding:"5px 0",borderBottom:`1px solid ${C.border}40`,fontSize:12}}>
                          <span style={{color:C.textSec}}>{label}</span>
                          <span style={{color:C.textPri,fontWeight:700,fontFamily:"'Space Mono',monospace"}}>
                            {pct ?? Number(val).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Empowerment */}
                    {emps.length > 0 && (
                      <div style={{marginBottom:14}}>
                        <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",
                          color:C.textDim,fontFamily:"'Space Mono',monospace",marginBottom:8,
                          paddingBottom:5,borderBottom:`1px solid ${C.border}`}}>Empowerment Bonuses</div>
                        {emps.map(({ threshold, label, value, unlocked }) => (
                          <div key={threshold} style={{display:"flex",justifyContent:"space-between",
                            alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${C.border}40`,
                            fontSize:12,opacity:unlocked ? 1 : 0.38}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{fontSize:10,fontFamily:"'Space Mono',monospace",
                                color:unlocked ? tierColor : C.textDim,fontWeight:700}}>+{threshold}</span>
                              <span style={{color:unlocked ? C.textSec : C.textDim}}>{label}{!unlocked && " 🔒"}</span>
                            </div>
                            <span style={{color:unlocked ? C.textPri : C.textDim,fontWeight:700,
                              fontFamily:"'Space Mono',monospace"}}>+{value}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* View all stats button */}
                    <button onClick={() => { onClose(); setShowAllStats(true); }}
                      style={{width:"100%",padding:"9px 0",borderRadius:8,fontSize:12,fontWeight:700,
                        cursor:"pointer",border:`1px solid ${C.border}`,background:C.surface,
                        color:C.textSec,fontFamily:"Syne,sans-serif",marginTop:4}}>
                      View all 4 gear stats →
                    </button>
                  </div>
                </div>,
                document.body
              );
            };

            // All-stats table modal
            const AllStatsModal = ({ onClose }) => {
              const pieces = gearSlots.map(slot => {
                const slotIdx = GEAR_SLOTS.indexOf(slot);
                const s = gearData?.slots?.[slotIdx];
                const gearName = SLOT_TO_GEAR(troopType, slot);
                const tier = s?.status || "Legendary";
                const gearLv = s?.gearCurrent ?? 0;
                const mastery = s?.masteryCurrent ?? 0;
                const stats = gearName && s ? getGearStats(gearName, tier, gearLv, mastery) : null;
                const isATK = GEAR_TYPE[gearName] === "ATK";
                return { slot, gearName, tier, gearLv, mastery, stats, isATK };
              });

              const total = pieces.reduce((acc, p) => {
                if (!p.stats) return acc;
                acc.heroMain += p.stats.heroMain;
                acc.heroHp   += p.stats.heroHp;
                acc.escMain  += p.stats.escMain;
                acc.escHp    += p.stats.escHp;
                acc.troop    += p.stats.troop;
                acc.power    += p.stats.power;
                return acc;
              }, { heroMain:0, heroHp:0, escMain:0, escHp:0, troop:0, power:0 });

              const colStyle = { textAlign:"center", padding:"6px 8px", fontSize:11, borderBottom:`1px solid ${C.border}40` };
              const hdStyle  = { ...colStyle, fontSize:10, fontWeight:700, color:C.textSec,
                borderBottom:`1px solid ${C.border}`, paddingBottom:8, verticalAlign:"bottom" };
              const labelStyle = { textAlign:"left", padding:"6px 8px", fontSize:11,
                color:C.textSec, borderBottom:`1px solid ${C.border}40`, whiteSpace:"nowrap" };

              return createPortal(
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:10100,
                  display:"flex",alignItems:"center",justifyContent:"center",padding:12}}
                  onClick={e => e.target === e.currentTarget && onClose()}>
                  <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:14,
                    width:"100%",maxWidth:620,maxHeight:"85vh",overflowY:"auto",padding:"18px 16px"}}
                    onClick={e => e.stopPropagation()}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <div style={{fontSize:14,fontWeight:700,color:C.textPri}}>Full Gear Stats — {hero.name}</div>
                      <button onClick={onClose}
                        style={{background:"none",border:"none",color:C.textSec,fontSize:18,cursor:"pointer",padding:"0 4px",lineHeight:1}}>✕</button>
                    </div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead>
                          <tr>
                            <th style={hdStyle}></th>
                            {pieces.map(p => (
                              <th key={p.slot} style={hdStyle}>
                                <div style={{fontFamily:"'Space Mono',monospace",fontSize:10}}>{p.slot}</div>
                                <div style={{color:p.tier==="Mythic"?C.amber:C.red,fontSize:9,fontWeight:700}}>{p.tier} +{p.gearLv}</div>
                                <div style={{color:C.textDim,fontSize:9}}>M{p.mastery}</div>
                              </th>
                            ))}
                            <th style={{...hdStyle,color:C.accent}}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: "Hero Atk / Def", key: "heroMain" },
                            { label: "Hero Health",     key: "heroHp"   },
                            { label: "Escort Atk / Def",key: "escMain"  },
                            { label: "Escort Health",   key: "escHp"    },
                            { label: "Troop %",         key: "troop", pct: true },
                            { label: "👊 Power",        key: "power"    },
                          ].map(row => (
                            <tr key={row.key}>
                              <td style={labelStyle}>{row.label}</td>
                              {pieces.map(p => (
                                <td key={p.slot} style={{...colStyle,
                                  fontFamily:"'Space Mono',monospace",fontWeight:600,color:C.textPri}}>
                                  {p.stats
                                    ? (row.pct ? p.stats[row.key].toFixed(2)+"%" : p.stats[row.key].toLocaleString())
                                    : <span style={{color:C.textDim}}>—</span>}
                                </td>
                              ))}
                              <td style={{...colStyle,fontFamily:"'Space Mono',monospace",
                                fontWeight:700,color:C.accent}}>
                                {row.pct ? total[row.key].toFixed(2)+"%" : total[row.key].toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>,
                document.body
              );
            };

            return (
              <div style={{marginBottom:20}}>
                {/* Section header with Simple/Detailed toggle */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
                    color:C.textDim,fontFamily:"'Space Mono',monospace"}}>Gear</div>
                  {gearData && (
                    <div style={{display:"flex",gap:4}}>
                      {["simple","detailed"].map(v => (
                        <button key={v} onClick={() => setGearView(v)}
                          style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,
                            cursor:"pointer",fontFamily:"Syne,sans-serif",textTransform:"capitalize",
                            border:`1px solid ${gearView===v ? C.accent : C.border}`,
                            background:gearView===v ? C.accentBg : "transparent",
                            color:gearView===v ? C.accent : C.textSec}}>
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{borderBottom:`1px solid ${C.border}`,marginBottom:10}}/>

                {/* Not equipped message */}
                {!gearData && (
                  <div style={{padding:"14px 16px",background:C.surface,border:`1px solid ${C.border}`,
                    borderRadius:8,textAlign:"center"}}>
                    <div style={{fontSize:12,color:C.textSec,marginBottom:4}}>This hero is not equipped with gear at this time.</div>
                    <div style={{fontSize:11,color:C.textDim}}>Go to the <strong style={{color:C.textSec}}>Hero Gear Calculator</strong> to select this hero.</div>
                  </div>
                )}

                {/* 2×2 gear card grid */}
                {gearData && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {gearSlots.map(slot =>
                      gearView === "detailed"
                        ? <DetailedGearCard key={slot} slotName={slot}/>
                        : <SimpleGearCard   key={slot} slotName={slot}/>
                    )}
                  </div>
                )}

                {/* Single-piece stat modal */}
                {gearStatModal && (
                  <GearStatModal
                    slotName={gearStatModal.slotName}
                    gearName={gearStatModal.gearName}
                    s={gearStatModal.s}
                    onClose={() => setGearStatModal(null)}
                  />
                )}

                {/* All-stats table modal */}
                {showAllStats && <AllStatsModal onClose={() => setShowAllStats(false)} />}
              </div>
            );
          })()}

          {/* Skills */}
          <div style={{marginBottom:20}}>
            {sectionHead("Skills")}
            {(() => {
              const heroSkills = HERO_SKILLS[hero.name] || {};

              // Parse description: bold the Nth value in each [v1 / v2 / v3 / v4 / v5] bracket
              const formatDesc = (desc, level) => {
                if (!desc) return desc;
                const idx = Math.min(Math.max((level||1) - 1, 0), 4);
                return desc.replace(/\[([^\]]+)\]/g, (_, inner) => {
                  const parts = inner.split('/').map(s => s.trim());
                  return parts.map((p, i) =>
                    i === idx
                      ? `<strong style="color:var(--c-accent)">${p}</strong>`
                      : `<span style="opacity:0.55">${p}</span>`
                  ).join('<span style="opacity:0.4"> / </span>');
                });
              };

              // Skill label with clickable name and hover/tap tooltip
              const SkillLabel = ({ field, label }) => {
                const skill = heroSkills[field] || {};
                const level = local[field] || 1;
                const [open, setOpen] = React.useState(false);
                const hasSkill = !!skill.name;
                return (
                  <div style={{position:"relative",display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
                    {hasSkill ? (
                      <>
                        <button
                          onClick={() => setOpen(o => !o)}
                          onMouseEnter={() => setOpen(true)}
                          onMouseLeave={() => setOpen(false)}
                          style={{background:"none",border:"none",padding:0,cursor:"pointer",
                            fontSize:11,fontWeight:700,color:"var(--c-blue)",textAlign:"left",
                            textDecoration:"underline",textDecorationStyle:"dotted",
                            textUnderlineOffset:2,whiteSpace:"nowrap",maxWidth:120,overflow:"hidden",
                            textOverflow:"ellipsis"}}
                          title={skill.name}>
                          {skill.name}
                        </button>
                        {open && skill.desc && (
                          <div style={{position:"absolute",bottom:"calc(100% + 6px)",left:0,zIndex:999,
                            background:"var(--c-card)",border:"1px solid var(--c-borderHi)",
                            borderRadius:8,padding:"10px 12px",width:300,maxWidth:"90vw",
                            boxShadow:"0 8px 32px rgba(0,0,0,0.5)",pointerEvents:"none"}}>
                            <div style={{fontSize:11,fontWeight:700,color:"var(--c-accent)",marginBottom:5}}>
                              {skill.name} <span style={{color:"var(--c-textDim)",fontWeight:400}}>· Lv {level}</span>
                            </div>
                            <div style={{fontSize:11,color:"var(--c-textSec)",lineHeight:1.6}}
                              dangerouslySetInnerHTML={{__html: formatDesc(skill.desc, level)}} />
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{fontSize:12,color:"var(--c-textSec)"}}>{label}</span>
                    )}
                  </div>
                );
              };

              return (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:C.textSec,marginBottom:8}}>Exploration</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {[["S1","expS1"],["S2","expS2"],["S3","expS3"]].map(([label,field]) => (
                        <div key={field} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                          <SkillLabel field={field} label={label} />
                          <select value={local[field]} onChange={e => set(field, Number(e.target.value))} style={sel}>
                            {skillOpts.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:C.textSec,marginBottom:8}}>Expedition</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {[["S1","expdS1"],["S2","expdS2"],["S3","expdS3"]].map(([label,field]) => (
                        <div key={field} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                          <SkillLabel field={field} label={label} />
                          <select value={local[field]} onChange={e => set(field, Number(e.target.value))} style={sel}>
                            {skillOpts.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Power Details */}
          <div style={{marginBottom:20}}>
            {sectionHead("Power Details")}
            {(() => {
              if (!statsMatch) return <DataUnavailable />;
              // Sum gear power from all 4 equipped pieces
              const gearDataForPower = liveGearData;
              const gearSlotNames = ["Goggles","Gloves","Belt","Boots"];
              const gearPowerTotal = gearSlotNames.reduce((sum, slot) => {
                const slotIdx = GEAR_SLOTS.indexOf(slot);
                const s = gearDataForPower?.slots?.[slotIdx];
                const gearName = SLOT_TO_GEAR(hero.type, slot);
                if (!s || !gearName) return sum;
                const gs = getGearStats(gearName, s.status || "Legendary", s.gearCurrent ?? 0, s.masteryCurrent ?? 0);
                return sum + (gs?.power ?? 0);
              }, 0);
              const basePower = (ref.levelPower||0)+(ref.starPower||0)+(ref.skillPower||0)+(isSSR?(ref.gearStrength||0):0);
              const totalPower = basePower + gearPowerTotal;
              return (
                <>
                  <StatRow label="Total Power"    val={totalPower}       isPercent={false} />
                  <StatRow label="Level Power"     val={ref.levelPower}   isPercent={false} />
                  <StatRow label="Star Power"      val={ref.starPower}    isPercent={false} />
                  <StatRow label="Skill Power"     val={ref.skillPower}   isPercent={false} />
                  {isSSR && <StatRow label="Gear Strength" val={ref.gearStrength} isPercent={false} />}
                  {gearPowerTotal > 0 && <StatRow label="Gear Power" val={gearPowerTotal} isPercent={false} />}
                  <StatRow label="Escorts"         val={ref.escorts}     isPercent={false} />
                  <StatRow label="Troop Capacity"  val={ref.troopCap}    isPercent={false} />
                </>
              );
            })()}
          </div>

          {/* Exploration Stats */}
          <div style={{marginBottom:20}}>
            {sectionHead("Exploration Stats")}
            {(() => {
              if (!statsMatch) return <DataUnavailable />;
              // Add gear contributions to base stats
              const gearDataForStats = liveGearData;
              const gearSlotNames = ["Goggles","Gloves","Belt","Boots"];
              let gearHAtk = 0, gearHDef = 0, gearHHp = 0;
              let gearEAtk = 0, gearEDef = 0, gearEHp = 0;
              gearSlotNames.forEach(slot => {
                const slotIdx = GEAR_SLOTS.indexOf(slot);
                const s = gearDataForStats?.slots?.[slotIdx];
                const gearName = SLOT_TO_GEAR(hero.type, slot);
                if (!s || !gearName) return;
                const gs = getGearStats(gearName, s.status || "Legendary", s.gearCurrent ?? 0, s.masteryCurrent ?? 0);
                if (!gs) return;
                const isATK = GEAR_TYPE[gearName] === "ATK";
                if (isATK) { gearHAtk += gs.heroMain; gearEAtk += gs.escMain; }
                else       { gearHDef += gs.heroMain; gearEDef += gs.escMain; }
                gearHHp += gs.heroHp;
                gearEHp += gs.escHp;
              });
              return (
                <>
                  <StatRow label="Hero Attack"    val={(ref.heroAtk||0) + gearHAtk}   isPercent={false} />
                  <StatRow label="Hero Defense"   val={(ref.heroDef||0) + gearHDef}   isPercent={false} />
                  <StatRow label="Hero Health"    val={(ref.heroHp||0)  + gearHHp}    isPercent={false} />
                  <StatRow label="Escort Attack"  val={(ref.escortAtk||0) + gearEAtk} isPercent={false} />
                  <StatRow label="Escort Defense" val={(ref.escortDef||0) + gearEDef} isPercent={false} />
                  <StatRow label="Escort Health"  val={(ref.escortHp||0)  + gearEHp}  isPercent={false} />
                </>
              );
            })()}
          </div>

          {/* Expedition Stats */}
          <div style={{marginBottom:20}}>
            {sectionHead("Expedition Stats")}
            {(() => {
              if (!statsMatch) return <DataUnavailable />;
              const t = hero.type;
              return (
                <>
                  <StatRow label={`${t} Attack`}    val={(ref.infAtk  * 100)} isPercent={true} />
                  <StatRow label={`${t} Defense`}   val={(ref.infDef  * 100)} isPercent={true} />
                  <StatRow label={`${t} Lethality`} val={(ref.infLeth * 100)} isPercent={true} />
                  <StatRow label={`${t} Health`}    val={(ref.infHp   * 100)} isPercent={true} />
                </>
              );
            })()}
          </div>

          {/* Snapshot tag — only when stats match */}
          {ref && ref.level === local.level && ref.stars === local.stars && ref.widget === local.widget && (
            <div style={{marginBottom:16,padding:"8px 12px",background:C.accentBg,
              border:`1px solid ${C.accentDim}`,borderRadius:7,fontSize:11,
              color:C.accent,fontFamily:"'Space Mono',monospace",display:"flex",
              alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span>📊 Reference snapshot</span>
              <span style={{color:C.textDim}}>·</span>
              <span>Stars: {ref.stars}</span>
              <span style={{color:C.textDim}}>·</span>
              <span>Level: {ref.level}</span>
              <span style={{color:C.textDim}}>·</span>
              <span>Widget: {ref.widget}</span>
              <span style={{color:C.textDim,marginLeft:"auto",fontSize:10}}>
                Stats recorded at this snapshot. Submit new data as your hero grows.
              </span>
            </div>
          )}

          {/* Submit success */}
          {submitDone && (
            <div style={{padding:"10px 14px",background:C.greenBg,border:`1px solid ${C.greenDim}`,
              borderRadius:8,fontSize:12,color:C.green,marginBottom:12}}>
              ✓ Stats submitted! They'll appear after admin review.
            </div>
          )}

          {/* Submission status badge — when blocked by pending or accepted */}
          {!submitDone && currentUser && subBlocked && (
            <div style={{padding:"10px 14px",borderRadius:8,fontSize:12,marginBottom:12,
              display:"flex",alignItems:"center",gap:10,
              background: matchingSub.status === "accepted" ? C.greenBg : C.amberBg,
              border: `1px solid ${matchingSub.status === "accepted" ? C.green : C.amber}40`}}>
              <span style={{fontSize:14}}>{matchingSub.status === "accepted" ? "✅" : "⏳"}</span>
              <div>
                <div style={{fontWeight:700,color: matchingSub.status === "accepted" ? C.green : C.amber}}>
                  {matchingSub.status === "accepted" ? "Approved" : "Pending Review"}
                </div>
                <div style={{fontSize:11,color:C.textSec,marginTop:1}}>
                  {matchingSub.status === "accepted"
                    ? "Your stats for this hero at this level/stars/widget have been approved."
                    : "Your submission is awaiting admin review. Change level, stars, or widget to submit a new snapshot."}
                </div>
              </div>
            </div>
          )}

          {/* Submit button — only shown when not blocked */}
          {!showSubmit && currentUser && !subBlocked && (
            <button onClick={() => setShowSubmit(true)}
              style={{fontSize:11,color:C.blue,cursor:"pointer",padding:"5px 12px",borderRadius:6,
                border:`1px solid ${C.blueDim}`,background:C.blueBg,fontFamily:"Syne,sans-serif",fontWeight:700}}>
              📤 Submit {ref ? "Updated" : "Missing"} Stats
            </button>
          )}

          {/* Submit form */}
          {showSubmit && (
            <div onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              style={{marginTop:16,padding:"16px 18px",background:C.surface,
              border:`1px solid ${C.border}`,borderRadius:10}}>
              <div style={{fontSize:13,fontWeight:700,color:C.textPri,marginBottom:4}}>Submit Stats</div>
              <div style={{fontSize:11,color:C.textSec,marginBottom:14}}>
                Recording for: Level {local.level} · Stars {local.stars} · Widget {local.widget}
              </div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
                color:C.textDim,marginBottom:8,fontFamily:"'Space Mono',monospace"}}>Power Details</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                <NumField label="Level Power"  field="levelPower" />
                <NumField label="Star Power"   field="starPower" />
                <NumField label="Skill Power"  field="skillPower" />
                {isSSR && <NumField label="Gear Strength" field="gearStrength" />}
              </div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
                color:C.textDim,marginBottom:8,fontFamily:"'Space Mono',monospace"}}>Exploration</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                <NumField label="Hero Attack"    field="heroAtk" />
                <NumField label="Hero Defense"   field="heroDef" />
                <NumField label="Hero Health"    field="heroHp" />
                <NumField label="Escort Attack"  field="escortAtk" />
                <NumField label="Escort Defense" field="escortDef" />
                <NumField label="Escort Health"  field="escortHp" />
              </div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
                color:C.textDim,marginBottom:8,fontFamily:"'Space Mono',monospace"}}>Expedition (%) — {hero.type}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                <NumField label={`${hero.type} Attack`}    field="infAtk"  isPct />
                <NumField label={`${hero.type} Defense`}   field="infDef"  isPct />
                <NumField label={`${hero.type} Lethality`} field="infLeth" isPct />
                <NumField label={`${hero.type} Health`}    field="infHp"   isPct />
              </div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
                color:C.textDim,marginBottom:8,fontFamily:"'Space Mono',monospace"}}>Widget Stats</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                <NumField label="Hero Attack"    field="wgtHeroAtk" />
                <NumField label="Hero Defense"   field="wgtHeroDef" />
                <NumField label="Hero Health"    field="wgtHeroHp" />
                <NumField label="Escort Attack"  field="wgtEscortAtk" />
                <NumField label="Escort Defense" field="wgtEscortDef" />
                <NumField label="Escort Health"  field="wgtEscortHp" />
                <NumField label="Troop Lethality" field="wgtTroopLeth" isPct />
                <NumField label="Troop Health"   field="wgtTroopHp"   isPct />
              </div>
              {/* Base stats confirmation checkbox */}
              <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",
                background:C.amberBg,border:`1px solid ${C.amber}40`,borderRadius:8,marginBottom:12}}>
                <input type="checkbox" id="baseStatsCheck" checked={baseStatsConfirmed}
                  onChange={e => setBaseStatsConfirmed(e.target.checked)}
                  style={{marginTop:2,accentColor:C.amber,cursor:"pointer",flexShrink:0}} />
                <label htmlFor="baseStatsCheck" style={{fontSize:11,color:C.amber,lineHeight:1.5,cursor:"pointer"}}>
                  I confirm these stats are <strong>base stats only</strong> — recorded without any gear equipped.
                  The only exception is the Widget, which cannot be removed.
                </label>
              </div>

              <div style={{display:"flex",gap:8}}>
                <button onClick={() => { if (baseStatsConfirmed) setShowSubmitConfirm(true); }}
                  disabled={submitting || !baseStatsConfirmed}
                  style={{padding:"8px 18px",borderRadius:7,fontSize:12,fontWeight:700,
                    cursor: baseStatsConfirmed ? "pointer" : "not-allowed",
                    fontFamily:"Syne,sans-serif",border:"none",
                    background: baseStatsConfirmed ? C.blue : C.border,
                    color: baseStatsConfirmed ? "#fff" : C.textDim,
                    opacity: submitting ? 0.6 : 1}}>
                  {submitting ? "Submitting…" : "Submit for Review"}
                </button>
                <button onClick={() => { setShowSubmit(false); setBaseStatsConfirmed(false); }}
                  style={{padding:"8px 14px",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",
                    fontFamily:"Syne,sans-serif",background:"transparent",color:C.textSec,border:`1px solid ${C.border}`}}>
                  Cancel
                </button>
              </div>

              {/* Confirmation overlay */}
              {showSubmitConfirm && createPortal(
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:10200,
                  display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
                  <div onClick={e => e.stopPropagation()}
                    style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:14,
                    width:"100%",maxWidth:400,padding:"24px 20px"}}>
                    <div style={{fontSize:16,fontWeight:700,color:C.textPri,marginBottom:12}}>
                      Confirm Submission
                    </div>
                    <div style={{fontSize:13,color:C.textSec,lineHeight:1.6,marginBottom:8}}>
                      Please confirm before submitting:
                    </div>
                    <div style={{background:C.amberBg,border:`1px solid ${C.amber}40`,borderRadius:8,
                      padding:"12px 14px",marginBottom:20,fontSize:12,color:C.amber,lineHeight:1.6}}>
                      ⚠️ These stats are <strong>base stats only</strong> — recorded with <strong>no gear equipped</strong>.
                      The Widget is the only exception as it cannot be removed from the hero.
                      Submitting stats that include gear bonuses will corrupt the community data.
                    </div>
                    <div style={{display:"flex",gap:10}}>
                      <button onClick={() => { setShowSubmitConfirm(false); handleSubmit(); }}
                        style={{flex:1,padding:"10px 0",borderRadius:8,fontSize:13,fontWeight:700,
                          cursor:"pointer",fontFamily:"Syne,sans-serif",border:"none",
                          background:C.blue,color:"#fff"}}>
                        ✓ Yes, submit
                      </button>
                      <button onClick={() => setShowSubmitConfirm(false)}
                        style={{flex:1,padding:"10px 0",borderRadius:8,fontSize:13,fontWeight:700,
                          cursor:"pointer",fontFamily:"Syne,sans-serif",
                          background:"transparent",color:C.textSec,border:`1px solid ${C.border}`}}>
                        Go back
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Report Issue Modal ───────────────────────────────────────────────────────
const ISSUE_TYPES = [
  "Incorrect Data",
  "Calculation Incorrect",
  "Formatting Issue",
  "Feature Request",
  "Other",
];
const ISSUE_MODULES = [
  "Chief Profile", "Inventory", "Construction", "Chief Gear",
  "Chief Charms", "Experts", "War Academy", "Research",
  "Heroes", "Hero Gear", "Troops", "RFC Planner", "SvS Calendar", "General / Other",
];

function ReportIssueModal({ user, currentPage, onClose }) {
  const C = COLORS;
  const [type,    setType]    = useState("");
  const [module,  setModule]  = useState(() => {
    const pageToModule = {
      "char-profile":"Chief Profile","inventory":"Inventory","construction":"Construction",
      "chief-gear":"Chief Gear","chief-charms":"Chief Charms","experts":"Experts",
      "war-academy":"War Academy","research-center":"Research","heroes":"Heroes",
      "hero-gear":"Hero Gear","troops":"Troops","rfc-planner":"RFC Planner",
      "svs-calendar":"SvS Calendar",
    };
    return pageToModule[currentPage] || "";
  });
  const [desc,    setDesc]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [done,    setDone]    = useState(false);

  const selS = { width:"100%", background:C.card, border:`1px solid ${C.border}`,
    borderRadius:7, color:C.textPri, padding:"8px 10px", fontSize:13,
    fontFamily:"'Space Mono',monospace", outline:"none", cursor:"pointer" };
  const labS = { fontSize:11, fontWeight:700, color:C.textDim,
    letterSpacing:"1px", textTransform:"uppercase",
    fontFamily:"'Space Mono',monospace", marginBottom:5, display:"block" };

  const canSubmit = type && module && desc.trim().length >= 5;

  const handleSubmit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    const ok = await submitIssue({
      user_id:      user?.id || null,
      user_name:    user?.user_metadata?.full_name || user?.email || "Anonymous",
      issue_type:   type,
      module,
      description:  desc.trim(),
    });
    setBusy(false);
    if (ok) setDone(true);
  };

  return createPortal(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:9999,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:14,
        width:"100%",maxWidth:480,boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>

        {/* Header */}
        <div style={{padding:"18px 22px 14px",borderBottom:`1px solid ${C.border}`,
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:C.textPri}}>🚩 Report an Issue</div>
            <div style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace",marginTop:2}}>
              Help us improve — describe what you found
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",
            color:C.textDim,cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
        </div>

        {done ? (
          <div style={{padding:"32px 24px",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:12}}>✅</div>
            <div style={{fontSize:15,fontWeight:700,color:C.textPri,marginBottom:6}}>Issue Submitted</div>
            <div style={{fontSize:12,color:C.textSec,marginBottom:20}}>
              Thanks for the report! We'll review it shortly.
            </div>
            <button onClick={onClose} style={{padding:"8px 24px",borderRadius:7,
              background:C.accentBg,color:C.accent,border:`1px solid ${C.accentDim}`,
              fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Space Mono',monospace"}}>
              Close
            </button>
          </div>
        ) : (
          <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",gap:16}}>
            {/* Type */}
            <div>
              <label style={labS}>Type</label>
              <select value={type} onChange={e=>setType(e.target.value)} style={selS}>
                <option value="">— Select type —</option>
                {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {/* Module */}
            <div>
              <label style={labS}>Module</label>
              <select value={module} onChange={e=>setModule(e.target.value)} style={selS}>
                <option value="">— Select module —</option>
                {ISSUE_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {/* Description */}
            <div>
              <label style={labS}>Brief Description</label>
              <textarea value={desc} onChange={e=>setDesc(e.target.value.slice(0,240))}
                rows={4} maxLength={240} placeholder="Describe the issue (max 240 chars)..."
                style={{width:"100%",boxSizing:"border-box",background:C.card,
                  border:`1px solid ${C.border}`,borderRadius:7,color:C.textPri,
                  padding:"8px 10px",fontSize:12,fontFamily:"inherit",
                  resize:"vertical",outline:"none"}} />
              <div style={{fontSize:10,color:C.textDim,fontFamily:"'Space Mono',monospace",
                textAlign:"right",marginTop:3}}>{desc.length}/240</div>
            </div>
            {/* Submit */}
            <button onClick={handleSubmit} disabled={!canSubmit||busy}
              style={{padding:"10px",borderRadius:7,fontWeight:700,fontSize:13,
                cursor:canSubmit&&!busy?"pointer":"not-allowed",
                fontFamily:"'Space Mono',monospace",transition:"all 0.15s",
                background:canSubmit?C.accentBg:"transparent",
                color:canSubmit?C.accent:C.textDim,
                border:`1px solid ${canSubmit?C.accentDim:C.border}`}}>
              {busy ? "Submitting…" : "Submit Report"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

function AdminPage({ onStatsUpdated }) {
  const C = COLORS;
  const [adminTab,      setAdminTab]      = useState("submissions"); // "submissions" | "issues"
  const [submissions,   setSubmissions]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [note,          setNote]          = useState({});
  const [busy,          setBusy]          = useState({});
  const [validating,    setValidating]    = useState(null);
  const [reviewedOpen,  setReviewedOpen]  = useState(true);

  // Issues state
  const [issues,        setIssues]        = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issueStatus,   setIssueStatus]   = useState({}); // {id: status}
  const [closedOpen,    setClosedOpen]    = useState(false);
  // Close ticket flow
  const [closeTarget,   setCloseTarget]   = useState(null); // issue being closed
  const [closeNote,     setCloseNote]     = useState("");
  const [confirmClose,  setConfirmClose]  = useState(false); // show "are you sure" overlay

  const loadIssues = async () => {
    setIssuesLoading(true);
    const data = await fetchIssues();
    setIssues(data);
    const statusMap = {};
    data.forEach(i => { statusMap[i.id] = i.status || "submitted"; });
    setIssueStatus(statusMap);
    setIssuesLoading(false);
  };

  const handleIssueStatusChange = async (issue, newStatus) => {
    setIssueStatus(p => ({...p, [issue.id]: newStatus}));
    await updateIssue(issue.id, { status: newStatus });
  };

  const handleCloseClick = (issue) => {
    setCloseTarget(issue);
    setCloseNote("");
    setConfirmClose(false);
  };

  const handleCloseConfirm = async () => {
    if (!closeTarget) return;
    const ok = await closeIssue(closeTarget.id, closeNote);
    if (ok) {
      // Send notification to the user who submitted
      if (closeTarget.user_id) {
        await supabase.from("issue_notifications").insert({
          user_id:    closeTarget.user_id,
          issue_id:   closeTarget.id,
          issue_type: closeTarget.issue_type,
          module:     closeTarget.module,
          admin_note: closeNote || "Your issue has been resolved.",
          read:       false,
          created_at: new Date().toISOString(),
        });
      }
      setCloseTarget(null);
      setCloseNote("");
      setConfirmClose(false);
      loadIssues();
    }
  };

  const load = async () => {
    setLoading(true);
    const data = await fetchSubmissions();
    setSubmissions(data);
    setLoading(false);
  };

  const downloadVarianceCSV = (sub) => {
    const variances = sub.stats?.variances || [];
    if (!variances.length) return;
    const header = "Date,Day,Weekday,Tier,Refines,Est RFC,Actual RFC,Variance\n";
    const rows = variances.map(v =>
      `${v.date},${v.day},${v.weekday},${v.tier},${v.refines},${v.estRfc},${v.actualRfc},${v.variance}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rfc-variance-${sub.hero_name.replace(/\s+/g,"-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { load(); loadIssues(); }, []);

  const [handleError, setHandleError] = useState("");

  const handle = async (sub, action) => {
    setHandleError("");
    setBusy(p => ({...p,[sub.id]:true}));
    if (action === "accept") {
      const result = await acceptSubmission(sub, false);
      if (result.needsValidation) {
        setValidating({ sub, existing: result.existing, diffs: result.diffs });
        setBusy(p => ({...p,[sub.id]:false}));
        return;
      }
    } else {
      const { error } = await supabase
        .from("stat_submissions")
        .update({ status: "rejected", admin_note: note[sub.id]||"" })
        .eq("id", sub.id);
      if (error) {
        setHandleError(`Reject failed: ${error.message} (code: ${error.code})`);
        setBusy(p => ({...p,[sub.id]:false}));
        return;
      }
    }
    setBusy(p => ({...p,[sub.id]:false}));
    load();
  };

  const handleForceAccept = async () => {
    if (!validating) return;
    setBusy(p => ({...p,[validating.sub.id]:true}));
    await acceptSubmission(validating.sub, true);
    setBusy(p => ({...p,[validating.sub.id]:false}));
    setValidating(null);
    load();
  };

  const statKeys = ["levelPower","starPower","skillPower","gearStrength","escorts","troopCap",
    "heroAtk","heroDef","heroHp","escortHp","escortDef","escortAtk",
    "infAtk","infDef","infLeth","infHp",
    "wgtHeroAtk","wgtHeroDef","wgtHeroHp","wgtEscortAtk","wgtEscortDef","wgtEscortHp",
    "wgtTroopLeth","wgtTroopHp"];

  const statLabel = k => ({
    levelPower:"Level Power", starPower:"Star Power", skillPower:"Skill Power",
    gearStrength:"Gear Strength", escorts:"Escorts", troopCap:"Troop Cap",
    heroAtk:"Hero Atk", heroDef:"Hero Def", heroHp:"Hero HP",
    escortHp:"Escort HP", escortDef:"Escort Def", escortAtk:"Escort Atk",
    infAtk:"Troop Atk%", infDef:"Troop Def%", infLeth:"Troop Leth%", infHp:"Troop HP%",
    wgtHeroAtk:"Wgt Hero Atk", wgtHeroDef:"Wgt Hero Def", wgtHeroHp:"Wgt Hero HP",
    wgtEscortAtk:"Wgt Escort Atk", wgtEscortDef:"Wgt Escort Def", wgtEscortHp:"Wgt Escort HP",
    wgtTroopLeth:"Wgt Troop Leth%", wgtTroopHp:"Wgt Troop HP%",
  }[k] || k);

  const statusColor = s => s==="accepted" ? C.green : s==="rejected" ? C.red : C.amber;

  // ── Edit Stats modal ────────────────────────────────────────────────────────
  const [editingSub, setEditingSub] = useState(null);   // the stat_submission being corrected
  const [editRow,    setEditRow]    = useState(null);   // the hero_stats_data row
  const [editVals,   setEditVals]   = useState({});     // working copy of stats
  const [editBusy,   setEditBusy]   = useState(false);
  const [editMsg,    setEditMsg]    = useState("");

  const openEdit = async (sub) => {
    setEditMsg("");
    const row = await getHeroStatsFromDB(sub.hero_name, sub.level, sub.stars, sub.widget);
    if (!row) { setEditMsg("No hero_stats_data row found — try Re-process first."); return; }
    setEditRow(row);
    // Show raw stored values exactly as they are in the DB — no conversion
    const vals = {};
    statKeys.forEach(k => {
      const v = row.stats?.[k];
      vals[k] = v != null ? String(v) : "";
    });
    setEditVals(vals);
    setEditingSub(sub);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setEditBusy(true);
    const newStats = { ...(editRow.stats || {}) };
    statKeys.forEach(k => {
      const v = editVals[k];
      if (v === "" || v == null) return;
      newStats[k] = parseFloat(v);
    });

    // 1. Update hero_stats_data
    const { data, error } = await supabase.from("hero_stats_data")
      .update({ stats: newStats })
      .eq("id", editRow.id)
      .select();

    if (error) {
      setEditBusy(false);
      setEditMsg("Error: " + error.message + " (code: " + error.code + ")");
      return;
    }
    if (!data || data.length === 0) {
      setEditBusy(false);
      setEditMsg("⚠ No rows updated — check row ID or RLS policy.");
      return;
    }

    // 2. Update stat_submissions with corrected stats + admin_edited flag
    await supabase.from("stat_submissions")
      .update({
        stats: { ...newStats, _admin_edited: true, _edited_at: new Date().toISOString() },
      })
      .eq("id", editingSub.id);

    setEditBusy(false);
    setEditingSub(null);
    setEditRow(null);
    setEditMsg("");
    onStatsUpdated?.();
    await load();
  };

  return (
    <div className="fade-in" style={{maxWidth:900}}>
      <div className="page-title">Admin <span style={{color:C.accent}}>Panel</span></div>

      {/* Tab toggle */}
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {[
          {id:"submissions", label:"📋 Stat Submissions"},
          {id:"issues",      label:"🚩 Issue Tracking", count: issues.filter(i=>i.status!=="closed").length},
        ].map(tab => (
          <button key={tab.id} type="button"
            onClick={() => setAdminTab(tab.id)}
            style={{padding:"7px 16px",borderRadius:7,fontSize:12,fontWeight:700,
              cursor:"pointer",fontFamily:"Syne,sans-serif",display:"flex",alignItems:"center",gap:6,
              background: adminTab===tab.id ? C.accentBg : "transparent",
              color:      adminTab===tab.id ? C.accent    : C.textSec,
              border:     `1px solid ${adminTab===tab.id ? C.accentDim : C.border}`}}>
            {tab.label}
            {tab.count > 0 && (
              <span style={{background:C.red,color:"#fff",borderRadius:10,
                padding:"1px 6px",fontSize:10,fontWeight:800}}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Stat Submissions ─────────────────────────────────────────── */}
      {adminTab === "submissions" && (<>

      {/* Validation overlay */}
      {validating && createPortal(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:9999,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:14,
            width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",
            boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
            <div style={{padding:"20px 24px 14px",borderBottom:`1px solid ${C.border}`,
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:C.textPri}}>⚠️ Validate Acceptance</div>
                <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace",marginTop:3}}>
                  {validating.sub.hero_name} · Stars {validating.sub.stars} · Level {validating.sub.level} · Widget {validating.sub.widget ?? "N/A"}
                </div>
              </div>
              <button onClick={() => setValidating(null)}
                style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:18}}>✕</button>
            </div>
            <div style={{padding:"16px 24px"}}>
              <p style={{fontSize:12,color:C.amber,marginBottom:16,fontWeight:600}}>
                These values differ from what's currently stored. Review before accepting.
              </p>
              {/* Side-by-side diff table */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0,
                border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",marginBottom:20}}>
                {/* Header */}
                <div style={{background:C.surface,padding:"8px 12px",fontSize:10,fontWeight:700,
                  color:C.textDim,fontFamily:"Space Mono,monospace",letterSpacing:"1px",textTransform:"uppercase"}}>Stat</div>
                <div style={{background:C.surface,padding:"8px 12px",fontSize:10,fontWeight:700,
                  color:C.blue,fontFamily:"Space Mono,monospace",letterSpacing:"1px",textTransform:"uppercase"}}>Current</div>
                <div style={{background:C.surface,padding:"8px 12px",fontSize:10,fontWeight:700,
                  color:C.accent,fontFamily:"Space Mono,monospace",letterSpacing:"1px",textTransform:"uppercase"}}>Submission</div>
                {/* Diff rows */}
                {validating.diffs.map((k,i) => {
                  const curVal = (validating.existing.stats||{})[k];
                  const subVal = (validating.sub.stats||{})[k];
                  const rowBg  = i % 2 === 0 ? C.card : C.surface;
                  return (
                    <React.Fragment key={k}>
                      <div style={{background:rowBg,padding:"7px 12px",fontSize:12,color:C.textSec,
                        borderTop:`1px solid ${C.border}`}}>{statLabel(k)}</div>
                      <div style={{background:rowBg,padding:"7px 12px",fontSize:12,fontWeight:700,
                        color:C.blue,fontFamily:"Space Mono,monospace",borderTop:`1px solid ${C.border}`}}>
                        {curVal ?? "—"}
                      </div>
                      <div style={{background:rowBg,padding:"7px 12px",fontSize:12,fontWeight:700,
                        color:C.accent,fontFamily:"Space Mono,monospace",borderTop:`1px solid ${C.border}`}}>
                        {subVal ?? "—"}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={handleForceAccept}
                  style={{padding:"9px 20px",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",
                    fontFamily:"Syne,sans-serif",border:"none",background:C.green,color:"#0a0c10"}}>
                  ✓ Validate &amp; Accept
                </button>
                <button onClick={() => setValidating(null)}
                  style={{padding:"9px 16px",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",
                    fontFamily:"Syne,sans-serif",background:"transparent",color:C.textSec,
                    border:`1px solid ${C.border}`}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Stats modal */}
      {editingSub && createPortal(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.80)",zIndex:9999,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:14,
            width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",
            boxShadow:"0 24px 80px rgba(0,0,0,0.7)"}}>
            <div style={{padding:"18px 24px 14px",borderBottom:`1px solid ${C.border}`,
              display:"flex",alignItems:"center",justifyContent:"space-between",
              position:"sticky",top:0,background:C.card,zIndex:1}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:C.textPri}}>
                  ✏️ Edit Stats — {editingSub.hero_name}
                </div>
                <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace",marginTop:2}}>
                  Stars: {editingSub.stars} · Level: {editingSub.level} · Widget: {editingSub.widget ?? "N/A"}
                </div>
              </div>
              <button onClick={() => setEditingSub(null)}
                style={{background:"none",border:"none",color:C.textDim,fontSize:20,cursor:"pointer",padding:"4px 8px"}}>✕</button>
            </div>
            <div style={{padding:"18px 24px"}}>
              <div style={{fontSize:11,color:C.amber,marginBottom:14,lineHeight:1.5,
                padding:"8px 12px",background:C.amberBg,borderRadius:6,border:`1px solid ${C.amber}40`}}>
                ⚠ Values are stored as-is. % fields (Troop Atk/Def/Leth/HP) must be entered as <strong>decimals</strong> — e.g. enter <strong>0.2670</strong> for 26.70%. Power and stat fields are raw numbers.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {statKeys.map(k => {
                  const isPct = ["infAtk","infDef","infLeth","infHp","wgtTroopLeth","wgtTroopHp"].includes(k);
                  return (
                    <div key={k}>
                      <div style={{fontSize:11,color:C.textSec,marginBottom:3}}>
                        {statLabel(k)}{isPct && <span style={{fontSize:9,color:C.accent,marginLeft:4}}>(%)</span>}
                      </div>
                      <input type="number" step="any"
                        value={editVals[k] ?? ""}
                        onChange={e => setEditVals(p => ({...p,[k]:e.target.value}))}
                        style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,
                          borderRadius:5,color:C.textPri,padding:"5px 8px",fontSize:11,
                          outline:"none",fontFamily:"Space Mono,monospace",textAlign:"right",
                          boxSizing:"border-box"}} />
                    </div>
                  );
                })}
              </div>
              {editMsg && (
                <div style={{marginTop:12,fontSize:12,color: editMsg.startsWith("✓") ? C.green : C.red,
                  fontFamily:"Space Mono,monospace"}}>{editMsg}</div>
              )}
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <button onClick={saveEdit} disabled={editBusy}
                  style={{padding:"8px 20px",borderRadius:7,fontSize:12,fontWeight:700,
                    cursor:editBusy?"not-allowed":"pointer",fontFamily:"Syne,sans-serif",
                    border:"none",background:C.green,color:"#0a0c10",opacity:editBusy?0.6:1}}>
                  {editBusy ? "Saving…" : "💾 Save Changes"}
                </button>
                <button onClick={() => setEditingSub(null)}
                  style={{padding:"8px 16px",borderRadius:7,fontSize:12,fontWeight:700,
                    cursor:"pointer",fontFamily:"Syne,sans-serif",
                    background:"transparent",color:C.textSec,border:`1px solid ${C.border}`}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {loading && <div style={{color:C.textDim,fontFamily:"Space Mono,monospace",fontSize:12}}>Loading…</div>}
      {handleError && (
        <div style={{padding:"10px 14px",background:C.redBg,border:`1px solid ${C.red}40`,borderRadius:8,
          fontSize:12,color:C.red,marginBottom:16,fontFamily:"Space Mono,monospace"}}>
          ⚠ {handleError}
        </div>
      )}

      {!loading && (() => {
        const pending  = submissions.filter(s => !s.status || s.status === "pending");
        const reviewed = submissions.filter(s => s.status === "accepted" || s.status === "rejected");

        const SubCard = ({ sub, showActions }) => {
          const stats = sub.stats || {};
          const isPending = !sub.status || sub.status === "pending";
          const adminEdited = stats._admin_edited === true;
          // Filter out internal flags from display
          const displayStats = Object.fromEntries(
            Object.entries(stats).filter(([k]) => !k.startsWith("_"))
          );
          return (
            <div style={{background:C.card,
              border:"1px solid " + (isPending ? C.amber+"60" : sub.status==="accepted" ? C.green+"30" : C.red+"30"),
              borderRadius:12,padding:"18px 20px",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:12}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{fontSize:15,fontWeight:800,color:C.textPri}}>{sub.hero_name}</div>
                    {adminEdited && (
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,
                        background:"rgba(56,139,253,0.15)",color:C.blue,
                        border:"1px solid " + C.blue + "40",fontFamily:"Space Mono,monospace"}}>
                        ✏️ Stats edited by admin
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace",marginTop:3}}>
                    Stars: {sub.stars} · Level: {sub.level} · Widget: {sub.widget ?? "N/A"}
                    {" · "}By: {sub.character_name || "Unknown"}
                    {" · "}{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "—"}
                  </div>
                </div>
                <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:5,
                  background: sub.status==="accepted" ? C.greenBg : sub.status==="rejected" ? C.redBg : C.amberBg,
                  color: statusColor(sub.status||"pending"),
                  border:"1px solid " + statusColor(sub.status||"pending") + "40"}}>
                  {(sub.status || "pending").toUpperCase()}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:6,marginBottom:showActions?14:0}}>
                {sub.stats?.type === "rfc_variance" ? (
                  <div style={{gridColumn:"1/-1"}}>
                    <div style={{fontSize:11,color:C.textSec,marginBottom:8,fontFamily:"Space Mono,monospace"}}>
                      RFC Variance Report — {sub.stats.variances?.length || 0} days with variance
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                      {(sub.stats.variances||[]).map((v,i) => (
                        <div key={i} style={{background:C.surface,borderRadius:6,padding:"5px 10px",fontSize:11,fontFamily:"Space Mono,monospace"}}>
                          <span style={{color:C.textDim}}>Day {v.day} {v.weekday.slice(0,3)}</span>
                          <span style={{color:C.textDim,margin:"0 4px"}}>·</span>
                          <span style={{color:C.blue}}>Est:{v.estRfc}</span>
                          <span style={{color:C.textDim,margin:"0 4px"}}>→</span>
                          <span style={{color:v.variance>0?C.green:C.red}}>Act:{v.actualRfc}</span>
                          <span style={{color:v.variance>0?C.green:C.red,marginLeft:4}}>{v.variance>0?"+":""}{v.variance}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => downloadVarianceCSV(sub)}
                      style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",
                        fontFamily:"Syne,sans-serif",border:"1px solid " + C.blue,background:C.blueBg,color:C.blue}}>
                      ⬇ Download CSV
                    </button>
                  </div>
                ) : (
                  statKeys.filter(k => displayStats[k] != null).map(k => (
                    <div key={k} style={{background: adminEdited ? "rgba(56,139,253,0.06)" : C.surface,
                      borderRadius:6,padding:"6px 10px",fontSize:11,
                      border: adminEdited ? "1px solid " + C.blue + "20" : "none"}}>
                      <span style={{color:C.textDim,fontFamily:"Space Mono,monospace"}}>{statLabel(k)}</span>
                      <span style={{color: adminEdited ? C.blue : C.textPri,fontWeight:700,
                        fontFamily:"Space Mono,monospace",float:"right"}}>{displayStats[k]}</span>
                    </div>
                  ))
                )}
              </div>
              {showActions && isPending && (
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:4}}>
                  <button onClick={() => handle(sub,"accept")} disabled={busy[sub.id]}
                    style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:700,
                      cursor:busy[sub.id]?"not-allowed":"pointer",
                      fontFamily:"Syne,sans-serif",border:"none",background:C.green,color:"#0a0c10",
                      opacity:busy[sub.id]?0.6:1}}>
                    {busy[sub.id] ? "…" : "✓ Accept"}
                  </button>
                  <input placeholder="Rejection note (optional)" value={note[sub.id]||""}
                    onChange={e => { const v=e.target.value; setNote(p=>({...p,[sub.id]:v})); }}
                    onBlur={e => setNote(p=>({...p,[sub.id]:e.target.value}))}
                    style={{flex:1,minWidth:160,background:C.surface,border:"1px solid " + C.border,borderRadius:6,
                      padding:"6px 10px",color:C.textPri,fontSize:11,outline:"none",fontFamily:"Space Mono,monospace"}} />
                  <button onClick={() => handle(sub,"reject")} disabled={busy[sub.id]}
                    style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:700,
                      cursor:busy[sub.id]?"not-allowed":"pointer",
                      fontFamily:"Syne,sans-serif",border:"1px solid " + C.redDim,background:C.redBg,color:C.red,
                      opacity:busy[sub.id]?0.6:1}}>
                    {busy[sub.id] ? "…" : "✕ Reject"}
                  </button>
                </div>
              )}
              {!isPending && sub.admin_note && (
                <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace",marginTop:8,
                  padding:"6px 10px",background:C.surface,borderRadius:6}}>
                  Admin note: {sub.admin_note}
                </div>
              )}
              {showActions && sub.status === "accepted" && sub.stats?.type !== "rfc_variance" && (
                <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={async () => {
                    setBusy(p=>({...p,[sub.id]:true}));
                    await acceptSubmission(sub, true);
                    setBusy(p=>({...p,[sub.id]:false}));
                    await load();
                  }} disabled={busy[sub.id]}
                    style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,
                      cursor:busy[sub.id]?"not-allowed":"pointer",
                      fontFamily:"Syne,sans-serif",border:"1px solid " + C.accent,
                      background:C.accentBg,color:C.accent,
                      opacity:busy[sub.id]?0.6:1}}>
                    {busy[sub.id] ? "…" : "🔄 Re-process → hero_stats_data"}
                  </button>
                  <button onClick={() => { setEditMsg(""); openEdit(sub); }}
                    style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"Syne,sans-serif",
                      border:"1px solid " + C.blue,background:C.blueBg,color:C.blue}}>
                    ✏️ Edit Stats
                  </button>
                  {editMsg && !editingSub && (
                    <span style={{fontSize:11,color:C.red,fontFamily:"Space Mono,monospace",alignSelf:"center"}}>{editMsg}</span>
                  )}
                </div>
              )}
            </div>
          );
        };

        return (
          <>
            {/* Pending Review */}
            <div style={{marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
                color:C.amber,fontFamily:"Space Mono,monospace",marginBottom:12}}>
                ⏳ Pending Review ({pending.length})
              </div>
              {pending.length === 0 ? (
                <div style={{padding:"20px",background:C.card,border:"1px solid " + C.border,borderRadius:10,
                  color:C.textDim,fontFamily:"Space Mono,monospace",fontSize:12,textAlign:"center"}}>
                  No pending submissions.
                </div>
              ) : (
                pending.map(sub => <SubCard key={sub.id} sub={sub} showActions={true} />)
              )}
            </div>

            {/* Reviewed — collapsible */}
            {reviewed.length > 0 && (
              <div style={{marginTop:24}}>
                <button onClick={() => setReviewedOpen(o => !o)}
                  style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",
                    cursor:"pointer",padding:"8px 0",marginBottom:12,width:"100%",textAlign:"left"}}>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
                    color:C.textSec,fontFamily:"Space Mono,monospace"}}>
                    📁 Reviewed ({reviewed.length})
                  </span>
                  <span style={{fontSize:12,color:C.textDim,marginLeft:"auto"}}>
                    {reviewedOpen ? "▲ collapse" : "▼ expand"}
                  </span>
                </button>
                {reviewedOpen && reviewed.map(sub => <SubCard key={sub.id} sub={sub} showActions={true} />)}
              </div>
            )}
          </>
        );
      })()}

      </>)} {/* end adminTab === "submissions" */}

      {/* ── Issue Tracking ───────────────────────────────────────────── */}
      {adminTab === "issues" && (() => {
        const open   = issues.filter(i => i.status !== "closed");
        const closed = issues.filter(i => i.status === "closed");
        const statusColors = {
          submitted:    { bg: C.redBg,    color: C.red,    border: C.redDim },
          acknowledged: { bg: C.blueBg,   color: C.blue,   border: C.blueDim },
          in_progress:  { bg: C.amberBg,  color: C.amber,  border: "#7d5a0d" },
          resolved:     { bg: C.greenBg,  color: C.green,  border: C.greenDim },
          closed:       { bg: C.surface,  color: C.textDim,border: C.border },
        };
        const fmtDate = (s) => s ? new Date(s).toLocaleString() : "—";

        return (<>
          {issuesLoading ? (
            <div style={{color:C.textDim,fontSize:12,fontFamily:"'Space Mono',monospace",padding:20}}>
              Loading issues…
            </div>
          ) : open.length === 0 && closed.length === 0 ? (
            <div style={{color:C.textDim,fontSize:12,fontFamily:"'Space Mono',monospace",padding:20}}>
              No issues reported yet.
            </div>
          ) : (
            <>
              {/* Open issues */}
              {open.map(issue => {
                const st = issueStatus[issue.id] || issue.status || "submitted";
                const sc = statusColors[st] || statusColors.submitted;
                return (
                  <div key={issue.id} style={{background:C.card,border:`1px solid ${C.border}`,
                    borderRadius:10,marginBottom:12,overflow:"hidden"}}>
                    {/* Issue header */}
                    <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,
                      display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",
                        color:C.textDim,fontFamily:"'Space Mono',monospace"}}>
                        {issue.issue_type}
                      </span>
                      <span style={{fontSize:11,background:C.accentBg,color:C.accent,
                        border:`1px solid ${C.accentDim}`,borderRadius:4,padding:"1px 7px",fontFamily:"'Space Mono',monospace"}}>
                        {issue.module}
                      </span>
                      <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace",marginLeft:"auto"}}>
                        {issue.user_name} · {fmtDate(issue.submitted_at)}
                      </span>
                    </div>
                    {/* Description */}
                    <div style={{padding:"10px 16px 8px",fontSize:13,color:C.textPri,lineHeight:1.5}}>
                      {issue.description}
                    </div>
                    {/* Status controls */}
                    <div style={{padding:"8px 16px 12px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>STATUS</span>
                      <select value={st}
                        onChange={e => handleIssueStatusChange(issue, e.target.value)}
                        style={{background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:6,
                          color:sc.color,padding:"4px 8px",fontSize:11,fontWeight:700,
                          fontFamily:"'Space Mono',monospace",outline:"none",cursor:"pointer"}}>
                        <option value="submitted">Submitted</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      {st === "resolved" && (
                        <button onClick={() => handleCloseClick(issue)}
                          style={{padding:"4px 14px",borderRadius:6,fontSize:11,fontWeight:700,
                            cursor:"pointer",fontFamily:"'Space Mono',monospace",
                            background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`}}>
                          ✓ Complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Closed issues — collapsible */}
              {closed.length > 0 && (
                <div style={{marginTop:16}}>
                  <button onClick={() => setClosedOpen(o => !o)}
                    style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",
                      cursor:"pointer",padding:"8px 0",marginBottom:8,width:"100%",textAlign:"left"}}>
                    <span style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
                      color:C.textSec,fontFamily:"Space Mono,monospace"}}>
                      📁 Closed Tickets ({closed.length})
                    </span>
                    <span style={{fontSize:12,color:C.textDim,marginLeft:"auto"}}>
                      {closedOpen ? "▲ collapse" : "▼ expand"}
                    </span>
                  </button>
                  {closedOpen && closed.map(issue => (
                    <div key={issue.id} style={{background:C.surface,border:`1px solid ${C.border}`,
                      borderRadius:8,marginBottom:8,padding:"10px 14px",opacity:0.75}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                        <span style={{fontSize:10,color:C.textDim,fontFamily:"'Space Mono',monospace",fontWeight:700}}>
                          {issue.issue_type}
                        </span>
                        <span style={{fontSize:10,color:C.accent,fontFamily:"'Space Mono',monospace"}}>
                          {issue.module}
                        </span>
                        <span style={{fontSize:10,color:C.textDim,fontFamily:"'Space Mono',monospace",marginLeft:"auto"}}>
                          {issue.user_name} · {fmtDate(issue.submitted_at)}
                        </span>
                      </div>
                      <div style={{fontSize:12,color:C.textSec,marginBottom:4}}>{issue.description}</div>
                      {issue.admin_note && (
                        <div style={{fontSize:11,color:C.green,fontFamily:"'Space Mono',monospace",
                          background:C.greenBg,border:`1px solid ${C.greenDim}`,
                          borderRadius:5,padding:"4px 8px",marginTop:4}}>
                          Admin note: {issue.admin_note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Close ticket — notes overlay */}
          {closeTarget && !confirmClose && createPortal(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:9999,
              display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
              <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:12,
                width:"100%",maxWidth:460,boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
                <div style={{padding:"16px 20px 12px",borderBottom:`1px solid ${C.border}`,
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:14,fontWeight:800,color:C.textPri}}>Close Ticket</div>
                  <button onClick={() => setCloseTarget(null)}
                    style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:18}}>✕</button>
                </div>
                <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
                  <label style={{fontSize:11,fontWeight:700,color:C.textDim,
                    letterSpacing:"1px",textTransform:"uppercase",fontFamily:"'Space Mono',monospace"}}>
                    Admin Notes
                  </label>
                  <textarea value={closeNote} onChange={e=>setCloseNote(e.target.value)}
                    rows={4} placeholder="Add a comment about the resolution..."
                    style={{width:"100%",boxSizing:"border-box",background:C.surface,
                      border:`1px solid ${C.border}`,borderRadius:7,color:C.textPri,
                      padding:"8px 10px",fontSize:12,fontFamily:"inherit",
                      resize:"vertical",outline:"none"}} />
                  <button onClick={() => setConfirmClose(true)}
                    style={{padding:"9px",borderRadius:7,fontWeight:700,fontSize:13,
                      cursor:"pointer",fontFamily:"'Space Mono',monospace",
                      background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`}}>
                    Okay
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Confirm close overlay */}
          {closeTarget && confirmClose && createPortal(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:9999,
              display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
              <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:12,
                width:"100%",maxWidth:380,boxShadow:"0 24px 80px rgba(0,0,0,0.6)",padding:"24px 24px"}}>
                <div style={{fontSize:15,fontWeight:800,color:C.textPri,marginBottom:10}}>
                  Close this ticket?
                </div>
                <div style={{fontSize:12,color:C.textSec,marginBottom:20,lineHeight:1.6}}>
                  Are you sure you want to close this ticket? The user will be notified with your note.
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={handleCloseConfirm}
                    style={{flex:1,padding:"9px",borderRadius:7,fontWeight:700,fontSize:13,
                      cursor:"pointer",fontFamily:"'Space Mono',monospace",
                      background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`}}>
                    Yes, Close It
                  </button>
                  <button onClick={() => { setConfirmClose(false); }}
                    style={{flex:1,padding:"9px",borderRadius:7,fontWeight:700,fontSize:13,
                      cursor:"pointer",fontFamily:"'Space Mono',monospace",
                      background:"transparent",color:C.textSec,border:`1px solid ${C.border}`}}>
                    No, Go Back
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>);
      })()}

    </div>
  );
}

function HeroesPage({ genFilter, setGenFilter, heroStats, setHeroStats, currentUser, activeCharacter, hgHeroes, heroStatsVersion }) {
  // Preserve scroll position when heroStats updates (prevents jump-to-top on select change)
  const scrollRef = React.useRef(0);
  const updateStat_raw = (heroName, field, value) => {
    scrollRef.current = window.scrollY;
    setHeroStats(prev => ({
      ...prev,
      [heroName]: { ...(prev[heroName] || defaultHeroStats()), [field]: value },
    }));
  };
  React.useLayoutEffect(() => {
    if (scrollRef.current > 0) {
      window.scrollTo(0, scrollRef.current);
    }
  });
  const [sortBy,      setSortBy]      = useLocalStorage("heroes-sort",      "quality");
  const [favorites,   setFavorites]   = useLocalStorage("heroes-favorites", []);
  const [filterType,  setFilterType]  = useState("");
  const [filterGen,   setFilterGen]   = useState("");
  const [filterName,  setFilterName]  = useState("");
  const [profileHero, setProfileHero] = useState(null);
  const C = COLORS;

  const maxGenIdx = GEN_ORDER.indexOf(genFilter);

  // Apply gen-ceiling filter, then additional filters
  const visible = HERO_ROSTER.filter(h => {
    if (GEN_ORDER.indexOf(h.gen) > maxGenIdx) return false;
    if (filterType && h.type !== filterType) return false;
    if (filterGen  && h.gen  !== filterGen)  return false;
    if (filterName && !h.name.toLowerCase().includes(filterName.toLowerCase())) return false;
    return true;
  });

  const sorted = sortBy === "quality" ? sortHeroesByQuality(visible)
               : sortBy === "type"    ? sortHeroesByType(visible)
               : sortBy === "gen"     ? sortHeroesByGen(visible)
               : sortBy === "hero"    ? sortHeroesByName(visible)
               : sortHeroesByQuality(visible);

  const clearFilters = () => { setFilterType(""); setFilterGen(""); setFilterName(""); };

  // Favorites in same sort order as roster
  const favHeroes = sorted.filter(h => favorites.includes(h.name));

  const updateStat = updateStat_raw;

  const toggleFavorite = (heroName) => {
    setFavorites(prev => {
      if (prev.includes(heroName)) return prev.filter(n => n !== heroName);
      if (prev.length >= 6) return prev; // max 6
      return [...prev, heroName];
    });
  };

  const setAllStarsMax = () => {
    setHeroStats(prev => {
      const next = { ...prev };
      visible.forEach(h => {
        next[h.name] = { ...(next[h.name] || defaultHeroStats()), stars: 5 };
      });
      return next;
    });
  };

  const setAllLevelsMax = () => {
    setHeroStats(prev => {
      const next = { ...prev };
      visible.forEach(h => {
        next[h.name] = { ...(next[h.name] || defaultHeroStats()), level: 80 };
      });
      return next;
    });
  };

  const setAllSkillsMax = () => {
    setHeroStats(prev => {
      const next = { ...prev };
      visible.forEach(h => {
        next[h.name] = { ...(next[h.name] || defaultHeroStats()), expS1:5, expS2:5, expS3:5, expdS1:5, expdS2:5, expdS3:5 };
      });
      return next;
    });
  };

  const qualityColor = q => q === "SSR" ? C.accent : q === "SR" ? C.blue : C.textSec;
  const typeColor    = t => t === "Infantry" ? C.green : t === "Lancer" ? C.blue : C.amber;

  const sel = {
    background:C.card, border:`1px solid ${C.border}`, borderRadius:5,
    color:C.textPri, fontSize:11, padding:"2px 4px",
    fontFamily:"'Space Mono',monospace", outline:"none", cursor:"pointer",
  };
  const thS = {
    padding:"8px 10px", fontSize:10, fontWeight:700, letterSpacing:"1px",
    textTransform:"uppercase", color:C.textDim,
    borderBottom:`1px solid ${C.border}`, background:C.surface, whiteSpace:"nowrap",
  };
  const tdS = { padding:"6px 10px", borderBottom:`1px solid ${C.border}`, fontSize:12, color:C.textSec, verticalAlign:"middle" };

  const skillOpts  = Array.from({length:6},  (_,i) => i);
  const levelOpts  = Array.from({length:81}, (_,i) => i);
  const widgetOpts = Array.from({length:11}, (_,i) => i);

  const btnStyle = (active) => ({
    padding:"6px 12px", borderRadius:6, fontSize:11, fontWeight:700,
    cursor:"pointer", fontFamily:"Syne,sans-serif", border:"none",
    background: active ? C.accent : C.card,
    color: active ? "#0a0c10" : C.textSec,
    transition:"all 0.15s",
  });

  // Reusable hero table rows
  const HeroRow = ({ hero, isFav, idx }) => {
    const stats = heroStats[hero.name] || defaultHeroStats();
    const isFavorited = favorites.includes(hero.name);
    const rowBg = isFav
      ? `rgba(227,107,26,0.06)`
      : idx % 2 === 0 ? "transparent" : "var(--c-surface)";
    return (
      <tr key={hero.name} style={{background: rowBg}}>
        {/* Favorite star */}
        <td style={{...tdS,width:28,textAlign:"center",padding:"6px 4px"}}>
          <span
            onClick={() => toggleFavorite(hero.name)}
            title={isFavorited ? "Remove from favorites" : favorites.length >= 6 ? "Max 6 favorites" : "Add to favorites"}
            style={{
              cursor: !isFavorited && favorites.length >= 6 ? "not-allowed" : "pointer",
              fontSize:14, color: isFavorited ? C.accent : C.textDim,
              opacity: !isFavorited && favorites.length >= 6 ? 0.3 : 1,
              userSelect:"none",
            }}>
            ★
          </span>
        </td>
        {/* Clickable hero name */}
        <td style={{...tdS,fontWeight:700,color:C.accent,whiteSpace:"nowrap",cursor:"pointer",textDecoration:"underline",textDecorationStyle:"dotted",textUnderlineOffset:3}}
          onClick={() => setProfileHero(hero)}
          title="View hero profile">
          {hero.name}
        </td>
        <td style={{...tdS,color:typeColor(hero.type),fontWeight:600}}>{hero.type}</td>
        <td style={{...tdS,color:C.textDim,fontFamily:"'Space Mono',monospace",fontSize:10}}>{hero.gen}</td>
        <td style={{...tdS,fontWeight:700,color:qualityColor(hero.quality)}}>{hero.quality}</td>
        {/* Stars */}
        <td style={{...tdS,textAlign:"center"}}>
          <select value={stats.stars ?? 0} onChange={e => updateStat(hero.name,"stars",parseFloat(e.target.value))} style={sel}>
            {STAR_OPTS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </td>
        {/* Level */}
        <td style={{...tdS,textAlign:"center"}}>
          <select value={stats.level} onChange={e => updateStat(hero.name,"level",Number(e.target.value))} style={sel}>
            {levelOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </td>
        {/* Widget — now before skills */}
        <td style={{...tdS,textAlign:"center"}}>
          {hero.quality === "SSR" ? (
            <select value={stats.widget} onChange={e => updateStat(hero.name,"widget",Number(e.target.value))} style={sel}>
              {widgetOpts.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : (
            <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>N/A</span>
          )}
        </td>
        {["expS1","expS2","expS3"].map(f => (
          <td key={f} style={{...tdS,textAlign:"center"}}>
            <select value={stats[f]} onChange={e => updateStat(hero.name,f,Number(e.target.value))} style={sel}>
              {skillOpts.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </td>
        ))}
        {["expdS1","expdS2","expdS3"].map(f => (
          <td key={f} style={{...tdS,textAlign:"center"}}>
            <select value={stats[f]} onChange={e => updateStat(hero.name,f,Number(e.target.value))} style={sel}>
              {skillOpts.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </td>
        ))}
      </tr>
    );
  };

  const sortableThS = (col) => ({
    ...thS,
    cursor: "pointer",
    color: sortBy === col ? C.accent : C.textDim,
    userSelect: "none",
  });

  const SortLabel = ({ col, label }) => (
    <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
      {label}
      <span style={{fontSize:9, opacity: sortBy === col ? 1 : 0.3}}>▼</span>
    </span>
  );

  const TableHeader = () => (
    <thead>
      <tr>
        <th style={{...thS,width:28,padding:"8px 4px"}}/>
        <th style={sortableThS("hero")} onClick={() => setSortBy("hero")}>
          <SortLabel col="hero" label="Hero" />
        </th>
        <th style={sortableThS("type")} onClick={() => setSortBy("type")}>
          <SortLabel col="type" label="Type" />
        </th>
        <th style={sortableThS("gen")} onClick={() => setSortBy("gen")}>
          <SortLabel col="gen" label="Gen" />
        </th>
        <th style={sortableThS("quality")} onClick={() => setSortBy("quality")}>
          <SortLabel col="quality" label="Quality" />
        </th>
        <th style={thS}>Stars</th>
        <th style={thS}>Level</th>
        <th style={thS}>Widget</th>
        <th style={{...thS,textAlign:"center"}} colSpan={3}>Exploration Skills</th>
        <th style={{...thS,textAlign:"center"}} colSpan={3}>Expedition Skills</th>
      </tr>
      <tr>
        {Array(8).fill(null).map((_,i) => <th key={i} style={{...thS,paddingTop:2,paddingBottom:6}}/>)}
        {["S1","S2","S3","S1","S2","S3"].map((s,i) => (
          <th key={i} style={{...thS,paddingTop:2,paddingBottom:6,textAlign:"center",fontSize:9}}>{s}</th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div className="fade-in">

      {/* Hero Profile Modal */}
      {profileHero && (
        <HeroProfileModal
          hero={profileHero}
          stats={heroStats[profileHero.name] || defaultHeroStats()}
          onUpdate={updateStat}
          onClose={() => setProfileHero(null)}
          currentUser={currentUser}
          activeCharacter={activeCharacter}
          hgHeroes={hgHeroes}
          externalRefreshKey={heroStatsVersion}
        />
      )}

      {/* Controls bar */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          {/* Gen ceiling filter */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>Up to</span>
            <select value={genFilter} onChange={e => setGenFilter(e.target.value)} style={{...sel,fontSize:12,padding:"4px 8px"}}>
              {GEN_ORDER.map(g => <option key={g} value={g}>{g} &amp; below</option>)}
            </select>
          </div>
          {/* Filter by type */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>Type</span>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{...sel,fontSize:12,padding:"4px 8px"}}>
              <option value="">All</option>
              <option value="Infantry">Infantry</option>
              <option value="Lancer">Lancer</option>
              <option value="Marksman">Marksman</option>
            </select>
          </div>
          {/* Filter by specific gen */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>Gen</span>
            <select value={filterGen} onChange={e => setFilterGen(e.target.value)} style={{...sel,fontSize:12,padding:"4px 8px"}}>
              <option value="">All</option>
              {GEN_ORDER.filter(g => GEN_ORDER.indexOf(g) <= GEN_ORDER.indexOf(genFilter)).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          {/* Hero name search */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>Hero</span>
            <input
              type="text"
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              placeholder="Search…"
              style={{...sel,fontSize:12,padding:"4px 8px",width:100,outline:"none"}}
            />
          </div>
          {/* Sort */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>Sort</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{...sel,fontSize:12,padding:"4px 8px"}}>
              <option value="quality">Quality</option>
              <option value="type">Troop Type</option>
              <option value="gen">Generation</option>
              <option value="hero">Hero Name</option>
            </select>
          </div>
          {/* Clear filters */}
          {(filterType || filterGen || filterName) && (
            <button onClick={clearFilters}
              style={{fontSize:11,color:C.red,cursor:"pointer",padding:"4px 8px",borderRadius:5,
                border:`1px solid ${C.redDim}`,background:C.redBg,fontFamily:"'Space Mono',monospace"}}>
              ✕ Clear filters
            </button>
          )}
          {/* Result count */}
          <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>
            {sorted.length} hero{sorted.length !== 1 ? "es" : ""}
          </span>
        </div>
        {/* Set-all buttons */}
        <div style={{display:"flex",gap:8}}>
          <button style={btnStyle(false)} onClick={setAllStarsMax}>Set All Stars → 5</button>
          <button style={btnStyle(false)} onClick={setAllLevelsMax}>Set All Levels → 80</button>
          <button style={btnStyle(false)} onClick={setAllSkillsMax}>Set All Skills → 5</button>
        </div>
      </div>

      {/* Favorites table */}
      {favHeroes.length > 0 && (
        <div className="card" style={{marginBottom:16}}>
          <div className="card-header">
            <div className="card-title">★ Favorites ({favHeroes.length}/6)</div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <TableHeader />
              <tbody>
                {favHeroes.map((hero, idx) => <HeroRow key={hero.name} hero={hero} isFav={true} idx={idx} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full roster table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Hero Roster</div>
          <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>
            Click ★ to favorite (max 6)
          </span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <TableHeader />
            <tbody>
              {sorted.map((hero, idx) => <HeroRow key={hero.name} hero={hero} isFav={false} idx={idx} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── HeroGearPage ─────────────────────────────────────────────────────────────

function HeroGearPage({ inv, genFilter, setGenFilter, heroStats, setHeroStats, hgHeroes, setHgHeroes }) {
  const heroData    = hgHeroes;
  const setHeroData = setHgHeroes;

  // Currently selected hero names per slot (for deduplication)
  const selectedHeroes = heroData.map(h => h.hero);

  // Update a specific hero slot's hero selection
  const setHero = (slotIdx, heroName) => {
    setHeroData(prev => prev.map((h, i) =>
      i === slotIdx ? { ...h, hero: heroName } : h
    ));
  };

  // Update a gear slot field with goal-floor enforcement + widget sync to heroStats
  const setSlotField = (heroIdx, slotIdx, field, value) => {
    setHeroData(prev => prev.map((h, hi) => {
      if (hi !== heroIdx) return h;

      // Widget sync: if setting widgetCurrent, also update heroStats for this hero
      if (field === "widgetCurrent" && slotIdx === 4) {
        const heroName = h.hero;
        if (heroName) {
          setHeroStats(ps => ({
            ...ps,
            [heroName]: { ...(ps[heroName] || defaultHeroStats()), widget: value },
          }));
        }
      }

      return {
        ...h,
        slots: h.slots.map((s, si) => {
          if (si !== slotIdx) return s;
          const isWidget   = si === 4;
          const isLegendary = s.status === "Legendary";
          const locked = isWidget || isLegendary;

          let updated = { ...s, [field]: value };

          // When setting gearCurrent, sync gearGoal to match if goal was <= old current
          // (goal was "tracking" current — keep it in sync). Works for both Mythic and Legendary.
          if (field === "gearCurrent") {
            const oldCur = s.gearCurrent ?? 0;
            const oldGoal = s.gearGoal ?? 0;
            if (oldGoal <= oldCur) updated.gearGoal = value; // goal was at or below current — follow it
            else if (isLegendary && (updated.gearGoal ?? 0) < value) updated.gearGoal = value; // Legendary floor
          }
          // When setting masteryCurrent, sync masteryGoal similarly
          if (field === "masteryCurrent" && !isWidget) {
            const oldCurM = s.masteryCurrent ?? 0;
            const oldGoalM = s.masteryGoal ?? 0;
            if (oldGoalM <= oldCurM) updated.masteryGoal = value;
            else if (isLegendary && (updated.masteryGoal ?? 0) < value) updated.masteryGoal = value;
          }
          // If widgetCurrent is set above widgetGoal, clamp goal up to match
          if (field === "widgetCurrent" && isWidget) {
            if ((updated.widgetGoal ?? 0) < value) updated.widgetGoal = value;
          }
          // Prevent gear goal from being set below current for locked slots
          if (field === "gearGoal" && locked) {
            updated.gearGoal = Math.max(value, s.gearCurrent ?? 0);
          }
          if (field === "masteryGoal" && isLegendary && !isWidget) {
            updated.masteryGoal = Math.max(value, s.masteryCurrent ?? 0);
          }
          if (field === "widgetGoal" && isWidget) {
            updated.widgetGoal = Math.max(value, s.widgetCurrent ?? 0);
          }
          // If switching status, also update goalStatus to match
          if (field === "status") {
            updated.goalStatus = value;
            // When switching to Legendary, sync goals to current as floor
            if (value === "Legendary") {
              if ((updated.gearGoal ?? 0) < (updated.gearCurrent ?? 0))
                updated.gearGoal = updated.gearCurrent ?? 0;
              if ((updated.masteryGoal ?? 0) < (updated.masteryCurrent ?? 0))
                updated.masteryGoal = updated.masteryCurrent ?? 0;
            }
          }
          return updated;
        }),
      };
    }));
  };

  // Filter heroes for a given type by cumulative generation
  const filteredHeroes = (type, currentSlotIdx) => {
    const maxGenIdx = GEN_ORDER.indexOf(genFilter);
    // Heroes selected in OTHER slots of the same type
    const usedByOthers = HERO_SLOTS
      .map((s, i) => i !== currentSlotIdx && s.type === type ? selectedHeroes[i] : null)
      .filter(Boolean);
    return HERO_ROSTER.filter(h =>
      h.type === type &&
      GEN_ORDER.indexOf(h.gen) <= maxGenIdx &&
      !usedByOthers.includes(h.name)
    );
  };

  // Totals across all slots
  const totals = useMemo(() => {
    let stones = 0, mithril = 0, mythic = 0;
    heroData.forEach(h => {
      h.slots.forEach((s, si) => {
        if (si === 4) return; // Widget — no costs
        const isLeg = s.status === "Legendary";
        const gc    = calcGearCosts(s.gearCurrent, s.gearGoal, isLeg);
        const mc    = calcMasteryCosts(s.masteryCurrent, s.masteryGoal);
        stones  += mc.stones;
        mithril += gc.mithril;
        mythic  += gc.mythic + mc.mythic;
      });
    });
    return { stones, mithril, mythic };
  }, [heroData]);

  // Number dropdowns
  const gearOpts    = Array.from({length:101}, (_,i) => i); // 0-100
  const masteryOpts = Array.from({length:21},  (_,i) => i); // 0-20
  const widgetOpts  = Array.from({length:11},  (_,i) => i); // 0-10

  const C = COLORS;
  const sel = { background:C.card, border:`1px solid ${C.border}`, borderRadius:5,
                color:C.textPri, fontSize:11, padding:"2px 4px", fontFamily:"'Space Mono',monospace",
                outline:"none", cursor:"pointer" };
  const thStyle = { padding:"8px 10px", fontSize:10, fontWeight:700, letterSpacing:"1px",
                    textTransform:"uppercase", color:C.textDim, borderBottom:`1px solid ${C.border}`,
                    whiteSpace:"nowrap", background:C.surface };
  const tdStyle = { padding:"6px 10px", borderBottom:`1px solid ${C.border}`,
                    fontSize:12, color:C.textSec, verticalAlign:"middle" };
  const tdMono  = { ...tdStyle, fontFamily:"'Space Mono',monospace", textAlign:"right" };

  return (
    <div className="fade-in">

      {/* Summary tiles */}
      <div className="stat-grid" style={{marginBottom:20}}>
        <StatCard label="Stones needed"  value={totals.stones}  sub={`have ${(inv.stones ?? 0).toLocaleString()}`}  color={totals.stones  > (inv.stones  ?? 0) ? "red" : undefined} />
        <StatCard label="Mithril needed" value={totals.mithril} sub={`have ${(inv.mithril ?? 0).toLocaleString()}`} color={totals.mithril > (inv.mithril ?? 0) ? "red" : undefined} />
        <StatCard label="Mythic needed"  value={totals.mythic}  sub={`have ${(inv.mythicGear ?? 0).toLocaleString()}`} color={totals.mythic > (inv.mythicGear ?? 0) ? "red" : undefined} />
      </div>

      <div className="card">
        <div className="card-header" style={{flexWrap:"wrap",gap:12}}>
          <div className="card-title">Hero Gear Upgrade Calculator</div>

          {/* Generation filter */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>Generation filter</span>
            <select value={genFilter} onChange={e => setGenFilter(e.target.value)} style={{...sel,fontSize:12,padding:"4px 8px"}}>
              {GEN_ORDER.map(g => <option key={g} value={g}>{g} &amp; below</option>)}
            </select>
          </div>
        </div>

        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Hero</th>
                <th style={thStyle}>Slot</th>
                <th style={thStyle}>Gear Status</th>
                <th style={{...thStyle,textAlign:"center"}} colSpan={2}>Current</th>
                <th style={{...thStyle,textAlign:"center"}} colSpan={3}>Goal</th>
                <th style={{...thStyle,textAlign:"right"}}>Stones</th>
                <th style={{...thStyle,textAlign:"right"}}>Mithril</th>
                <th style={{...thStyle,textAlign:"right"}}>Mythic Needed</th>
                <th style={{...thStyle,textAlign:"right"}}>SVS PTS</th>
              </tr>
              <tr>
                <th style={{...thStyle,paddingTop:2,paddingBottom:6}} colSpan={4}/>
                <th style={{...thStyle,paddingTop:2,paddingBottom:6,textAlign:"center",color:C.textDim,fontSize:9}}>Gear Lvl</th>
                <th style={{...thStyle,paddingTop:2,paddingBottom:6,textAlign:"center",color:C.textDim,fontSize:9}}>Mastery Lvl</th>
                <th style={{...thStyle,paddingTop:2,paddingBottom:6,textAlign:"center",color:C.textDim,fontSize:9}}>Status</th>
                <th style={{...thStyle,paddingTop:2,paddingBottom:6,textAlign:"center",color:C.textDim,fontSize:9}}>Gear Lvl</th>
                <th style={{...thStyle,paddingTop:2,paddingBottom:6,textAlign:"center",color:C.textDim,fontSize:9}}>Mastery Lvl</th>
                <th style={{...thStyle,paddingTop:2,paddingBottom:6}} colSpan={4}/>
              </tr>
            </thead>
            <tbody>
              {HERO_SLOTS.map((slot, heroIdx) => {
                const hd      = heroData[heroIdx] || defaultHeroState(slot.type);
                const heroes  = filteredHeroes(slot.type, heroIdx);
                // ensure selected hero is still valid after gen filter change
                const heroVal = heroes.find(h => h.name === hd.hero) ? hd.hero : (heroes[0]?.name ?? "");

                // Sync widget current from heroStats if available
                const heroStatsForSlot = heroStats?.[heroVal] || defaultHeroStats();

                return GEAR_SLOTS.map((gearSlot, slotIdx) => {
                  const s        = hd.slots[slotIdx] || {};
                  const isWidget = slotIdx === 4;
                  const isLeg    = s.status === "Legendary";

                  // Calculated costs
                  const gc = isWidget ? {mithril:0,mythic:0}
                           : calcGearCosts(s.gearCurrent ?? 0, s.gearGoal ?? 0, isLeg);
                  const mc = isWidget ? {stones:0,mythic:0}
                           : calcMasteryCosts(s.masteryCurrent ?? 0, s.masteryGoal ?? 0);                  const rowStones  = mc.stones;
                  const rowMithril = gc.mithril;
                  const rowMythic  = gc.mythic + mc.mythic;

                  const typeColor = slot.type === "Infantry" ? C.green
                                  : slot.type === "Lancer"   ? C.blue
                                  : C.amber;

                  return (
                    <React.Fragment key={`${slot.slotId}-${gearSlot}`}>
                    <tr style={{background: slotIdx % 2 === 0 ? "transparent" : "var(--c-surface)"}}>

                      {/* Type — only on first row of each hero */}
                      {slotIdx === 0 && (
                        <td rowSpan={5} style={{...tdStyle,verticalAlign:"middle",fontWeight:700,color:typeColor,width:80,whiteSpace:"nowrap"}}>
                          {slot.label}
                        </td>
                      )}

                      {/* Hero dropdown — only on first row */}
                      {slotIdx === 0 && (
                        <td rowSpan={5} style={{...tdStyle,verticalAlign:"middle",minWidth:100,maxWidth:150}}>
                          <select value={heroVal}
                            onChange={e => setHero(heroIdx, e.target.value)}
                            style={{...sel,width:"100%"}}>
                            {heroes.map(h => <option key={h.name} value={h.name}>{h.name}</option>)}
                          </select>
                        </td>
                      )}

                      {/* Slot name */}
                      <td style={{...tdStyle,color:C.textPri,fontWeight:600}}>{gearSlot}</td>

                      {/* Gear Status dropdown (slots 1-4 only) */}
                      <td style={{...tdStyle,width:110}}>
                        {!isWidget ? (
                          <select value={s.status ?? "Legendary"}
                            onChange={e => setSlotField(heroIdx, slotIdx, "status", e.target.value)}
                            style={sel}>
                            <option value="Legendary">Legendary</option>
                            <option value="Mythic">Mythic</option>
                          </select>
                        ) : <span style={{color:C.textDim}}>—</span>}
                      </td>

                      {/* Current: Gear Level */}
                      <td style={{...tdStyle,width:80,textAlign:"center"}}>
                        {isWidget ? (
                          <select value={heroStatsForSlot.widget}
                            onChange={e => setSlotField(heroIdx, slotIdx, "widgetCurrent", Number(e.target.value))}
                            style={sel}>
                            {widgetOpts.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        ) : (
                          <select value={s.gearCurrent ?? 0}
                            onChange={e => setSlotField(heroIdx, slotIdx, "gearCurrent", Number(e.target.value))}
                            style={sel}>
                            {gearOpts.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        )}
                      </td>

                      {/* Current: Mastery Level (slots 1-4 only) */}
                      <td style={{...tdStyle,width:80,textAlign:"center"}}>
                        {!isWidget ? (
                          <select value={s.masteryCurrent ?? 0}
                            onChange={e => setSlotField(heroIdx, slotIdx, "masteryCurrent", Number(e.target.value))}
                            style={sel}>
                            {masteryOpts.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        ) : <span style={{color:C.textDim}}>—</span>}
                      </td>

                      {/* Goal: Status */}
                      <td style={{...tdStyle,width:110}}>
                        {!isWidget ? (
                          <select value={s.goalStatus ?? s.status ?? "Mythic"}
                            onChange={e => setSlotField(heroIdx, slotIdx, "goalStatus", e.target.value)}
                            style={sel}>
                            <option value="Mythic">Mythic</option>
                            <option value="Legendary">Legendary</option>
                          </select>
                        ) : <span style={{color:C.textDim}}>—</span>}
                      </td>

                      {/* Goal: Gear Level */}
                      <td style={{...tdStyle,width:80,textAlign:"center"}}>
                        {isWidget ? (
                          <select value={s.widgetGoal ?? 0}
                            onChange={e => setSlotField(heroIdx, slotIdx, "widgetGoal", Number(e.target.value))}
                            style={sel}>
                            {widgetOpts.filter(v => v >= (heroStatsForSlot.widget ?? 0)).map(v =>
                              <option key={v} value={v}>{v}</option>)}
                          </select>
                        ) : (
                          <select value={s.gearGoal ?? 0}
                            onChange={e => setSlotField(heroIdx, slotIdx, "gearGoal", Number(e.target.value))}
                            style={sel}>
                            {gearOpts
                              .filter(v => isLeg ? v >= (s.gearCurrent ?? 0) : true)
                              .map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        )}
                      </td>

                      {/* Goal: Mastery Level (slots 1-4 only) */}
                      <td style={{...tdStyle,width:80,textAlign:"center"}}>
                        {!isWidget ? (
                          <select value={s.masteryGoal ?? 0}
                            onChange={e => setSlotField(heroIdx, slotIdx, "masteryGoal", Number(e.target.value))}
                            style={sel}>
                            {masteryOpts
                              .filter(v => isLeg ? v >= (s.masteryCurrent ?? 0) : true)
                              .map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        ) : <span style={{color:C.textDim}}>—</span>}
                      </td>

                      {/* Stones */}
                      <td style={{...tdMono,color: rowStones > 0 ? C.blue : C.textDim}}>
                        {rowStones > 0 ? rowStones.toLocaleString() : "—"}
                      </td>

                      {/* Mithril */}
                      <td style={{...tdMono,color: rowMithril > 0 ? C.accent : C.textDim}}>
                        {rowMithril > 0 ? rowMithril.toLocaleString() : "—"}
                      </td>

                      {/* Mythic Needed */}
                      <td style={{...tdMono,color: rowMythic > 0 ? C.green : C.textDim}}>
                        {rowMythic > 0 ? rowMythic.toLocaleString() : "—"}
                      </td>

                      {/* SVS PTS */}
                      <td style={{...tdMono,color:C.textDim}}>—</td>
                    </tr>
                    {/* Stat sub-row — only shown when gear/mastery/widget level changed */}
                    {(() => {
                      const gearChanged    = !isWidget && (s.gearCurrent ?? 0) !== (s.gearGoal ?? 0);
                      const masteryChanged = !isWidget && (s.masteryCurrent ?? 0) !== (s.masteryGoal ?? 0);
                      const statusChanged  = !isWidget && (s.goalStatus ?? s.status ?? "Mythic") !== (s.status ?? "Mythic");
                      const widgetChanged  = isWidget && (heroStatsForSlot.widget ?? 0) !== (s.widgetGoal ?? 0);
                      if (!gearChanged && !masteryChanged && !statusChanged && !widgetChanged) return null;

                      // Calculate current and goal stats using GearData lookup
                      const gearName  = !isWidget ? SLOT_TO_GEAR(slot.type, gearSlot) : null;
                      const curTier   = s.status    || "Mythic";
                      const goalTier  = s.goalStatus || curTier;   // use goalStatus for goal lookup
                      const curLv     = s.gearCurrent  ?? 0;
                      const goalLv    = s.gearGoal      ?? 0;
                      const curM      = s.masteryCurrent ?? 0;
                      const goalM     = s.masteryGoal    ?? 0;

                      const STAT_LABELS = ["Gear Pwr", GEAR_TYPE[gearName]==="ATK" ? "Hero Atk" : "Hero Def", "Hero HP", GEAR_TYPE[gearName]==="ATK" ? "Esc Atk" : "Esc Def", "Esc HP", GEAR_TYPE[gearName]==="ATK" ? "Trp Leth" : "Trp HP", "Trp Mast"];
                      const tdStat = {padding:"4px 8px",fontSize:10,fontFamily:"'Space Mono',monospace",borderRight:`1px solid ${C.border}`,textAlign:"center"};

                      const curStats  = gearName ? getGearStats(gearName, curTier,  curLv,  curM)  : null;
                      const goalStats = gearName ? getGearStats(gearName, goalTier, goalLv, goalM) : null;

                      // Don't show subrow if stats are identical (e.g. both at 0/0 Mythic)
                      if (curStats && goalStats) {
                        const same = curStats.power === goalStats.power &&
                          curStats.heroMain === goalStats.heroMain &&
                          curStats.heroHp === goalStats.heroHp;
                        if (same) return null;
                      }

                      // Format a stat value for display
                      const fmtVal = (val, isPct) => {
                        if (val == null) return "—";
                        if (isPct) return val.toFixed(2) + "%";
                        return Math.round(val).toLocaleString();
                      };

                      // Build rows: [Gear Pwr, Hero Atk/Def, Hero HP, Esc Atk/Def, Esc HP, Trp%, Trp Mast%]
                      const getRowVals = (gs, mastery) => {
                        if (!gs) return Array(7).fill(null);
                        const mastPct = mastery * 10; // mastery bonus %
                        return [
                          gs.power,
                          gs.heroMain,
                          gs.heroHp,
                          gs.escMain,
                          gs.escHp,
                          gs.troop,   // already a %
                          mastPct,    // mastery %
                        ];
                      };

                      const curVals  = getRowVals(curStats,  curM);
                      const goalVals = getRowVals(goalStats, goalM);
                      const chgVals  = curVals.map((v, i) => (goalVals[i] != null && v != null) ? goalVals[i] - v : null);
                      const isPct    = [false, false, false, false, false, true, true];

                      const chgColor = (v) => v == null ? C.textDim : v > 0 ? C.green : v < 0 ? C.red : C.textDim;

                      const rows = [
                        { label:"Current", color:C.textSec, bg:"transparent",               vals: curVals  },
                        { label:"Goal",    color:C.blue,    bg:"rgba(56,139,253,0.06)",      vals: goalVals },
                        { label:"Change",  color:C.green,   bg:"rgba(63,185,80,0.06)",       vals: chgVals, isChange: true },
                      ];

                      return (
                        <tr style={{background:"rgba(56,139,253,0.04)"}}>
                          <td colSpan={12} style={{padding:"6px 10px",borderBottom:`1px solid ${C.border}`}}>
                            <div style={{display:"flex",gap:0,borderRadius:6,overflow:"hidden",border:`1px solid ${C.border}`}}>
                              <table style={{borderCollapse:"collapse",width:"100%",fontSize:10}}>
                                <thead>
                                  <tr>
                                    <td style={{...tdStat,width:60,color:C.textDim,background:"transparent",borderRight:`1px solid ${C.border}`}}/>
                                    {STAT_LABELS.map(l => (
                                      <td key={"hl"+l} style={{...tdStat,color:C.textDim,fontWeight:700,background:"transparent",fontSize:9,whiteSpace:"nowrap"}}>{l}</td>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map(row => (
                                    <tr key={row.label} style={{background:row.bg}}>
                                      <td style={{...tdStat,color:row.color,fontWeight:700,fontSize:9,whiteSpace:"nowrap"}}>{row.label}</td>
                                      {row.vals.map((v, i) => (
                                        <td key={row.label+STAT_LABELS[i]} style={{...tdStat, color: row.isChange ? chgColor(v) : (v == null ? C.textDim : C.textPri)}}>
                                          {row.isChange && v != null && v > 0 ? "+" : ""}{fmtVal(v, isPct[i])}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                    </React.Fragment>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
const EXPERTS = [
  { name: "Cyrille", level: 100, sigils: 5,  bonus: "Hunter's Heart",      booksNeeded: 0,   sigilsNeeded: 0   },
  { name: "Agnes",   level: 86,  sigils: 2,  bonus: "Earthbreaker",        booksNeeded: 0,   sigilsNeeded: 0   },
  { name: "Romulus", level: 90,  sigils: 9,  bonus: "Commander's Crest",   booksNeeded: 0,   sigilsNeeded: 320 },
  { name: "Holger",  level: 0,   sigils: 0,  bonus: "Blade Dancing",       booksNeeded: 0,   sigilsNeeded: 0   },
  { name: "Fabian",  level: 0,   sigils: 0,  bonus: "Craftsman of War",    booksNeeded: 0,   sigilsNeeded: 0   },
  { name: "Baldur",  level: 0,   sigils: 0,  bonus: "Master Negotiator",   booksNeeded: 0,   sigilsNeeded: 0   },
  { name: "Valeria", level: 0,   sigils: 0,  bonus: "Point Skill",         booksNeeded: 0,   sigilsNeeded: 0   },
];

const SVS_SCHEDULE = [
  { day: "Monday",    points: 4759957 },
  { day: "Tuesday",   points: 1083240 },
  { day: "Wednesday", points: 0       },
  { day: "Thursday",  points: 0       },
  { day: "Friday",    points: 0       },
];

// ─── Utility ──────────────────────────────────────────────────────────────────
const fmt = n => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(1)+"K";
  return Math.round(n).toLocaleString();
};
const fmtFull = n => Math.round(n).toLocaleString();
const clsx = (...args) => args.filter(Boolean).join(" ");

// ─── Styles injected once ─────────────────────────────────────────────────────
const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 15px; }
  body { background: var(--c-bg); color: var(--c-textPri); font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--c-surface); }
  ::-webkit-scrollbar-thumb { background: var(--c-borderHi); border-radius: 3px; }
  input[type=number] { -moz-appearance: textfield; }
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }

  .app { display: flex; min-height: 100vh; }

  /* Sidebar */
  .sidebar { width: 220px; min-width: 220px; background: var(--c-surface); border-right: 1px solid var(--c-border); display: flex; flex-direction: column; padding: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .sidebar-logo { padding: 0; border-bottom: 1px solid var(--c-border); overflow: hidden; position: relative; background: #0D1B2A; }
  .sidebar-logo .tc-top-bar { height: 3px; background: #4A9EBF; width: 100%; }
  .sidebar-logo .tc-body { padding: 14px 16px 14px; position: relative; }
  .sidebar-logo .tc-corner { position: absolute; width: 8px; height: 8px; border-color: #4A9EBF; border-style: solid; opacity: 0.7; }
  .sidebar-logo .tc-corner.tl { top: 6px; left: 8px; border-width: 1px 0 0 1px; }
  .sidebar-logo .tc-corner.tr { top: 6px; right: 8px; border-width: 1px 1px 0 0; }
  .sidebar-logo .tc-corner.bl { bottom: 6px; left: 8px; border-width: 0 0 1px 1px; }
  .sidebar-logo .tc-corner.br { bottom: 6px; right: 8px; border-width: 0 1px 1px 0; }
  .sidebar-logo .tc-badge { display: flex; justify-content: center; margin-bottom: 8px; }
  .sidebar-logo .tc-rule { height: 0.5px; background: #1E3A52; margin: 0 4px 10px; }
  .sidebar-logo .tc-tundra { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; color: #E8F4F8; letter-spacing: 2px; text-align: center; line-height: 1; margin-bottom: 4px; }
  .sidebar-logo .tc-command { font-family: 'Syne', sans-serif; font-size: 10px; font-weight: 600; color: #4A9EBF; letter-spacing: 5px; text-align: center; }
  .sidebar-nav { padding: 12px 8px; flex: 1; }
  .nav-section { font-size: 10px; font-weight: 700; color: var(--c-textSec); letter-spacing: 2px; text-transform: uppercase; padding: 12px 12px 6px; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--c-textPri); transition: all 0.15s; border: 1px solid transparent; margin-bottom: 1px; }
  .nav-item:hover { color: var(--c-textPri); background: var(--c-card); }
  .nav-item.active { color: var(--c-accent); background: var(--c-accentBg); border-color: var(--c-accentDim); }
  .nav-item .nav-icon { font-size: 15px; width: 18px; text-align: center; font-family: 'Space Mono', monospace; }
  .nav-badge { margin-left: auto; font-size: 10px; font-family: 'Space Mono', monospace; background: var(--c-accentBg); color: var(--c-accent); border: 1px solid var(--c-accentDim); padding: 1px 6px; border-radius: 3px; }
  .sidebar-footer { padding: 16px 20px; border-top: 1px solid var(--c-border); font-size: 11px; color: var(--c-textDim); font-family: 'Space Mono', monospace; }

  /* Main content */
  .main { flex: 1; overflow-x: hidden; }
  .page-header { padding: 28px 32px 20px; border-bottom: 1px solid var(--c-border); background: var(--c-surface); position: sticky; top: 0; z-index: 10; }
  .page-header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .page-title { font-size: 22px; font-weight: 800; color: var(--c-textPri); }
  .page-title span { color: var(--c-accent); }
  .page-sub { font-size: 13px; color: var(--c-textPri); margin-top: 4px; }
  .last-saved { font-size: 11px; font-family: 'Space Mono', monospace; color: var(--c-textSec); }
  .page-body { padding: 28px 32px; }

  /* Cards */
  .card { background: var(--c-card); border: 1px solid var(--c-border); border-radius: 10px; }
  .card-header { padding: 16px 20px; border-bottom: 1px solid var(--c-border); display: flex; align-items: center; justify-content: space-between; }
  .card-title { font-size: 13px; font-weight: 700; color: var(--c-textPri); letter-spacing: 0.5px; text-transform: uppercase; }
  .card-sub { font-size: 12px; color: var(--c-textPri); margin-top: 2px; }
  .card-body { padding: 20px; }

  /* Stat grid */
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .stat-card { background: var(--c-card); border: 1px solid var(--c-border); border-radius: 8px; padding: 14px 16px; transition: border-color 0.15s; }
  .stat-card:hover { border-color: var(--c-borderHi); }
  .stat-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--c-textSec); margin-bottom: 8px; }
  .stat-value { font-size: 24px; font-weight: 800; font-family: 'Space Mono', monospace; color: var(--c-textPri); line-height: 1; }
  .stat-value.positive { color: var(--c-green); }
  .stat-value.negative { color: var(--c-red); }
  .stat-value.accent { color: var(--c-accent); }
  .stat-sub { font-size: 11px; color: var(--c-textSec); margin-top: 5px; font-family: 'Space Mono', monospace; }

  /* Resource input row */
  .res-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
  .res-item { display: flex; align-items: center; gap: 10px; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 8px; padding: 10px 14px; transition: border-color 0.15s; }
  .res-item:focus-within { border-color: var(--c-accent); }
  .res-icon { font-size: 18px; width: 24px; text-align: center; flex-shrink: 0; font-family: 'Space Mono', monospace; font-size: 13px; color: var(--c-textSec); }
  .res-label { font-size: 12px; font-weight: 600; color: var(--c-textPri); flex: 1; min-width: 0; }
  .res-input { width: 90px; background: transparent; border: none; outline: none; font-family: 'Space Mono', monospace; font-size: 14px; font-weight: 700; color: var(--c-textPri); text-align: right; }
  .res-input::placeholder { color: var(--c-textSec); }

  /* Section divider */
  .section-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--c-textSec); margin-bottom: 12px; margin-top: 24px; display: flex; align-items: center; gap: 8px; }
  .section-label::after { content: ''; flex: 1; height: 1px; background: var(--c-border); }

  /* Construction table */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--c-textSec); border-bottom: 1px solid var(--c-border); white-space: nowrap; }
  td { padding: 11px 12px; border-bottom: 1px solid var(--c-border); color: var(--c-textPri); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--c-hover, rgba(0,0,0,0.03)); }
  td.mono { font-family: 'Space Mono', monospace; font-size: 12px; }
  td.pri { color: var(--c-textPri); font-weight: 600; }
  td.green { color: var(--c-green); font-family: 'Space Mono', monospace; }
  td.red { color: var(--c-red); font-family: 'Space Mono', monospace; }
  td.amber { color: var(--c-amber); font-family: 'Space Mono', monospace; }
  td.accent { color: var(--c-accent); font-family: 'Space Mono', monospace; }

  /* Badge */
  .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; font-family: 'Space Mono', monospace; }
  .badge-green { background: var(--c-greenBg); color: var(--c-green); border: 1px solid var(--c-greenDim); }
  .badge-red { background: var(--c-redBg); color: var(--c-red); border: 1px solid var(--c-redDim); }
  .badge-amber { background: var(--c-amberBg); color: var(--c-amber); }
  .badge-blue { background: var(--c-blueBg); color: var(--c-blue); border: 1px solid var(--c-blueDim); }
  .badge-accent { background: var(--c-accentBg); color: var(--c-accent); border: 1px solid var(--c-accentDim); }

  /* Progress bar */
  .progress-wrap { background: var(--c-border); border-radius: 4px; height: 6px; overflow: hidden; }
  .progress-bar { height: 100%; border-radius: 4px; transition: width 0.3s ease; }

  /* Toggle */
  .toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; gap: 8px; font-size: 13px; color: var(--c-textPri); }
  .toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .toggle-track { width: 36px; height: 20px; background: var(--c-border); border-radius: 10px; transition: background 0.2s; position: relative; flex-shrink: 0; }
  .toggle input:checked ~ .toggle-track { background: var(--c-accent); }
  .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: transform 0.2s; }
  .toggle input:checked ~ .toggle-track .toggle-thumb { transform: translateX(16px); }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; border: 1px solid; font-family: 'Syne', sans-serif; }
  .btn-accent { background: var(--c-accent); color: var(--c-btnText); border-color: var(--c-accent); }
  .btn-accent:hover { background: #3A8EAF; border-color: #3A8EAF; }
  .btn-ghost { background: transparent; color: var(--c-textSec); border-color: var(--c-border); }
  .btn-ghost:hover { color: var(--c-textPri); border-color: var(--c-borderHi); background: var(--c-surface); }

  /* Expert cards */
  .expert-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .expert-card { background: var(--c-card); border: 1px solid var(--c-border); border-radius: 10px; overflow: hidden; transition: border-color 0.15s; }
  .expert-card:hover { border-color: var(--c-borderHi); }
  .expert-head { padding: 14px 16px; border-bottom: 1px solid var(--c-border); display: flex; align-items: center; gap: 12px; }
  .expert-avatar { width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; font-family: 'Space Mono', monospace; background: var(--c-accentBg); color: var(--c-accent); border: 1px solid var(--c-accentDim); flex-shrink: 0; }
  .expert-name { font-size: 15px; font-weight: 700; color: var(--c-textPri); }
  .expert-bonus { font-size: 11px; color: var(--c-textSec); margin-top: 2px; }
  .expert-body { padding: 12px 16px; }
  .expert-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 12px; color: var(--c-textPri); border-bottom: 1px solid var(--c-border); }
  .expert-row:last-child { border-bottom: none; }
  .expert-val { font-family: 'Space Mono', monospace; font-size: 12px; color: var(--c-textPri); font-weight: 700; }

  /* SVS schedule */
  .svs-row { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--c-border); }
  .svs-row:last-child { border-bottom: none; }
  .svs-day { width: 90px; font-size: 13px; font-weight: 700; color: var(--c-textPri); flex-shrink: 0; }
  .svs-bar-wrap { flex: 1; }
  .svs-pts { font-family: 'Space Mono', monospace; font-size: 13px; color: var(--c-accent); width: 90px; text-align: right; flex-shrink: 0; }

  /* Responsive */
  @media (max-width: 768px) {
    .sidebar {
      position: fixed; top: 0; left: 0; height: 100vh; z-index: 150;
      transform: translateX(-100%); transition: transform 0.25s ease;
      box-shadow: 4px 0 24px rgba(0,0,0,0.5);
    }
    .sidebar.open { transform: translateX(0); }
    .sidebar-overlay { display: block !important; }
    .page-body { padding: 16px; }
    .page-header { padding: 14px 16px; }
    .stat-grid { grid-template-columns: repeat(2, 1fr); }
    .hamburger { display: flex !important; }
  }
  .sidebar-overlay {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    z-index: 149; cursor: pointer;
  }
  .hamburger {
    display: none; align-items: center; justify-content: center;
    width: 36px; height: 36px; background: var(--c-card); border: 1px solid var(--c-border);
    border-radius: 7px; cursor: pointer; flex-direction: column; gap: 5px; flex-shrink: 0;
  }
  .hamburger span {
    display: block; width: 18px; height: 2px;
    background: var(--c-textSec); border-radius: 2px; transition: all 0.2s;
  }
  .hamburger:hover span { background: var(--c-textPri); }

  /* Animations */
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn 0.25s ease forwards; }

  /* Auth panel */
  .auth-panel { padding: 14px 12px; border-top: 1px solid var(--c-border); }
  .auth-user-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; background: var(--c-card); border: 1px solid var(--c-border); margin-bottom: 8px; }
  .auth-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--c-accentBg); border: 1px solid var(--c-accentDim); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--c-accent); flex-shrink: 0; font-family: 'Space Mono', monospace; }
  .auth-email { font-size: 11px; color: var(--c-textSec); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .auth-signout { font-size: 10px; color: var(--c-textDim); cursor: pointer; padding: 2px 6px; border-radius: 4px; border: 1px solid var(--c-border); background: transparent; font-family: 'Space Mono', monospace; transition: all 0.15s; }
  .auth-signout:hover { color: var(--c-red); border-color: var(--c-redDim); }
  .auth-sync-badge { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--c-green); font-family: 'Space Mono', monospace; padding: 2px 0; margin-bottom: 4px; }
  .auth-sync-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c-green); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .auth-form { display: flex; flex-direction: column; gap: 7px; }
  .auth-inp { background: var(--c-card); border: 1px solid var(--c-border); border-radius: 6px; padding: 7px 10px; font-family: 'Space Mono', monospace; font-size: 12px; color: var(--c-textPri); outline: none; width: 100%; transition: border-color 0.15s; }
  .auth-inp:focus { border-color: var(--c-accent); }
  .auth-inp::placeholder { color: var(--c-textDim); font-size: 11px; }
  .auth-btn { padding: 8px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Syne', sans-serif; border: none; transition: all 0.15s; width: 100%; }
  .auth-btn-primary { background: var(--c-accent); color: var(--c-btnText); }
  .auth-btn-primary:hover { opacity: 0.9; }
  .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-btn-ghost { background: transparent; color: var(--c-textSec); border: 1px solid var(--c-border); font-size: 11px; padding: 5px; }
  .auth-btn-ghost:hover { color: var(--c-textSec); border-color: var(--c-borderHi); }
  .auth-error { font-size: 10px; color: var(--c-red); font-family: 'Space Mono', monospace; padding: 5px 8px; background: var(--c-redBg); border-radius: 4px; border: 1px solid var(--c-redDim); line-height: 1.4; }
  .auth-toggle { font-size: 11px; color: var(--c-textSec); text-align: center; }
  .auth-toggle span { color: var(--c-accent); text-decoration: underline; cursor: pointer; }
  .auth-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--c-textSec); margin-bottom: 8px; font-family: 'Space Mono', monospace; }

  /* Character switcher */
  .char-switcher { padding: 10px 10px 0; }
  .char-select { width: 100%; background: var(--c-card); border: 1px solid var(--c-border); border-radius: 7px; color: var(--c-textPri); font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; padding: 8px 10px; cursor: pointer; outline: none; transition: border-color 0.15s; }
  .char-select:focus { border-color: var(--c-accent); }
  .char-select option { background: var(--c-card); }

  /* Modal overlay */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: var(--c-card); border: 1px solid var(--c-borderHi); border-radius: 14px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,0.6); }
  .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--c-border); display: flex; align-items: center; justify-content: space-between; }
  .modal-title { font-size: 15px; font-weight: 800; color: var(--c-textPri); }
  .modal-close { background: none; border: none; color: var(--c-textDim); cursor: pointer; font-size: 18px; line-height: 1; padding: 4px; }
  .modal-close:hover { color: var(--c-textPri); }
  .modal-body { padding: 20px 24px; }
  .modal-section { margin-bottom: 24px; }
  .modal-section:last-child { margin-bottom: 0; }
  .modal-section-title { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--c-textDim); margin-bottom: 12px; font-family: 'Space Mono', monospace; }
  .modal-inp { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 7px; padding: 8px 12px; font-family: 'Space Mono', monospace; font-size: 12px; color: var(--c-textPri); outline: none; width: 100%; transition: border-color 0.15s; box-sizing: border-box; }
  .modal-inp:focus { border-color: var(--c-accent); }
  .modal-inp::placeholder { color: var(--c-textDim); }
  .modal-btn { padding: 9px 16px; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Syne', sans-serif; border: none; transition: all 0.15s; }
  .modal-btn-primary { background: var(--c-accent); color: var(--c-btnText); }
  .modal-btn-primary:hover { opacity: 0.88; }
  .modal-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
  .modal-btn-ghost { background: transparent; color: var(--c-textSec); border: 1px solid var(--c-border); }
  .modal-btn-ghost:hover { border-color: var(--c-borderHi); color: var(--c-textPri); }
  .modal-btn-danger { background: var(--c-redBg); color: var(--c-red); border: 1px solid var(--c-redDim); }
  .modal-btn-danger:hover { background: var(--c-red); color: #fff; }
  .modal-error { font-size: 11px; color: var(--c-red); font-family: 'Space Mono', monospace; padding: 7px 10px; background: var(--c-redBg); border-radius: 5px; border: 1px solid var(--c-redDim); margin-top: 8px; }
  .modal-success { font-size: 11px; color: var(--c-green); font-family: 'Space Mono', monospace; padding: 7px 10px; background: var(--c-greenBg); border-radius: 5px; border: 1px solid var(--c-greenDim); margin-top: 8px; }
  .char-list-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 8px; margin-bottom: 8px; }
  .char-list-item.is-active { border-color: var(--c-accentDim); background: var(--c-accentBg); }
  .char-avatar-sm { width: 30px; height: 30px; border-radius: 50%; background: var(--c-card); border: 1px solid var(--c-border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--c-accent); flex-shrink: 0; font-family: 'Space Mono', monospace; }
  .char-name-text { font-size: 13px; font-weight: 700; color: var(--c-textPri); }
  .char-state-text { font-size: 10px; color: var(--c-textDim); font-family: 'Space Mono', monospace; }
  .profile-btn-wrap { display: flex; align-items: center; gap: 8px; padding: 12px 12px; cursor: pointer; border-top: 1px solid var(--c-border); transition: background 0.15s; }
  .profile-btn-wrap:hover { background: var(--c-hover, rgba(0,0,0,0.03)); }
  .profile-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--c-accentBg); border: 1px solid var(--c-accentDim); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--c-accent); flex-shrink: 0; font-family: 'Space Mono', monospace; }
`;

// ─── Profile Management Modal ─────────────────────────────────────────────────

function ProfileModal({ open, onClose, initialSection="account",
  user, characters, activeCharId,
  addCharacter, removeCharacter, renameCharacter, makeDefault, switchCharacter,
  changePassword, requestDeleteAccount, confirmDeleteAccount,
  charError, clearCharError, authError, clearAuthError,
  theme, setTheme, resetToSystem,
  notifications=[], setNotifications,
}) {
  const [section, setSection]       = useState(initialSection);
  const [msg, setMsg]               = useState("");
  const [msgType, setMsgType]       = useState("success"); // "success"|"error"
  // New character form
  const [newName,  setNewName]      = useState("");
  const [newState, setNewState]     = useState("");
  const [newAlliance, setNewAlliance] = useState("");
  // Edit character
  const [editId,   setEditId]       = useState(null);
  const [editName, setEditName]     = useState("");
  const [editState,setEditState]    = useState("");
  const [editAlliance, setEditAlliance] = useState("");
  // Delete account
  const [deleteStep, setDeleteStep] = useState(0); // 0=idle,1=email sent,2=otp entry
  const [otp, setOtp]               = useState("");
  const [busy, setBusy]             = useState(false);
  // My Submissions
  const [mySubs,    setMySubs]      = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  // Issues submitted by this user
  const [myIssues,     setMyIssues]    = useState([]);
  const [issuesLoading,setIssuesLoading] = useState(false);
  // Locally tracked "read" stat submissions (stored in localStorage per user)
  const [readSubIds,   setReadSubIds]  = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("read-sub-ids") || "[]")); }
    catch { return new Set(); }
  });

  const markSubRead = (id) => {
    setReadSubIds(prev => {
      const next = new Set(prev); next.add(id);
      try { localStorage.setItem("read-sub-ids", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // Submissions tab — closed folder toggle
  const [closedFolderOpen, setClosedFolderOpen] = useState(false);

  useEffect(() => { if (open) setSection(initialSection); }, [open, initialSection]);
  useEffect(() => { clearCharError?.(); clearAuthError?.(); setMsg(""); }, [section]);
  useEffect(() => {
    if (open && section === "account" && user) {
      setSubsLoading(true);
      supabase.from("stat_submissions")
        .select("*")
        .eq("submitted_by", user.id)
        .order("submitted_at", { ascending: false })
        .then(({ data }) => { setMySubs(data || []); setSubsLoading(false); });
    }
    if (open && section === "submissions" && user) {
      // Load stat submissions
      setSubsLoading(true);
      supabase.from("stat_submissions")
        .select("*")
        .eq("submitted_by", user.id)
        .order("submitted_at", { ascending: false })
        .then(({ data }) => { setMySubs(data || []); setSubsLoading(false); });
      // Load issue reports
      setIssuesLoading(true);
      supabase.from("issue_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .then(({ data }) => { setMyIssues(data || []); setIssuesLoading(false); });
    }
  }, [open, section, user]);

  const flash = (text, type="success") => { setMsg(text); setMsgType(type); setTimeout(()=>setMsg(""),4000); };

  if (!open) return null;

  const C = COLORS;

  const handleAddChar = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    const c = await addCharacter(newName.trim(), newState ? parseInt(newState) : null, newAlliance.trim() || null);
    setBusy(false);
    if (c) { setNewName(""); setNewState(""); setNewAlliance(""); flash(`Character "${c.name}" added!`); }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setBusy(true);
    await renameCharacter(editId, editName.trim(), editState ? parseInt(editState) : null, editAlliance.trim() || null);
    setBusy(false);
    setEditId(null);
    flash("Character updated.");
  };

  const handlePasswordChange = async () => {
    setBusy(true);
    const ok = await changePassword();
    setBusy(false);
    if (ok) flash("Password reset email sent — check your inbox.");
    else flash(authError || "Failed to send email.", "error");
  };

  const handleRequestDelete = async () => {
    setBusy(true);
    const ok = await requestDeleteAccount();
    setBusy(false);
    if (ok) { setDeleteStep(1); flash("Confirmation email sent — enter the code below."); }
    else flash(authError || "Failed.", "error");
  };

  const handleConfirmDelete = async () => {
    if (!otp.trim()) return;
    setBusy(true);
    const ok = await confirmDeleteAccount(otp.trim(), user.email);
    setBusy(false);
    if (!ok) flash(authError || "Invalid code.", "error");
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const tabs = [
    { id:"characters",   label:"Characters" },
    { id:"account",      label:"Account"    },
    { id:"submissions",  label:"Submissions & Issues", badge: unreadCount },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Profile Management</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tab bar */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,padding:"0 24px"}}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setSection(t.id)}
              style={{padding:"10px 16px",background:"none",border:"none",cursor:"pointer",
                fontSize:12,fontWeight:700,fontFamily:"Syne,sans-serif",
                color: section===t.id ? C.accent : C.textDim,
                borderBottom: section===t.id ? `2px solid ${C.accent}` : "2px solid transparent",
                transition:"all 0.15s",marginBottom:-1,
                display:"flex",alignItems:"center",gap:6}}>
              {t.label}
              {t.badge > 0 && (
                <span style={{background:C.red,color:"#fff",borderRadius:10,
                  padding:"1px 6px",fontSize:10,fontWeight:800}}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {msg && <div className={msg ? (msgType==="success" ? "modal-success" : "modal-error") : ""} style={{marginBottom:16}}>{msg}</div>}

          {/* ── Characters tab ── */}
          {section === "characters" && (
            <>
              <div className="modal-section">
                <div className="modal-section-title">Your Characters ({characters.length}/5)</div>
                {characters.map(c => (
                  <div key={c.id} className={`char-list-item${c.id === activeCharId ? " is-active" : ""}`}>
                    <div className="char-avatar-sm">{c.name?.[0]?.toUpperCase() ?? "?"}</div>
                    <div style={{flex:1,minWidth:0}}>
                      {editId === c.id ? (
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          <input className="modal-inp" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Character name" />
                          <input className="modal-inp" type="number" value={editState} onChange={e=>setEditState(e.target.value)} placeholder="State number" />
                          <input className="modal-inp" value={editAlliance} onChange={e=>setEditAlliance(e.target.value.toUpperCase().slice(0,3))} placeholder="Alliance tag (e.g. ABC)" />
                          <div style={{display:"flex",gap:6,marginTop:2}}>
                            <button className="modal-btn modal-btn-primary" onClick={handleSaveEdit} disabled={busy}>Save</button>
                            <button className="modal-btn modal-btn-ghost" onClick={()=>setEditId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="char-name-text">
                            {c.alliance ? <span style={{color:C.textDim,fontFamily:"'Space Mono',monospace"}}>[{c.alliance}] </span> : null}{c.name}
                          </div>
                          <div className="char-state-text">
                            {c.state_number ? `State ${c.state_number}` : <span style={{color:C.red,fontWeight:600}}>No state set</span>}
                            {!c.alliance && <span style={{color:C.red,fontWeight:600}}> · No alliance set</span>}
                          </div>
                        </>
                      )}
                    </div>
                    {editId !== c.id && (
                      <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                        {c.is_default && <span style={{fontSize:9,fontWeight:700,letterSpacing:1,background:C.accentBg,color:C.accent,border:`1px solid ${C.accentDim}`,padding:"2px 6px",borderRadius:3}}>DEFAULT</span>}
                        <div style={{display:"flex",gap:4}}>
                          <button className="modal-btn modal-btn-ghost" style={{padding:"3px 8px",fontSize:10}}
                            onClick={()=>{ setEditId(c.id); setEditName(c.name); setEditState(c.state_number||""); setEditAlliance(c.alliance||""); }}>Edit</button>
                          {!c.is_default && (
                            <button className="modal-btn modal-btn-ghost" style={{padding:"3px 8px",fontSize:10}}
                              onClick={()=>makeDefault(c.id).then(()=>flash(`"${c.name}" set as default.`))}>Set Default</button>
                          )}
                          {c.id !== activeCharId && (
                            <button className="modal-btn modal-btn-ghost" style={{padding:"3px 8px",fontSize:10}}
                              onClick={()=>{ switchCharacter(c.id); onClose(); }}>Switch</button>
                          )}
                          {characters.length > 1 && (
                            <button className="modal-btn modal-btn-danger" style={{padding:"3px 8px",fontSize:10}}
                              onClick={()=>{ if(confirm(`Delete "${c.name}"? All their data will be lost.`)) removeCharacter(c.id).then(()=>flash("Character deleted.")); }}>Delete</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {charError && <div className="modal-error">{charError}</div>}
              </div>

              {characters.length < 5 && (
                <div className="modal-section">
                  <div className="modal-section-title">Add New Character</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <input className="modal-inp" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Character name (e.g. Main, Alt 1)" />
                    <input className="modal-inp" type="number" value={newState} onChange={e=>setNewState(e.target.value)} placeholder="State number (e.g. 142)" />
                    <input className="modal-inp" value={newAlliance} onChange={e=>setNewAlliance(e.target.value.toUpperCase().slice(0,3))} placeholder="Alliance tag (e.g. ABC)" />
                    <button className="modal-btn modal-btn-primary" onClick={handleAddChar} disabled={busy || !newName.trim()} style={{alignSelf:"flex-start"}}>
                      {busy ? "Adding…" : "Add Character"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Account tab ── */}
          {section === "account" && (
            <>
              <div className="modal-section">
                <div className="modal-section-title">Appearance</div>
                <p style={{fontSize:12,color:C.textSec,marginBottom:12}}>Choose your preferred color theme. Auto follows your system setting.</p>
                <div style={{display:"flex",gap:8}}>
                  {[
                    {id:"auto",  label:"Auto"},
                    {id:"dark",  label:"🌙 Dark"},
                    {id:"light", label:"☀️ Light"},
                  ].map(opt => {
                    const isActive = opt.id === "auto"
                      ? !localStorage.getItem("wos-theme")
                      : theme === opt.id && localStorage.getItem("wos-theme") === opt.id;
                    return (
                      <button key={opt.id}
                        className="modal-btn"
                        onClick={() => opt.id === "auto" ? resetToSystem() : setTheme(opt.id)}
                        style={{
                          background: isActive ? C.accent : "transparent",
                          color: isActive ? "#0a0c10" : C.textSec,
                          border: `1px solid ${isActive ? C.accent : C.border}`,
                          flex:1,
                        }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="modal-section">
                <div className="modal-section-title">Signed in as</div>
                <div style={{fontSize:13,color:C.textPri,fontFamily:"Space Mono,monospace"}}>{user?.email || "Discord user"}</div>
              </div>

              <div className="modal-section">
                <div className="modal-section-title">Password</div>
                <p style={{fontSize:12,color:C.textSec,marginBottom:12}}>A reset link will be sent to your email address.</p>
                <button className="modal-btn modal-btn-ghost" onClick={handlePasswordChange} disabled={busy}>
                  {busy ? "Sending…" : "Send Password Reset Email"}
                </button>
              </div>

              <div className="modal-section">
                <div className="modal-section-title" style={{color:C.red}}>Danger Zone</div>
                {deleteStep === 0 && (
                  <>
                    <p style={{fontSize:12,color:C.textSec,marginBottom:12}}>Permanently delete your account and all character data. This cannot be undone.</p>
                    <button className="modal-btn modal-btn-danger" onClick={handleRequestDelete} disabled={busy}>
                      {busy ? "Sending…" : "Delete Account"}
                    </button>
                  </>
                )}
                {deleteStep >= 1 && (
                  <>
                    <p style={{fontSize:12,color:C.textSec,marginBottom:12}}>Enter the confirmation code sent to your email to permanently delete your account.</p>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <input className="modal-inp" value={otp} onChange={e=>setOtp(e.target.value)} placeholder="6-digit confirmation code" maxLength={6} />
                      <div style={{display:"flex",gap:8}}>
                        <button className="modal-btn modal-btn-danger" onClick={handleConfirmDelete} disabled={busy || !otp.trim()}>
                          {busy ? "Deleting…" : "Confirm Delete"}
                        </button>
                        <button className="modal-btn modal-btn-ghost" onClick={()=>setDeleteStep(0)}>Cancel</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* ── Submissions & Issues tab ── */}
          {section === "submissions" && (() => {
            const fmtDT = s => s ? new Date(s).toLocaleString([], {dateStyle:"short",timeStyle:"short"}) : "—";

            // Stat submissions split
            const activeSubs  = mySubs.filter(s => !readSubIds.has(s.id) && s.status !== "accepted");
            const closedSubs  = mySubs.filter(s => readSubIds.has(s.id) || s.status === "accepted");

            // Issues split — active = not closed; archived = closed AND read notification
            const activeIssues = myIssues.filter(i => i.status !== "closed");
            const closedIssues = myIssues.filter(i => i.status === "closed");

            // Notifications split
            const unreadNotifs = notifications.filter(n => !n.read);
            const readNotifs   = notifications.filter(n => n.read);

            // Anything in closed folder
            const hasClosed = closedSubs.length > 0 || closedIssues.length > 0 || readNotifs.length > 0;

            const issueStatusStyle = (status) => {
              if (status === "submitted")    return { bg:C.redBg,    color:C.red,    border:C.redDim };
              if (status === "acknowledged") return { bg:C.blueBg,   color:C.blue,   border:C.blueDim };
              if (status === "in_progress")  return { bg:C.amberBg,  color:C.amber,  border:"#7d5a0d" };
              if (status === "resolved")     return { bg:C.greenBg,  color:C.green,  border:C.greenDim };
              return { bg:C.surface, color:C.textDim, border:C.border };
            };

            const isEmpty = unreadNotifs.length === 0 && activeIssues.length === 0 && activeSubs.length === 0;

            return (
              <div style={{display:"flex",flexDirection:"column",gap:16}}>

                {/* ── Notifications (top) ── */}
                {unreadNotifs.length > 0 && (
                  <div>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
                      color:C.red,fontFamily:"Space Mono,monospace",marginBottom:8,
                      display:"flex",alignItems:"center",gap:6}}>
                      🔔 Notifications
                      <span style={{background:C.red,color:"#fff",borderRadius:10,
                        padding:"1px 6px",fontSize:10,fontWeight:800}}>{unreadNotifs.length}</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {unreadNotifs.map(notif => (
                        <div key={notif.id} style={{background:C.accentBg,
                          border:`1px solid ${C.accentDim}`,borderRadius:8,padding:"10px 12px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                            <span style={{fontSize:9,fontWeight:800,color:C.accent,
                              fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>● NEW</span>
                            <span style={{fontSize:10,fontWeight:700,color:C.accent,
                              fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>
                              {notif.issue_type}
                            </span>
                            <span style={{fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace"}}>
                              {notif.module}
                            </span>
                            <span style={{fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace",marginLeft:"auto"}}>
                              {fmtDT(notif.created_at)}
                            </span>
                          </div>
                          <div style={{fontSize:12,color:C.textPri,marginBottom:8,lineHeight:1.5}}>
                            {notif.admin_note}
                          </div>
                          <button onClick={async () => {
                            await markNotificationRead(notif.id);
                            setNotifications(p => p.map(n => n.id===notif.id ? {...n,read:true} : n));
                          }} style={{fontSize:10,fontWeight:700,cursor:"pointer",
                            padding:"2px 8px",borderRadius:4,fontFamily:"Space Mono,monospace",
                            background:"transparent",color:C.textDim,border:`1px solid ${C.border}`}}>
                            Mark as read
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Active Issues ── */}
                {(issuesLoading || activeIssues.length > 0) && (
                  <div>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
                      color:C.textSec,fontFamily:"Space Mono,monospace",marginBottom:8}}>
                      Issue Reports
                    </div>
                    {issuesLoading ? (
                      <div style={{fontSize:12,color:C.textDim,fontFamily:"Space Mono,monospace"}}>Loading…</div>
                    ) : (
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {activeIssues.map(issue => {
                          const sc = issueStatusStyle(issue.status);
                          const lastChange = issue.updated_at || issue.submitted_at;
                          return (
                            <div key={issue.id} style={{background:C.surface,
                              border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px"}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                                <span style={{fontSize:10,fontWeight:700,color:C.textDim,
                                  fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>
                                  {issue.issue_type}
                                </span>
                                <span style={{fontSize:10,color:C.accent,fontFamily:"Space Mono,monospace"}}>
                                  {issue.module}
                                </span>
                                <span style={{marginLeft:"auto",fontSize:10,fontWeight:700,
                                  padding:"2px 8px",borderRadius:4,fontFamily:"Space Mono,monospace",
                                  background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`}}>
                                  {(issue.status||"acknowledged").replace("_"," ").toUpperCase()}
                                </span>
                              </div>
                              <div style={{fontSize:12,color:C.textPri,marginBottom:6,lineHeight:1.5}}>
                                {issue.description}
                              </div>
                              <div style={{fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace"}}>
                                Submitted: {fmtDT(issue.submitted_at)}
                                {lastChange && lastChange !== issue.submitted_at &&
                                  ` · Last update: ${fmtDT(lastChange)}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Active Stat Submissions ── */}
                {(subsLoading || activeSubs.length > 0) && (
                  <div>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
                      color:C.textSec,fontFamily:"Space Mono,monospace",marginBottom:8}}>
                      Hero Stat Submissions
                    </div>
                    {subsLoading ? (
                      <div style={{fontSize:12,color:C.textDim,fontFamily:"Space Mono,monospace"}}>Loading…</div>
                    ) : (
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {activeSubs.map(sub => {
                          const status = sub.status || "pending";
                          const statusColor = status === "rejected" ? C.red : C.amber;
                          const statusBg    = status === "rejected" ? C.redBg : C.amberBg;
                          return (
                            <div key={sub.id} style={{background:C.surface,
                              border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px"}}>
                              <div style={{display:"flex",alignItems:"center",
                                justifyContent:"space-between",marginBottom:4}}>
                                <span style={{fontSize:13,fontWeight:700,color:C.textPri}}>
                                  {sub.hero_name}
                                </span>
                                <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,
                                  background:statusBg,color:statusColor,
                                  border:`1px solid ${statusColor}40`,
                                  fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>
                                  {status}
                                </span>
                              </div>
                              <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace",marginBottom:4}}>
                                Stars: {sub.stars} · Level: {sub.level} · Widget: {sub.widget ?? "N/A"}
                              </div>
                              <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace",marginBottom:4}}>
                                Submitted: {fmtDT(sub.submitted_at)}
                              </div>
                              {status === "rejected" && sub.admin_note && (
                                <div style={{marginTop:4,fontSize:11,color:C.red,
                                  background:C.redBg,borderRadius:5,padding:"5px 8px",
                                  fontFamily:"Space Mono,monospace",marginBottom:6}}>
                                  Note: {sub.admin_note}
                                </div>
                              )}
                              <button onClick={() => markSubRead(sub.id)}
                                style={{fontSize:10,fontWeight:700,cursor:"pointer",marginTop:4,
                                  padding:"2px 8px",borderRadius:4,fontFamily:"Space Mono,monospace",
                                  background:"transparent",color:C.textDim,border:`1px solid ${C.border}`}}>
                                Dismiss
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {isEmpty && !subsLoading && !issuesLoading && (
                  <div style={{fontSize:12,color:C.textDim,fontFamily:"Space Mono,monospace",
                    padding:"20px 0",textAlign:"center"}}>
                    Nothing active — all clear! 🎉
                  </div>
                )}

                {/* ── 📁 Closed folder ── */}
                {hasClosed && (
                  <div style={{marginTop:4}}>
                    <button onClick={() => setClosedFolderOpen(o => !o)}
                      style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",
                        cursor:"pointer",padding:"8px 0",width:"100%",textAlign:"left"}}>
                      <span style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",
                        textTransform:"uppercase",color:C.textSec,fontFamily:"Space Mono,monospace"}}>
                        📁 Closed / Dismissed ({closedSubs.length + closedIssues.length + readNotifs.length})
                      </span>
                      <span style={{fontSize:11,color:C.textDim,marginLeft:"auto"}}>
                        {closedFolderOpen ? "▲" : "▼"}
                      </span>
                    </button>
                    {closedFolderOpen && (
                      <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8,opacity:0.7}}>
                        {/* Read notifications */}
                        {readNotifs.map(notif => (
                          <div key={notif.id} style={{background:C.surface,
                            border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px"}}>
                            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:3}}>
                              <span style={{fontSize:10,fontWeight:700,color:C.textDim,
                                fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>
                                {notif.issue_type}
                              </span>
                              <span style={{fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace"}}>
                                {notif.module}
                              </span>
                              <span style={{fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace",marginLeft:"auto"}}>
                                {fmtDT(notif.created_at)}
                              </span>
                            </div>
                            <div style={{fontSize:11,color:C.textSec}}>{notif.admin_note}</div>
                          </div>
                        ))}
                        {/* Closed issues */}
                        {closedIssues.map(issue => (
                          <div key={issue.id} style={{background:C.surface,
                            border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px"}}>
                            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:3}}>
                              <span style={{fontSize:10,fontWeight:700,color:C.textDim,
                                fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>
                                {issue.issue_type}
                              </span>
                              <span style={{fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace"}}>
                                {issue.module}
                              </span>
                              <span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:4,
                                background:C.surface,color:C.textDim,border:`1px solid ${C.border}`,
                                fontFamily:"Space Mono,monospace",textTransform:"uppercase",marginLeft:"auto"}}>
                                CLOSED
                              </span>
                            </div>
                            <div style={{fontSize:11,color:C.textSec,marginBottom:4}}>{issue.description}</div>
                            {issue.admin_note && (
                              <div style={{fontSize:11,color:C.green,fontFamily:"Space Mono,monospace",
                                background:C.greenBg,borderRadius:4,padding:"3px 7px"}}>
                                Admin: {issue.admin_note}
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Dismissed/accepted stat submissions */}
                        {closedSubs.map(sub => {
                          const status = sub.status || "pending";
                          const color  = status === "accepted" ? C.green : C.textDim;
                          const bg     = status === "accepted" ? C.greenBg : C.surface;
                          return (
                            <div key={sub.id} style={{background:C.surface,
                              border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px"}}>
                              <div style={{display:"flex",alignItems:"center",
                                justifyContent:"space-between",marginBottom:3}}>
                                <span style={{fontSize:12,fontWeight:700,color:C.textSec}}>
                                  {sub.hero_name}
                                </span>
                                <span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:4,
                                  background:bg,color:color,
                                  border:`1px solid ${color}40`,
                                  fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>
                                  {status}
                                </span>
                              </div>
                              <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace"}}>
                                Stars: {sub.stars} · Level: {sub.level} · {fmtDT(sub.submitted_at)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}

// ─── Save Plan Popup ──────────────────────────────────────────────────────────

function SavePlanPopup({ open, defaultName, onSave, onCancel }) {
  const [name, setName] = useState(defaultName || "");
  useEffect(() => { if (open) setName(defaultName || ""); }, [open, defaultName]);
  if (!open) return null;
  const handleKey = e => { if (e.key === "Enter") onSave(name.trim() || defaultName); if (e.key === "Escape") onCancel(); };
  const C = COLORS;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{maxWidth:380}}>
        <div className="modal-header">
          <div className="modal-title">Save Plan</div>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{fontSize:12,color:C.textSec,marginBottom:12}}>Give this plan a nickname, or keep the auto-generated name.</p>
          <input className="modal-inp" value={name} onChange={e=>setName(e.target.value)} onKeyDown={handleKey}
            placeholder={defaultName} autoFocus />
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button className="modal-btn modal-btn-primary" onClick={()=>onSave(name.trim() || defaultName)}>Save</button>
            <button className="modal-btn modal-btn-ghost" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Auth Panel Component ─────────────────────────────────────────────────────

function AuthPanel({ user, loading, error, signUp, signIn, signInWithDiscord, clearError }) {
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [busy,     setBusy]     = useState(false);

  const switchMode = (m) => { setMode(m); clearError(); setEmail(""); setPassword(""); setName(""); };

  const handleSubmit = async () => {
    if (!email || !password) return;
    setBusy(true);
    if (mode === "signup") await signUp(email, password, name || email.split("@")[0]);
    else await signIn(email, password);
    setBusy(false);
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  // When signed in, AuthPanel renders nothing — profile button handles user UI
  if (user) return null;

  if (loading) return (
    <div className="auth-panel">
      <div style={{fontSize:11,color:COLORS.textDim,fontFamily:"Space Mono,monospace",textAlign:"center",padding:"8px 0"}}>Loading…</div>
    </div>
  );

  return (
    <div className="auth-panel">
      <div className="auth-title">{mode === "login" ? "Sign in to sync data" : "Create account"}</div>
      <div className="auth-form">
        {/* Discord OAuth button */}
        <button
          className="auth-btn"
          onClick={signInWithDiscord}
          style={{
            background: "#5865F2",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {/* Discord logo SVG */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Continue with Discord
        </button>

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:8,margin:"2px 0"}}>
          <div style={{flex:1,height:1,background:COLORS.border}}/>
          <span style={{fontSize:10,color:COLORS.textDim,fontFamily:"Space Mono,monospace"}}>or</span>
          <div style={{flex:1,height:1,background:COLORS.border}}/>
        </div>

        {/* Email/password form */}
        {mode === "signup" && (
          <input className="auth-inp" placeholder="Display name (optional)"
            value={name} onChange={e => setName(e.target.value)} onKeyDown={handleKey} />
        )}
        <input className="auth-inp" type="email" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey} autoComplete="email" />
        <input className="auth-inp" type="password" placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey}
          autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-btn auth-btn-primary" onClick={handleSubmit} disabled={busy || !email || !password}>
          {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <div className="auth-toggle">
          {mode === "login"
            ? <>No account? <span onClick={() => switchMode("signup")}>Sign up</span></>
            : <>Have an account? <span onClick={() => switchMode("login")}>Sign in</span></>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResInput({ label, icon, field, value, onChange, color, tabIndex }) {
  const [localVal, setLocalVal] = useState(value);
  const [focused,  setFocused]  = useState(false);

  const prevValue = useRef(value);
  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      setLocalVal(value);
    }
  }, [value]);

  const handleFocus = () => setFocused(true);

  const handleBlur = () => {
    setFocused(false);
    prevValue.current = localVal;
    onChange(field, localVal);
  };

  const handleChange = e => {
    const n = parseInt(e.target.value, 10);
    setLocalVal(isNaN(n) ? 0 : Math.max(0, n));
  };

  return (
    <div className="res-item" style={color ? { borderColor: color + "40" } : {}}>
      <div className="res-icon">{icon}</div>
      <div className="res-label">{label}</div>
      <input
        className="res-input"
        type={focused ? "number" : "text"}
        min={0}
        tabIndex={tabIndex}
        value={focused ? localVal : (localVal === 0 ? "0" : Number(localVal).toLocaleString())}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            // Move to next focusable element (same behavior as Tab)
            const focusable = Array.from(document.querySelectorAll('input[tabindex]')).sort((a,b) => (Number(a.tabIndex)||0) - (Number(b.tabIndex)||0));
            const cur = focusable.indexOf(e.target);
            if (cur >= 0 && cur < focusable.length - 1) focusable[cur+1].focus();
            else e.target.blur();
          }
        }}
        style={color ? { color } : {}}
      />
    </div>
  );
}

// Resource input with M/B unit selector for large numbers (Meat, Wood, Coal, Iron, Steel)
function ResBigInput({ label, icon, field, value, unit, onChangeVal, onChangeUnit, color, tabIndex }) {
  const [localVal, setLocalVal] = useState(value);
  const [focused,  setFocused]  = useState(false);
  const prevValue = useRef(value);
  useEffect(() => {
    if (prevValue.current !== value) { prevValue.current = value; setLocalVal(value); }
  }, [value]);
  const handleBlur = () => {
    setFocused(false);
    prevValue.current = localVal;
    onChangeVal(field, localVal);
  };
  const COLORS_MAP = { M:"M", B:"B" };
  const displayVal = focused ? localVal : (localVal === 0 ? "0" : localVal);
  return (
    <div className="res-item" style={color ? { borderColor: color + "40" } : {}}>
      <div className="res-icon">{icon}</div>
      <div className="res-label">{label}</div>
      <div style={{display:"flex",alignItems:"center",gap:4,flex:1,justifyContent:"flex-end"}}>
        <input
          className="res-input"
          type="number"
          min={0}
          step="0.01"
          tabIndex={tabIndex}
          value={displayVal}
          style={{...(color?{color}:{}), width:80, textAlign:"right"}}
          onFocus={()=>setFocused(true)}
          onBlur={handleBlur}
          onChange={e => setLocalVal(parseFloat(e.target.value)||0)}
          onKeyDown={e => { if(e.key==="Enter") e.target.blur(); }}
        />
        <select value={unit} onChange={e=>onChangeUnit(field+"Unit", e.target.value)}
          style={{background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:5,
            padding:"2px 4px",fontSize:11,color:"var(--c-textSec)",cursor:"pointer",outline:"none",fontFamily:"Space Mono,monospace"}}>
          <option value="M">M</option>
          <option value="B">B</option>
        </select>
      </div>
    </div>
  );
}

// Standalone single-value speedup input (Hours or Minutes mode)
// Must be top-level — never defined inside a render — to prevent remount on every keystroke
function SpeedupSingleInput({ totalMins, unit, onCommit, color, numStyle, tabIndex }) {
  const toDisplay = () => unit === "hrs"
    ? (totalMins > 0 ? +(totalMins / 60).toFixed(2) : 0)
    : (totalMins > 0 ? totalMins : 0);

  const [focused, setFocused] = React.useState(false);
  const [local, setLocal] = React.useState(toDisplay());

  // Sync from parent when totalMins changes externally (e.g. mode switch)
  const prevMins = React.useRef(totalMins);
  React.useEffect(() => {
    if (!focused && prevMins.current !== totalMins) {
      prevMins.current = totalMins;
      setLocal(toDisplay());
    }
  }, [totalMins, focused]);

  const displayVal = focused
    ? local
    : (Number(local) > 0 ? Number(local).toLocaleString() : "");

  return (
    <input
      type={focused ? "number" : "text"}
      inputMode="numeric"
      min={0}
      step={unit === "hrs" ? "0.5" : "1"}
      tabIndex={tabIndex}
      placeholder="0"
      value={displayVal}
      style={{...numStyle, width:120}}
      onFocus={() => {
        setFocused(true);
        setLocal(toDisplay());
      }}
      onBlur={e => {
        setFocused(false);
        const raw = parseFloat(String(e.target.value).replace(/,/g, "")) || 0;
        setLocal(raw);
        prevMins.current = unit === "hrs" ? Math.round(raw * 60) : Math.round(raw);
        onCommit(raw);
      }}
      onChange={e => setLocal(e.target.value)}
    />
  );
}

// Speed-up input: Days / Hours / Minutes with total display
// mode: "dhm" = 3 fields, "hrs" = single hours field, "mins" = single minutes field
function SpeedupInput({ label, icon, dField, hField, mField, dVal, hVal, mVal, onChange, color, tabIndexBase, mode="dhm" }) {
  const [localD, setLocalD] = useState(dVal||0);
  const [localH, setLocalH] = useState(hVal||0);
  const [localM, setLocalM] = useState(mVal||0);

  // Sync from parent when values change externally
  const prevD = useRef(dVal); const prevH = useRef(hVal); const prevM = useRef(mVal);
  useEffect(() => { if (prevD.current !== dVal) { prevD.current = dVal; setLocalD(dVal||0); } }, [dVal]);
  useEffect(() => { if (prevH.current !== hVal) { prevH.current = hVal; setLocalH(hVal||0); } }, [hVal]);
  useEffect(() => { if (prevM.current !== mVal) { prevM.current = mVal; setLocalM(mVal||0); } }, [mVal]);

  const totalMins = localD*1440 + localH*60 + localM;
  const dispD = Math.floor(totalMins/1440);
  const dispH = Math.floor((totalMins%1440)/60);
  const dispM = totalMins%60;
  const fmtTotal = totalMins===0 ? "—"
    : [dispD>0?`${dispD}d`:"", dispH>0?`${dispH}h`:"", dispM>0?`${dispM}m`:""].filter(Boolean).join(" ");

  // Commit a total-minutes value back to D/H/M fields
  const commitMins = (mins) => {
    const m = Math.max(0, Math.round(mins));
    const d = Math.floor(m / 1440);
    const h = Math.floor((m % 1440) / 60);
    const mn = m % 60;
    setLocalD(d); setLocalH(h); setLocalM(mn);
    onChange(dField, d); onChange(hField, h); onChange(mField, mn);
  };

  const numStyle = {
    background:"var(--c-card)",border:"1px solid var(--c-border)",borderRadius:5,
    padding:"5px 8px",fontSize:13,color:color||"var(--c-textPri)",outline:"none",
    fontFamily:"Space Mono,monospace",textAlign:"right",fontWeight:700,
    transition:"border-color .15s",
  };
  const sepStyle = { fontSize:11, color:"var(--c-textDim)", fontFamily:"Space Mono,monospace", flexShrink:0 };

  return (
    <div style={{
      display:"flex",alignItems:"center",gap:10,
      background:"var(--c-surface)",border:"1px solid var(--c-border)",
      borderRadius:8,padding:"10px 14px",transition:"border-color .15s",
    }}
    onFocus={e=>e.currentTarget.style.borderColor="var(--c-accent)"}
    onBlur={e=>{ e.currentTarget.style.borderColor="var(--c-border)"; }}
    >
      <span style={{fontSize:13,color:"var(--c-textSec)",fontFamily:"Space Mono,monospace",flexShrink:0,width:24,textAlign:"center"}}>{icon}</span>
      <span style={{fontSize:12,fontWeight:600,color:"var(--c-textPri)",flexShrink:0,minWidth:100}}>{label}</span>

      {mode === "dhm" && (<>
        <input type="number" min={0} style={{...numStyle,width:64}} tabIndex={tabIndexBase}
          value={localD}
          onChange={e=>{const v=Math.max(0,parseInt(e.target.value)||0);setLocalD(v);}}
          onBlur={()=>onChange(dField,localD)}
          onFocus={e=>e.target.select()} />
        <span style={sepStyle}>d</span>
        <input type="number" min={0} max={23} style={{...numStyle,width:64}} tabIndex={tabIndexBase+1}
          value={localH}
          onChange={e=>{const v=Math.max(0,parseInt(e.target.value)||0);setLocalH(v);}}
          onBlur={()=>onChange(hField,localH)}
          onFocus={e=>e.target.select()} />
        <span style={sepStyle}>h</span>
        <input type="number" min={0} max={59} style={{...numStyle,width:64}} tabIndex={tabIndexBase+2}
          value={localM}
          onChange={e=>{const v=Math.max(0,parseInt(e.target.value)||0);setLocalM(v);}}
          onBlur={()=>onChange(mField,localM)}
          onFocus={e=>e.target.select()} />
        <span style={sepStyle}>m</span>
      </>)}

      {mode === "hrs" && (<>
        <SpeedupSingleInput
          totalMins={totalMins}
          unit="hrs"
          onCommit={raw => commitMins(raw * 60)}
          color={color}
          numStyle={numStyle}
          tabIndex={tabIndexBase}
        />
        <span style={sepStyle}>hrs</span>
      </>)}

      {mode === "mins" && (<>
        <SpeedupSingleInput
          totalMins={totalMins}
          unit="mins"
          onCommit={raw => commitMins(raw)}
          color={color}
          numStyle={numStyle}
          tabIndex={tabIndexBase}
        />
        <span style={sepStyle}>mins</span>
      </>)}

      <span style={{fontSize:12,fontFamily:"Space Mono,monospace",marginLeft:"auto",flexShrink:0,
        color:totalMins>0?(color||"var(--c-blue)"):"var(--c-textDim)"}}>
        {fmtTotal}
      </span>
    </div>
  );
}

function StatCard({ label, value, sub, color, prefix = "" }) {
  const isNeg = typeof value === "number" && value < 0;
  const cls = color || (isNeg ? "negative" : "");
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${cls}`}>{prefix}{fmt(value)}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className="section-label">{children}</div>;
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function InventoryPage({ inv, setInv }) {
  const update = (field, val) => setInv(p => ({ ...p, [field]: val }));
  const [speedMode, setSpeedMode] = useState("dhm"); // "dhm" | "hrs" | "mins"
  const toggleSpeedMode = (m) => {
    const y = window.scrollY;
    setSpeedMode(m);
    requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
  };

  const Section = ({ title, sub, children }) => (
    <div className="card" style={{marginBottom:16}}>
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          {sub && <div className="card-sub">{sub}</div>}
        </div>
      </div>
      <div className="card-body">
        <div className="res-grid">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="fade-in">

      <Section title="Construction Resources" sub="Fire Crystals & Refined FC — your core building currency">
        <ResInput label="Fire Crystals" icon="FC" field="fireCrystals" value={inv.fireCrystals} onChange={update} color={COLORS.accent} tabIndex={1} />
        <ResInput label="Refined FC"    icon="RF" field="refinedFC"    value={inv.refinedFC}    onChange={update} color={COLORS.accent} tabIndex={2} />
      </Section>

      <Section title="Research" sub="Shards, Steel & daily accumulation rates">
        <ResInput label="Shards"               icon="SH" field="shards"          value={inv.shards}               onChange={update} color={COLORS.blue} tabIndex={3} />
        <ResBigInput label="Steel"             icon="SL" field="steel"           value={inv.steel??0} unit={inv.steelUnit||"M"} onChangeVal={update} onChangeUnit={update} color={COLORS.blue} tabIndex={4} />
        <ResInput label="Daily Intel (shards)" icon="IN" field="dailyIntel"      value={inv.dailyIntel}           onChange={update} tabIndex={5} />
        <ResInput label="Steel / Hour"         icon="S/" field="steelHourlyRate" value={inv.steelHourlyRate ?? 0} onChange={update} tabIndex={6} />
      </Section>

      <Section title="Hero Level & Gear Materials" sub="Stones, Mithril & Mythic materials">
        <ResInput label="Stones"                 icon="ST" field="stones"          value={inv.stones}                onChange={update} color={COLORS.blue} tabIndex={7} />
        <ResInput label="Mithril"                icon="MI" field="mithril"         value={inv.mithril}               onChange={update} color={COLORS.blue} tabIndex={8} />
        <ResInput label="Consumable Mythic Gear" icon="MG" field="mythicGear"      value={inv.mythicGear}            onChange={update} color={COLORS.blue} tabIndex={9} />
        <ResInput label="Mythic General Shards"  icon="MS" field="mythicGenShards" value={inv.mythicGenShards ?? 0}  onChange={update} color={COLORS.blue} tabIndex={10} />
      </Section>

      <Section title="Chief Gear Materials" sub="Plans, Polish, Alloy & Amber">
        <ResInput label="Plans"  icon="PL" field="chiefPlans"  value={inv.chiefPlans}  onChange={update} tabIndex={11} />
        <ResInput label="Polish" icon="PO" field="chiefPolish" value={inv.chiefPolish} onChange={update} tabIndex={12} />
        <ResInput label="Alloy"  icon="AL" field="chiefAlloy"  value={inv.chiefAlloy}  onChange={update} tabIndex={13} />
        <ResInput label="Amber"  icon="AM" field="chiefAmber"  value={inv.chiefAmber}  onChange={update} tabIndex={14} />
      </Section>

      <Section title="Chief Charm Materials" sub="Designs, Guides & Secrets">
        <ResInput label="Designs" icon="DS" field="charmDesigns" value={inv.charmDesigns} onChange={update} tabIndex={15} />
        <ResInput label="Guides"  icon="GD" field="charmGuides"  value={inv.charmGuides}  onChange={update} tabIndex={16} />
        <ResInput label="Secrets" icon="SC" field="charmSecrets" value={inv.charmSecrets} onChange={update} tabIndex={17} />
      </Section>

      <Section title="Expert Resources" sub="Books of Knowledge & Expert Sigils">
        <ResInput label="Books of Knowledge" icon="BK" field="books"          value={inv.books}                onChange={update} color={COLORS.amber} tabIndex={18} />
        <ResInput label="General Sigils"     icon="GS" field="generalSigils"  value={inv.generalSigils}        onChange={update} color={COLORS.amber} tabIndex={19} />
        <ResInput label="Cyrille Sigils"     icon="CY" field="cyrilleSigils"  value={inv.cyrilleSigils  ?? 0}  onChange={update} color={COLORS.amber} tabIndex={20} />
        <ResInput label="Agnes Sigils"       icon="AN" field="agnesSigils"    value={inv.agnesSigils    ?? 0}  onChange={update} color={COLORS.amber} tabIndex={21} />
        <ResInput label="Romulus Sigils"     icon="RO" field="romulusSigils"  value={inv.romulusSigils  ?? 0}  onChange={update} color={COLORS.amber} tabIndex={22} />
        <ResInput label="Holger Sigils"      icon="HO" field="holgerSigils"   value={inv.holgerSigils   ?? 0}  onChange={update} color={COLORS.amber} tabIndex={23} />
        <ResInput label="Fabian Sigils"      icon="FA" field="fabianSigils"   value={inv.fabianSigils   ?? 0}  onChange={update} color={COLORS.amber} tabIndex={24} />
        <ResInput label="Baldur Sigils"      icon="BA" field="baldurSigils"   value={inv.baldurSigils   ?? 0}  onChange={update} color={COLORS.amber} tabIndex={25} />
        <ResInput label="Valeria Sigils"     icon="VA" field="valeriaSigils"  value={inv.valeriaSigils  ?? 0}  onChange={update} color={COLORS.amber} tabIndex={26} />
        <ResInput label="Ronne Sigils"       icon="RN" field="ronneSigils"    value={inv.ronneSigils    ?? 0}  onChange={update} color={COLORS.amber} tabIndex={27} />
        <ResInput label="Kathy Sigils"       icon="KT" field="kathySigils"    value={inv.kathySigils    ?? 0}  onChange={update} color={COLORS.amber} tabIndex={28} />
      </Section>

      <Section title="Raw Materials" sub="Basic resources — Meat, Wood, Coal, Iron">
        <ResBigInput label="Meat" icon="MT" field="meat" value={inv.meat??0} unit={inv.meatUnit||"M"} onChangeVal={update} onChangeUnit={update} color={COLORS.green} tabIndex={28} />
        <ResBigInput label="Wood" icon="WD" field="wood" value={inv.wood??0} unit={inv.woodUnit||"M"} onChangeVal={update} onChangeUnit={update} color={COLORS.green} tabIndex={29} />
        <ResBigInput label="Coal" icon="CL" field="coal" value={inv.coal??0} unit={inv.coalUnit||"M"} onChangeVal={update} onChangeUnit={update} color={COLORS.green} tabIndex={30} />
        <ResBigInput label="Iron" icon="IR" field="iron" value={inv.iron??0} unit={inv.ironUnit||"M"} onChangeVal={update} onChangeUnit={update} color={COLORS.green} tabIndex={31} />
      </Section>

      <Section title="Other / Misc. Items" sub="Stamina & Speed-ups">
        <ResInput label="Stamina (cans)" icon="🥤" field="stamina" value={inv.stamina??0} onChange={update} color={COLORS.green} tabIndex={32} />
        <div style={{gridColumn:"1/-1",display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
        <div style={{gridColumn:"1/-1",display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--c-textSec)",fontFamily:"Space Mono,monospace"}}>Speed-ups</div>
            <div style={{display:"flex",gap:4}}>
              {[["dhm","D/H/M"],["hrs","Hours"],["mins","Minutes"]].map(([m,lbl]) => (
                <button key={m} type="button" onClick={e=>{e.preventDefault();e.stopPropagation();toggleSpeedMode(m);}}
                  style={{padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:700,
                    cursor:"pointer",fontFamily:"Space Mono,monospace",
                    background: speedMode===m ? "var(--c-accentBg)" : "transparent",
                    color: speedMode===m ? "var(--c-accent)" : "var(--c-textDim)",
                    border: `1px solid ${speedMode===m ? "var(--c-accentDim)" : "var(--c-border)"}` }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <SpeedupInput label="General"        icon="GN" dField="speedGenD"      hField="speedGenH"      mField="speedGenM"      dVal={inv.speedGenD}      hVal={inv.speedGenH}      mVal={inv.speedGenM}      onChange={update} color={COLORS.blue}   tabIndexBase={33} mode={speedMode} />
          <SpeedupInput label="Troop Training" icon="TR" dField="speedTroopD"    hField="speedTroopH"    mField="speedTroopM"    dVal={inv.speedTroopD}    hVal={inv.speedTroopH}    mVal={inv.speedTroopM}    onChange={update} color={COLORS.green}  tabIndexBase={36} mode={speedMode} />
          <SpeedupInput label="Construction"   icon="CN" dField="speedConstD"    hField="speedConstH"    mField="speedConstM"    dVal={inv.speedConstD}    hVal={inv.speedConstH}    mVal={inv.speedConstM}    onChange={update} color={COLORS.accent} tabIndexBase={39} mode={speedMode} />
          <SpeedupInput label="Research"       icon="RS" dField="speedResearchD" hField="speedResearchH" mField="speedResearchM" dVal={inv.speedResearchD} hVal={inv.speedResearchH} mVal={inv.speedResearchM} onChange={update} color={COLORS.amber}  tabIndexBase={42} mode={speedMode} />
          <SpeedupInput label="Learning"       icon="LN" dField="speedLearningD" hField="speedLearningH" mField="speedLearningM" dVal={inv.speedLearningD} hVal={inv.speedLearningH} mVal={inv.speedLearningM} onChange={update} color={COLORS.blue}   tabIndexBase={45} mode={speedMode} />
          <SpeedupInput label="Healing"        icon="HL" dField="speedHealingD"  hField="speedHealingH"  mField="speedHealingM"  dVal={inv.speedHealingD}  hVal={inv.speedHealingH}  mVal={inv.speedHealingM}  onChange={update} color={COLORS.green}  tabIndexBase={48} mode={speedMode} />
        </div>
        </div>
      </Section>

    </div>
  );
}

function ConstructionPage({ inv }) {
  const maxPts = Math.max(...SVS_SCHEDULE.map(d => d.points), 1);

  // FC10 building requirements from your actual spreadsheet
  const fc10buildings = [
    { name: "Furnace",   currentFC: "FC8", goalFC: "FC10", fc: 2835, rfc: 600  },
    { name: "Embassy",   currentFC: "FC8", goalFC: "FC10", fc: 706,  rfc: 146  },
    { name: "Infantry",  currentFC: "FC8", goalFC: "FC10", fc: 1273, rfc: 266  },
    { name: "Marksman",  currentFC: "FC8", goalFC: "FC10", fc: 1273, rfc: 266  },
    { name: "Lancer",    currentFC: "FC8", goalFC: "FC10", fc: 1273, rfc: 266  },
    { name: "Command",   currentFC: "FC8", goalFC: "FC10", fc: 567,  rfc: 120  },
    { name: "Infirmary", currentFC: "FC8", goalFC: "FC8",  fc: 0,    rfc: 0    },
    { name: "WA",        currentFC: "FC8", goalFC: "FC8",  fc: 0,    rfc: 0    },
  ];
  const totalFC  = fc10buildings.reduce((s,b) => s+b.fc, 0);
  const totalRFC = fc10buildings.reduce((s,b) => s+b.rfc, 0);
  const fcStatus  = inv.fireCrystals - totalFC;
  const rfcStatus = inv.refinedFC - totalRFC;

  return (
    <div className="fade-in">
      <div className="stat-grid">
        <StatCard label="Total FC needed" value={totalFC} sub="all FC10 upgrades" color="accent" />
        <StatCard label="Total RFC needed" value={totalRFC} sub="all FC10 upgrades" color="accent" />
        <StatCard label="FC after upgrades" value={fcStatus} />
        <StatCard label="RFC after upgrades" value={rfcStatus} />
        <StatCard label="Your FC" value={inv.fireCrystals} sub="current inventory" />
        <StatCard label="Your RFC" value={inv.refinedFC} sub="current inventory" />
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">FC10 Upgrade Requirements</div>
            <div className="card-sub">Direct from your FC10 Calculations sheet</div>
          </div>
          <div className="badge" style={{ background: fcStatus >= 0 ? COLORS.greenBg : COLORS.redBg, color: fcStatus >= 0 ? COLORS.green : COLORS.red, border: `1px solid ${fcStatus >= 0 ? COLORS.greenDim : COLORS.redDim}` }}>
            {fcStatus >= 0 ? "SUFFICIENT" : "SHORTFALL"}
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Building</th>
                  <th>Current</th>
                  <th>Goal</th>
                  <th style={{textAlign:"right"}}>FC Cost</th>
                  <th style={{textAlign:"right"}}>RFC Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {fc10buildings.map(b => {
                  const feasible = b.fc === 0 || (inv.fireCrystals >= b.fc && inv.refinedFC >= b.rfc);
                  return (
                    <tr key={b.name}>
                      <td className="pri">{b.name}</td>
                      <td><span className="badge badge-blue">{b.currentFC}</span></td>
                      <td><span className={`badge ${b.goalFC === b.currentFC ? "badge-accent" : "badge-green"}`}>{b.goalFC}</span></td>
                      <td className={b.fc > 0 ? "accent" : "mono"} style={{textAlign:"right"}}>{b.fc > 0 ? fmtFull(b.fc) : "—"}</td>
                      <td className={b.rfc > 0 ? "amber" : "mono"} style={{textAlign:"right"}}>{b.rfc > 0 ? fmtFull(b.rfc) : "—"}</td>
                      <td>
                        {b.fc === 0
                          ? <span className="badge badge-accent">DONE</span>
                          : <span className={`badge ${feasible ? "badge-green" : "badge-red"}`}>{feasible ? "OK" : "SHORT"}</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${COLORS.borderHi}` }}>
                  <td className="pri" colSpan={3} style={{ paddingTop: 14 }}>TOTAL REQUIRED</td>
                  <td className="accent" style={{ textAlign: "right", paddingTop: 14 }}>{fmtFull(totalFC)}</td>
                  <td className="amber" style={{ textAlign: "right", paddingTop: 14 }}>{fmtFull(totalRFC)}</td>
                  <td style={{ paddingTop: 14 }}>
                    <span className={`badge ${fcStatus >= 0 ? "badge-green" : "badge-red"}`}>
                      {fcStatus >= 0 ? `+${fmt(fcStatus)}` : fmt(fcStatus)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">SVS Week Point Schedule</div>
        </div>
        <div className="card-body">
          {SVS_SCHEDULE.map(d => (
            <div className="svs-row" key={d.day}>
              <div className="svs-day">{d.day}</div>
              <div className="svs-bar-wrap">
                <div className="progress-wrap">
                  <div className="progress-bar" style={{ width: `${(d.points/maxPts)*100}%`, background: d.points > 2000000 ? COLORS.accent : d.points > 0 ? COLORS.blue : COLORS.border }} />
                </div>
              </div>
              <div className="svs-pts">{d.points > 0 ? fmt(d.points) : "TBD"}</div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: "12px 16px", background: COLORS.accentBg, border: `1px solid ${COLORS.accentDim}`, borderRadius: 8, fontSize: 12, color: COLORS.textSec }}>
            <span style={{ color: COLORS.accent, fontWeight: 700 }}>Total estimated:</span> {fmt(SVS_SCHEDULE.reduce((s,d) => s+d.points,0))} pts — does not include beasts/terror kills
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpertsPage({ inv, setInv }) {
  const C = COLORS;

  // ── Expert Data Tables ──────────────────────────────────────────────────────

  // Per-level sigil costs for each expert (index = level, value = sigils to reach that level)
  const EXPERT_LEVEL_SIGILS = {
    Cyrille: [0,1000,200,210,220,230,240,260,280,300,320,340,360,380,400,420,440,460,480,500,520,540,560,580,600,620,640,660,680,700,730,760,790,820,850,880,910,940,970,1000,1040,1080,1120,1160,1200,1240,1280,1320,1360,1400,1450,1500,1550,1600,1650,1700,1750,1800,1850,1900,1950,2000,2050,2100,2150,2200,2250,2300,2350,2400,2450,2500,2550,2600,2650,2700,2750,2800,2850,2900,2950,3000,3050,3100,3150,3200,3250,3300,3350,3400,3450,3500,3550,3600,3650,3700,3750,3800,3850,3900,3950],
    Agnes:   [0,1000,240,260,270,280,290,320,340,360,390,410,440,460,480,510,530,560,580,600,630,650,680,700,720,750,770,800,820,840,880,920,950,990,1020,1060,1100,1130,1170,1210,1250,1300,1350,1400,1440,1490,1540,1590,1640,1680,1740,1800,1860,1920,1980,2040,2100,2160,2220,2280,2340,2400,2460,2520,2580,2640,2700,2760,2820,2880,2940,3000,3060,3120,3180,3240,3300,3360,3420,3480,3540,3600,3660,3720,3780,3840,3900,3960,4020,4080,4140,4200,4260,4320,4380,4440,4500,4560,4620,4680,4740],
    Romulus: [0,1000,1100,1160,1210,1270,1320,1430,1540,1650,1760,1870,1980,2090,2200,2310,2420,2530,2640,2750,2860,2970,3080,3190,3300,3520,3620,3720,3820,3920,4020,4180,4350,4510,4680,4840,5000,5170,5330,5500,5720,5940,6160,6380,6600,6820,7040,7260,7480,7700,7980,8250,8530,8800,9080,9350,9630,9900,10180,10450,10730,11000,11280,11560,11830,12110,12380,12660,12930,13210,13480,13750,14030,14300,14580,14850,15130,15400,15680,15950,16230,16500,16780,17050,17330,17600,17880,18150,18430,18700,18980,19250,19530,19800,20080,20350,20630,20900,21180,21450,21730],
    Holger:  [0,1000,600,630,660,690,720,780,840,900,960,1020,1080,1140,1200,1260,1320,1380,1440,1500,1560,1620,1680,1740,1800,1860,1920,1980,2040,2100,2190,2280,2370,2460,2550,2640,2730,2820,2910,3000,3120,3240,3360,3480,3600,3720,3840,3960,4080,4200,4350,4500,4650,4800,4950,5100,5250,5400,5550,5700,5850,6000,6150,6300,6450,6600,6750,6900,7050,7200,7350,7500,7650,7800,7950,8100,8250,8400,8550,8700,8850,9000,9150,9300,9450,9600,9750,9900,10050,10200,10350,10500,10650,10800,10950,11100,11250,11400,11550,11700,11850],
    Fabian:  [0,1000,1000,1050,1100,1150,1200,1300,1400,1500,1600,1700,1800,1900,2000,2100,2200,2300,2400,2500,2600,2700,2800,2900,3000,3100,3200,3300,3400,3500,3650,3800,3950,4100,4250,4400,4550,4700,4850,5000,5200,5400,5600,5800,6000,6200,6400,6600,6800,7000,7250,7500,7750,8000,8250,8500,8750,9000,9250,9500,9750,10000,10250,10500,10750,11000,11250,11500,11750,12000,12250,12500,12750,13000,13250,13500,13750,14000,14250,14500,14750,15000,15250,15500,15750,16000,16250,16500,16750,17000,17250,17500,17750,18000,18250,18500,18750,19000,19250,19500,19750],
    Baldur:  [0,1000,400,420,440,460,480,520,560,600,640,680,720,760,800,840,880,920,960,1000,1040,1080,1120,1160,1200,1240,1280,1320,1360,1400,1460,1520,1580,1640,1700,1760,1820,1880,1940,2000,2080,2160,2240,2320,2400,2480,2560,2640,2720,2800,2900,3000,3100,3200,3300,3400,3500,3600,3700,3800,3900,4000,4100,4200,4300,4400,4500,4600,4700,4800,4900,5000,5100,5200,5300,5400,5500,5600,5700,5800,5900,6000,6100,6200,6300,6400,6500,6600,6700,6800,6900,7000,7100,7200,7300,7400,7500,7600,7700,7800,7900],
    Valeria: [0,1000,1840,1940,2030,2120,2210,2400,2580,2760,2950,3130,3320,3500,3680,3870,4050,4240,4420,4600,4790,4970,5160,5340,5520,5710,5890,6080,6260,6440,6720,7000,7270,7550,7820,8100,8380,8650,8930,9200,9570,9940,10310,10680,11040,11410,11780,12150,12520,12880,13340,13800,14260,14720,15180,15640,16100,16560,17020,17480,17940,18400,18860,19320,19780,20240,20700,21160,21620,22080,22540,23000,23460,23920,24380,24840,25300,25760,26220,26680,27140,27600,28060,28520,28980,29440,29900,30360,30820,31280,31740,32200,32660,33120,33580,34040,34500,34960,34960,35880,36340],
    Ronne:   [0,1000,600,630,660,690,720,780,840,900,960,1020,1080,1140,1200,1260,1320,1380,1440,1500,1560,1620,1680,1740,1800,1860,1920,1980,2040,2100,2190,2280,2370,2460,2550,2640,2730,2820,2910,3000,3120,3240,3360,3480,3600,3720,3840,3960,4080,4200,4350,4500,4650,4800,4950,5100,5250,5400,5550,5700,5850,6000,6150,6300,6450,6600,6750,6900,7050,7200,7350,7500,7650,7800,7950,8100,8250,8400,8550,8700,8850,9000,9150,9300,9450,9600,9750,9900,10050,10200,10350,10500,10650,10800,10950,11100,11250,11400,11550,11700,11850],
    Kathy:   [0,1000,900,950,990,1040,1080,1170,1260,1350,1440,1530,1620,1710,1800,1890,1980,2070,2160,2250,2340,2430,2520,2610,2700,2790,2880,2970,3060,3150,3290,3420,3560,3690,3830,3960,4100,4230,4370,4500,4680,4860,5040,5220,5400,5580,5760,5940,6120,6300,6530,6750,6980,7200,7430,7650,7880,8100,8330,8550,8780,9000,9230,9450,9680,9900,10130,10350,10580,10800,11030,11250,11480,11700,11930,12150,12380,12600,12830,13050,13280,13500,13730,13950,14180,14400,14630,14850,15080,15300,15530,15750,15980,16200,16430,16650,16880,17100,17330,17550,17780],
  };

  // Skill book costs: [books_to_reach_S1, S2, S3, ... S20] — 0-indexed so index=skill level
  // null = that level doesn't exist for this expert/skill
  const SKILL_BOOK_COSTS = {
    Cyrille: {
      sk1: [0,0,70,140,210,280,350,420,490,560,630,null,null,null,null,null,null,null,null,null,null],
      sk2: [0,0,400,800,1600,3200,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sk3: [0,0,500,1000,2000,4000,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sk4: [0,0,100,200,300,400,500,600,700,800,900,null,null,null,null,null,null,null,null,null,null],
    },
    Agnes: {
      sk1: [0,0,500,1000,2000,4000,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sk2: [0,0,400,800,1600,3200,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sk3: [0,0,200,400,800,1600,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sk4: [0,0,100,200,300,400,500,600,700,800,900,null,null,null,null,null,null,null,null,null,null],
    },
    Romulus: {
      sk1: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      sk2: [0,0,500,1000,1500,2000,2500,3000,3500,4000,4500,5000,5500,6000,7000,8000,8000,9000,9000,10000,10000],
      sk3: [0,0,800,1500,2200,3000,3800,4500,5200,6000,6800,7500,8200,9000,10500,12000,12000,13500,13500,15000,15000],
      sk4: [0,0,800,1500,2200,3000,3800,4500,5200,6000,6800,7500,8200,9000,10500,12000,12000,13500,13500,15000,15000],
    },
    Holger: {
      // Arena Elite (Lv 10) — wiki: 600/1200/1800/2400/3000/3600/4200/4800/5400
      sk1: [0,0,600,1200,1800,2400,3000,3600,4200,4800,5400,null,null,null,null,null,null,null,null,null,null],
      // Crowd Pleaser (Lv 10) — wiki: 300/600/900/1200/1500/1800/2100/2400/2700
      sk2: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Arena Star (Lv 10) — wiki: 300/600/900/1200/1500/1800/2100/2400/2700
      sk3: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Legacy (Lv 10) — wiki: 600/1200/1800/2400/3000/3600/4200/4800/5400
      sk4: [0,0,600,1200,1800,2400,3000,3600,4200,4800,5400,null,null,null,null,null,null,null,null,null,null],
    },
    Fabian: {
      // Salvager (Lv 10) — wiki: 300/600/900/1200/1500/1800/2100/2400/2700
      sk1: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Crisis Rescue (Lv 10) — wiki: 500/1000/1500/2000/2500/3000/3500/4000/4500
      sk2: [0,0,500,1000,1500,2000,2500,3000,3500,4000,4500,null,null,null,null,null,null,null,null,null,null],
      // Heightened Firepower (Lv 20) — wiki: 200/500/700/1000/1200/1500/1700/2000/2300/2500/2700/3000/3500/4000/4000/4500/4500/5100/5100
      sk3: [0,0,200,500,700,1000,1200,1500,1700,2000,2300,2500,2700,3000,3500,4000,4000,4500,4500,5100,5100],
      // Battle Bulwark (Lv 20) — wiki: 300/700/1000/1400/1800/2100/2400/2800/3200/3500/3800/4200/4900/5700/5700/6400/6400/7100/7100
      sk4: [0,0,300,700,1000,1400,1800,2100,2400,2800,3200,3500,3800,4200,4900,5700,5700,6400,6400,7100,7100],
    },
    Baldur: {
      // Blazing Sunrise (Lv 10) — wiki: 300/600/900/1200/1500/1800/2100/2400/2700
      sk1: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Honored Conquest (Lv 10) — wiki: 300/600/900/1200/1500/1800/2100/2400/2700
      sk2: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Bounty Hunter (Lv 10) — wiki: 300/600/900/1200/1500/1800/2100/2400/2700
      sk3: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Dawn Hymn (Lv 10) — wiki: 500/1000/1500/2000/2500/3000/3500/4000/4500
      sk4: [0,0,500,1000,1500,2000,2500,3000,3500,4000,4500,null,null,null,null,null,null,null,null,null,null],
    },
    Valeria: {
      // Well Prepared (Lv 10) — wiki: 500/1000/1500/2000/2500/3000/3500/4000/4500
      sk1: [0,0,500,1000,1500,2000,2500,3000,3500,4000,4500,null,null,null,null,null,null,null,null,null,null],
      // Radiant Honor (Lv 10) — wiki: 500/1000/1500/2000/2500/3000/3500/4000/4500
      sk2: [0,0,500,1000,1500,2000,2500,3000,3500,4000,4500,null,null,null,null,null,null,null,null,null,null],
      // Battle Concerto (Lv 20) — wiki: 800/1500/2200/3000/3800/4500/5200/6000/6800/7500/8200/9000/10500/12000/12000/13500/13500/15000/15000
      sk3: [0,0,800,1500,2200,3000,3800,4500,5200,6000,6800,7500,8200,9000,10500,12000,12000,13500,13500,15000,15000],
      // Crushing Force (Lv 20) — wiki: 800/1500/2200/3000/3800/4500/5200/6000/6800/7500/8200/9000/10500/12000/12000/13500/13500/15000/15000
      sk4: [0,0,800,1500,2200,3000,3800,4500,5200,6000,6800,7500,8200,9000,10500,12000,12000,13500,13500,15000,15000],
    },
    Ronne: {
      // Cartographic Memory (Lv 10)
      sk1: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Treasure Scent (Lv 10)
      sk2: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Giving Back (Lv 10)
      sk3: [0,0,600,1200,1800,2400,3000,3600,4200,4800,5400,null,null,null,null,null,null,null,null,null,null],
      // Gold Class (Lv 10)
      sk4: [0,0,1200,2400,3600,4800,6000,7200,8400,9600,10800,null,null,null,null,null,null,null,null,null,null],
    },
    Kathy: {
      // Icefire Hunter (Lv 10): books per level from wiki
      sk1: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Valorous Cold (Lv 10): books per level from wiki
      sk2: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Winter Treasures (Lv 10): books per level from wiki
      sk3: [0,0,1000,2000,3000,4000,5000,6000,7000,8000,9000,null,null,null,null,null,null,null,null,null,null],
      // Efficient Mining (Lv 10): books per level from wiki
      sk4: [0,0,1200,2400,3600,4800,6000,7200,8400,9600,10800,null,null,null,null,null,null,null,null,null,null],
    },
  };

  // Affinity (Bonus) levels — sigils needed to reach each B level
  const AFFINITY_SIGILS = {
    Cyrille: [0,0,5,10,15,20,25,30,35,40,45,50],
    Agnes:   [0,0,5,10,15,20,25,30,35,40,45,50],
    Romulus: [0,0,20,40,80,120,160,200,240,280,320,360],
    Holger:  [0,0,8,16,24,32,40,48,56,64,72,80],
    Fabian:  [0,0,12,24,36,48,60,72,84,96,108,120],
    Baldur:  [0,0,6,12,18,24,30,36,42,48,54,60],
    Valeria: [0,0,20,40,60,80,100,120,140,160,180,200],
    Ronne:   [0,0,8,16,24,32,40,48,56,64,72,80],
    Kathy:   [0,0,10,20,30,40,50,60,70,80,90,100],
  };

  const AFFINITY_NAMES = ["0","1","2","3","4","5","6","7","8","9","10","11"];
  const AFFINITY_LABELS = ["—","Stranger","Acquaintance 1","Acquaintance 2","Acquaintance 3","Casual 1","Casual 2","Casual 3","Close 1","Close 2","Close 3","Intimate"];

  // Bonus (affinity) skill values per expert per B-level
  const BONUS_VALUES = {
    Cyrille: ["0%","2%","4%","6%","9%","12%","15%","18%","21%","24%","27%","30%"],
    Agnes:   ["—","1 (max 10)","1 (max 12)","1 (max 14)","2 (max 16)","2 (max 18)","3 (max 20)","3 (max 22)","4 (max 24)","4 (max 26)","5 (max 28)","5 (max 30)"],
    Romulus: ["—","+300","+600","+1,000","+1,500","+200","+3,000","+4,000","+5,500","+7,000","+8,500","+10,000"],
    Holger:  ["—","50% | 1","55% | 1","60% | 1","65% | 1","70% | 1","75% | 2","80% | 2","85% | 2","90% | 2","95% | 2","100% | 3"],
    Fabian:  ["0%","2%","4%","6%","9%","12%","15%","18%","21%","24%","27%","30%"],
    Baldur:  ["5% | 20%","5% | 20%","5% | 28%","5% | 36%","5% | 44%","5% | 52%","10% | 60%","10% | 68%","10% | 76%","10% | 84%","10% | 92%","15% | 100%"],
    Valeria: ["0%","2%","4%","6%","9%","12%","15%","18%","21%","24%","27%","30%"],
    Ronne:   ["0%","2%","4%","6%","9%","12%","15%","18%","21%","24%","27%","30%"],
    Kathy:   ["—","—","—","—","—","—","—","—","—","—","—","—"],
  };

  // Expert roster definition
  const EXPERTS = [
    {
      name: "Cyrille", invKey: "cyrilleSigils", color: "#4A9EBF",
      bonus: "Hunter's Heart", bonusDesc: "Increases Bear Damage",
      skills: [
        { name: "Entrapment",    desc: "Bear trap rally cap",          maxSk: 10 },
        { name: "Scavenging",    desc: "Additional XP components",     maxSk: 5  },
        { name: "Weapon Master", desc: "Additional Essence Stones",    maxSk: 5  },
        { name: "Ursa's Bane",   desc: "Deployment capacity",          maxSk: 10 },
      ],
    },
    {
      name: "Agnes", invKey: "agnesSigils", color: "#7B9E6B",
      bonus: "Earthbreaker", bonusDesc: "Chests from gathering",
      skills: [
        { name: "Efficient Recon",  desc: "Extra Intel missions/day",          maxSk: 5  },
        { name: "Optimization",     desc: "Additional Stamina",                maxSk: 5  },
        { name: "Project Mgmt",     desc: "Construction speed on new builds",  maxSk: 5  },
        { name: "Covert Knowledge", desc: "Mystery Badges + Shop refreshes",   maxSk: 10 },
      ],
    },
    {
      name: "Romulus", invKey: "romulusSigils", color: "#C0392B",
      bonus: "Commander's Crest", bonusDesc: "Increases Expedition Army size (Deployment Capacity)",
      skills: [
        { name: "Call of War",      desc: "+600 free troops/day from Camp + 10 daily Loyalty Tags", maxSk: 10 },
        { name: "Last Line",        desc: "Troops' Attack & Defense +10%",                          maxSk: 20 },
        { name: "Spirit of Aeetes", desc: "Troops' Lethality & Health +10%",                       maxSk: 20 },
        { name: "One Heart",        desc: "+100,000 Rally Capacity",                                maxSk: 20 },
      ],
    },
    {
      name: "Holger", invKey: "holgerSigils", color: "#8E44AD",
      bonus: "Blade Dancing", bonusDesc: "100% chance of 3 Arena Star Chests from audience",
      skills: [
        { name: "Arena Elite",   desc: "Arena heroes Attack & Health +20%",              maxSk: 10 },
        { name: "Crowd Pleaser", desc: "+50% daily & weekly Arena Tokens earned",        maxSk: 10 },
        { name: "Arena Star",    desc: "+3 Arena Shop items at 50% discount",            maxSk: 10 },
        { name: "Legacy",        desc: "Arena heroes Attack & Health +20% (in Arena)",   maxSk: 10 },
      ],
    },
    {
      name: "Fabian", invKey: "fabianSigils", color: "#D4A017",
      bonus: "Craftsman of War", bonusDesc: "+30% Troops Attack & Defense in Foundry Battle & Hellfire",
      skills: [
        { name: "Salvager",             desc: "+100% Arsenal Tokens",                                       maxSk: 10 },
        { name: "Crisis Rescue",        desc: "Instant recovery of 1,000,000 troops per Foundry/Hellfire",  maxSk: 10 },
        { name: "Heightened Firepower", desc: "+30% Troops Lethality & Health in Foundry/Hellfire",         maxSk: 20 },
        { name: "Battle Bulwark",       desc: "+150,000 Rally Capacity in Foundry/Hellfire",                maxSk: 20 },
      ],
    },
    {
      name: "Baldur", invKey: "baldurSigils", color: "#16A085",
      bonus: "Master Negotiator", bonusDesc: "-15% Alliance Shop prices, +100% Triumph Chest rewards",
      skills: [
        { name: "Blazing Sunrise",  desc: "+20% Alliance Mobilization Points, +3 milestone tiers", maxSk: 10 },
        { name: "Honored Conquest", desc: "+50% Alliance Championship Badges, +3 AC Shop items",   maxSk: 10 },
        { name: "Bounty Hunter",    desc: "+50% Crazy Joe points, +1 chest per 200K pts (max 10)", maxSk: 10 },
        { name: "Dawn Hymn",        desc: "+50% Alliance Showdown points, +3 daily milestone tiers", maxSk: 10 },
      ],
    },
    {
      name: "Valeria", invKey: "valeriaSigils", color: "#E3731A",
      bonus: "Conqueror's Spirit", bonusDesc: "Troops Attack & Defense +30% in SvS Battle Phase",
      skills: [
        { name: "Well Prepared",   desc: "+20% SvS prep point gains, +3 Personal Point reward tiers", maxSk: 10 },
        { name: "Radiant Honor",   desc: "+50 Sunfire Tokens from Medal Rewards, +3 SvS Shop items",  maxSk: 10 },
        { name: "Battle Concerto", desc: "Troops Lethality & Health +30% in SvS Battle Phase",        maxSk: 20 },
        { name: "Crushing Force",  desc: "Rally Capacity +150,000 in SvS Battle Phase",               maxSk: 20 },
      ],
    },
    {
      name: "Ronne", invKey: "ronneSigils", color: "#2980B9",
      bonus: "Trade Dominion", bonusDesc: "+30% Troops Attack & Defense during raids",
      skills: [
        { name: "Cartographic Memory", desc: "+20% arrival speed, +3 free refreshes/truck", maxSk: 10 },
        { name: "Treasure Scent",      desc: "+100% chance of raiding 1 extra cargo",       maxSk: 10 },
        { name: "Giving Back",         desc: "+50% chance recovering 1 cargo + 2 Elite Guardboxes", maxSk: 10 },
        { name: "Gold Class",          desc: "Legendary escort every 4 missions, +1 truck at Lv 10", maxSk: 10 },
      ],
    },
    {
      name: "Kathy", invKey: "kathySigils", color: "#636e72",
      bonus: "Child of Frost", bonusDesc: "Troops Lethality & Health in Frostfire Mine",
      skills: [
        { name: "Icefire Hunter",  desc: "50% extra XP from Mine Patrol defeats",         maxSk: 10 },
        { name: "Valorous Cold",   desc: "+50,000 troop cap, -60% hero recovery time",    maxSk: 10 },
        { name: "Winter Treasures",desc: "+60 Charm Designs per 200K Orichalcum",         maxSk: 10 },
        { name: "Efficient Mining",desc: "5,000 Orichalcum/min + 100 Charm Guides",       maxSk: 10 },
      ],
    },
  ];

  // ── State ────────────────────────────────────────────────────────────────────
  const [expertData, setExpertData] = useLocalStorage("experts-data", {});
  const [openCard, setOpenCard] = React.useState(null);

  const getExpert = (name) => expertData[name] || {};
  const setExpert = (name, updates) => {
    setExpertData(prev => ({ ...prev, [name]: { ...(prev[name] || {}), ...updates } }));
  };

  // ── Calculation helpers ──────────────────────────────────────────────────────

  const calcLevelSigils = (expertName, curLv, goalLv) => {
    const costs = EXPERT_LEVEL_SIGILS[expertName];
    if (!costs || goalLv <= curLv) return 0;
    let total = 0;
    for (let i = curLv + 1; i <= goalLv; i++) {
      total += costs[i] ?? 0;
    }
    return total;
  };

  const calcSkillBooks = (expertName, skKey, curSk, goalSk) => {
    const skCosts = SKILL_BOOK_COSTS[expertName]?.[skKey];
    if (!skCosts || goalSk <= curSk) return 0;
    let total = 0;
    for (let i = curSk + 1; i <= goalSk; i++) {
      total += skCosts[i] ?? 0;
    }
    return total;
  };

  const calcAffinitySigils = (expertName, curB, goalB) => {
    const costs = AFFINITY_SIGILS[expertName];
    if (!costs || goalB <= curB) return 0;
    let total = 0;
    for (let i = curB + 1; i <= goalB; i++) {
      total += costs[i] ?? 0;
    }
    return total;
  };

  const getExpertTotals = (expert) => {
    const d = getExpert(expert.name);
    const curLv = Number(d.level ?? 0);
    const goalLv = Number(d.goalLevel ?? curLv);
    const curB   = Number(d.affinity ?? 0);
    const goalB  = Number(d.goalAffinity ?? curB);

    const levelSigils = calcLevelSigils(expert.name, curLv, goalLv);
    const affinitySigils = calcAffinitySigils(expert.name, curB, goalB);

    let skillBooks = 0;
    ['sk1','sk2','sk3','sk4'].forEach((sk, i) => {
      const curSk  = Number(d[`${sk}Level`]  ?? 0);
      const goalSk = Number(d[`${sk}Goal`]   ?? curSk);
      skillBooks += calcSkillBooks(expert.name, sk, curSk, goalSk);
    });

    return {
      sigils: levelSigils + affinitySigils,
      books: skillBooks,
      levelSigils,
      affinitySigils,
    };
  };

  const getSkillMax = (expert, skKey) => {
    const costs = SKILL_BOOK_COSTS[expert.name]?.[skKey];
    if (!costs) return null;
    // Find last non-null index
    let max = 0;
    for (let i = costs.length - 1; i >= 0; i--) {
      if (costs[i] !== null) { max = i; break; }
    }
    return max;
  };

  const isComingSoon = (expert) => false; // All experts now have full data

  // ── Sigil inventory updater (syncs back to inv) ──────────────────────────────
  const updateSigils = (invKey, val) => {
    const numVal = Math.max(0, Number(val) || 0);
    setInv(prev => ({ ...prev, [invKey]: numVal }));
  };

  // ── Sub-components ───────────────────────────────────────────────────────────

  const AffinityTag = ({ level }) => {
    const labels = ["—","Stranger","Acq. 1","Acq. 2","Acq. 3","Casual 1","Casual 2","Casual 3","Close 1","Close 2","Close 3","Intimate"];
    const colors = ["#444","#666","#2980B9","#2980B9","#2980B9","#16A085","#16A085","#16A085","#8E44AD","#8E44AD","#8E44AD","#E3731A"];
    return (
      <span style={{
        fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10,
        background: colors[level] + "33", color: colors[level] || "#888",
        border:`1px solid ${colors[level] || "#888"}55`,
        fontFamily:"'Space Mono',monospace", letterSpacing:"0.3px",
      }}>{labels[level] || "—"}</span>
    );
  };

  const SkillRow = ({ expert, skKey, label, desc, skIdx }) => {
    const d = getExpert(expert.name);
    const maxSk = getSkillMax(expert, skKey);
    if (maxSk === null) {
      return (
        <div style={{ padding:"10px 0", borderBottom:`1px solid ${C.border}`, opacity:0.5 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textSec }}>{label}</div>
          <div style={{ fontSize:11, color:C.textDim, fontFamily:"'Space Mono',monospace" }}>{desc} — coming soon</div>
        </div>
      );
    }

    const curSk = Number(d[`${skKey}Level`] ?? 0);
    const goalSk = Number(d[`${skKey}Goal`] ?? curSk);
    const booksNeeded = calcSkillBooks(expert.name, skKey, curSk, goalSk);
    const atMax = curSk >= maxSk;

    const setCur = (v) => {
      const newCur = Math.min(maxSk, Math.max(0, Number(v)));
      const newGoal = Math.max(newCur, Math.min(maxSk, goalSk));
      setExpert(expert.name, { [`${skKey}Level`]: newCur, [`${skKey}Goal`]: newGoal });
    };
    const setGoal = (v) => {
      const newGoal = Math.min(maxSk, Math.max(curSk, Number(v)));
      setExpert(expert.name, { [`${skKey}Goal`]: newGoal });
    };

    const skLevels = Array.from({ length: maxSk + 1 }, (_, i) => i);

    return (
      <div style={{ padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.textPri }}>{label}</div>
            <div style={{ fontSize:10, color:C.textDim, fontFamily:"'Space Mono',monospace", marginTop:1 }}>{desc}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
              <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Current</span>
              <select value={curSk} onChange={e => setCur(e.target.value)}
                style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:5,
                  color:C.textPri, padding:"3px 4px", fontSize:12, fontFamily:"'Space Mono',monospace",
                  width:56, textAlign:"center" }}>
                {skLevels.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <span style={{ color:C.textDim, fontSize:14, marginTop:12 }}>→</span>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
              <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Goal</span>
              <select value={goalSk} onChange={e => setGoal(e.target.value)}
                style={{ background:C.surface, border:`1px solid ${atMax ? C.green : C.border}`, borderRadius:5,
                  color: atMax ? C.green : C.textPri, padding:"3px 4px", fontSize:12,
                  fontFamily:"'Space Mono',monospace", width:56, textAlign:"center" }}>
                {skLevels.filter(i => i >= curSk).map(i => (
                  <option key={i} value={i}>{i === maxSk ? `${i} ★` : `${i}`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {goalSk > curSk && (
          <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:10, color:C.amber, fontFamily:"'Space Mono',monospace" }}>
              📚 {booksNeeded.toLocaleString()} Books needed
            </span>
          </div>
        )}
        {atMax && (
          <div style={{ marginTop:4 }}>
            <span style={{ fontSize:10, color:C.green, fontFamily:"'Space Mono',monospace" }}>✓ MAX</span>
          </div>
        )}
      </div>
    );
  };

  const ExpertPowerDisplay = ({ expert, d, C }) => {
    const name = expert.name;
    const curLv = Number(d.level    ?? 0);
    const curB  = Number(d.affinity ?? 0);

    const lpCfg = EXPERT_LEVEL_POWER[name];
    const levelPower    = lpCfg ? Math.round(lpCfg.rate * (curLv + lpCfg.offset)) : null;
    const levelApprox   = lpCfg && !["Cyrille","Agnes","Romulus"].includes(name);
    const affRate       = EXPERT_AFFINITY_POWER_RATE[name];
    const affinityPower = affRate ? affRate * curB : null;
    const talRate       = EXPERT_TALENT_POWER_RATE[name];
    const talentPower   = talRate ? talRate * curB : null;

    const skPower = EXPERT_SKILL_POWER[name];
    let skillPower = 0, skillKnown = false;
    if (skPower) {
      skillKnown = true;
      ["sk1","sk2","sk3","sk4"].forEach(sk => {
        skillPower += (skPower[sk] ?? 0) * Number(d[`${sk}Level`] ?? 0);
      });
    }

    const total = (levelPower ?? 0) + (affinityPower ?? 0) + (talentPower ?? 0) + skillPower;
    if (!levelPower && !affinityPower) return null;
    const fmt = n => Math.round(n).toLocaleString();
    const PRow = ({ label, value, approx, unknown }) => (
      <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0",
        borderBottom:`1px solid ${C.border}` }}>
        <span style={{ fontSize:12, color: unknown ? C.textDim : C.textSec }}>{label}</span>
        <span style={{ fontSize:12, fontFamily:"'Space Mono',monospace", fontWeight:700,
          color: unknown ? C.textDim : C.textPri }}>
          {unknown ? "—" : fmt(value)}
          {approx && !unknown && <span style={{ fontSize:9, color:C.amber, marginLeft:3 }}>~</span>}
        </span>
      </div>
    );
    return (
      <div style={{ paddingTop:14, borderTop:`1px solid ${C.border}`, marginTop:10 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.textDim, textTransform:"uppercase",
          letterSpacing:"1.5px", fontFamily:"'Space Mono',monospace", marginBottom:8 }}>
          Power Estimate
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"7px 10px", borderRadius:7, marginBottom:6,
          background:(C.accentBg || C.surface), border:`1px solid ${C.accentDim || C.border}` }}>
          <span style={{ fontSize:13, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif" }}>Total</span>
          <span style={{ fontSize:14, fontWeight:800, color:C.accent, fontFamily:"'Space Mono',monospace" }}>
            {fmt(total)}
          </span>
        </div>
        <PRow label="Level Power"    value={levelPower}    approx={levelApprox} unknown={!levelPower} />
        <PRow label="Affinity Power" value={affinityPower} unknown={!affinityPower} />
        <PRow label="Talent Power"   value={talentPower}   unknown={!talentPower} />
        <PRow label="Skill Power"    value={skillPower}    unknown={!skillKnown} />
        {(levelApprox || !skillKnown || (curLv===100 && curB===11)) && (
          <div style={{ fontSize:9, color:C.textDim, fontFamily:"'Space Mono',monospace",
            paddingTop:4, lineHeight:1.5 }}>
            {levelApprox && "~ Level power is approximate. "}
            {!skillKnown && "Skill power formula pending in-game data. "}
            {curLv===100 && curB===11 && "Research Power unlocked at L100/B11/max skills — not yet tracked."}
          </div>
        )}
      </div>
    );
  };

  const ExpertDrawer = ({ expert }) => {
    const d = getExpert(expert.name);
    const curLv  = Number(d.level ?? 0);
    const goalLv = Number(d.goalLevel ?? curLv);
    const curB   = Number(d.affinity ?? 0);
    const goalB  = Number(d.goalAffinity ?? curB);
    const totals = getExpertTotals(expert);
    const ownSigils = inv[expert.invKey] ?? 0;
    const sigShortfall = totals.sigils - ownSigils;
    const bookShortfall = totals.books - (inv.books ?? 0);

    const MAX_LEVEL = 100;
    const MAX_AFFINITY = 11;
    const levels = Array.from({ length: MAX_LEVEL + 1 }, (_, i) => i);
    const bLevels = Array.from({ length: MAX_AFFINITY + 1 }, (_, i) => i);

    const comingSoon = isComingSoon(expert);

    return (
      <div style={{
        background:C.surface, border:`1px solid ${expert.color}44`,
        borderTop:`3px solid ${expert.color}`,
        borderRadius:"0 0 10px 10px", padding:"0 16px 16px",
        marginTop:-1,
      }}>
        {comingSoon && (
          <div style={{ padding:"16px 0 8px", textAlign:"center", color:C.textDim,
            fontSize:12, fontFamily:"'Space Mono',monospace" }}>
            ⏳ Full data coming soon — basic tracking only
          </div>
        )}

        {/* ── Sigil Inventory for this expert ── */}
        <div style={{ padding:"14px 0 10px", borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:C.textPri }}>Expert Sigils (Owned)</div>
            <div style={{ fontSize:10, color:C.textDim, fontFamily:"'Space Mono',monospace" }}>
              Synced with Inventory tab
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <input
              type="number" min={0}
              value={ownSigils}
              onChange={e => updateSigils(expert.invKey, e.target.value)}
              style={{ width:80, textAlign:"right", background:C.card,
                border:`1px solid ${C.border}`, borderRadius:5,
                color:C.textPri, padding:"4px 8px", fontSize:13, outline:"none",
                fontFamily:"'Space Mono',monospace" }}
            />
            <span style={{ fontSize:11, color:C.textDim }}>sigils</span>
          </div>
        </div>

        {/* ── Expert Level ── */}
        <div style={{ padding:"12px 0 10px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textPri, marginBottom:8 }}>Expert Level</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Current</span>
              <select value={curLv} onChange={e => {
                  const nv = Math.min(MAX_LEVEL, Number(e.target.value));
                  setExpert(expert.name, { level: nv, goalLevel: Math.max(nv, goalLv) });
                }}
                style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:5,
                  color:C.textPri, padding:"4px 6px", fontSize:13, fontFamily:"'Space Mono',monospace", width:70 }}>
                {levels.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <span style={{ color:C.textDim, fontSize:18, marginTop:14 }}>→</span>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Goal</span>
              <select value={goalLv} onChange={e => setExpert(expert.name, { goalLevel: Number(e.target.value) })}
                style={{ background:C.card, border:`1px solid ${goalLv === MAX_LEVEL ? C.green : C.border}`, borderRadius:5,
                  color: goalLv === MAX_LEVEL ? C.green : C.textPri, padding:"4px 6px", fontSize:13,
                  fontFamily:"'Space Mono',monospace", width:70 }}>
                {levels.filter(i => i >= curLv).map(i => (
                  <option key={i} value={i}>{i === MAX_LEVEL ? "100 ★" : i}</option>
                ))}
              </select>
            </div>
            {goalLv > curLv && (
              <div style={{ marginLeft:8, fontSize:12, color:C.amber, fontFamily:"'Space Mono',monospace" }}>
                🔶 {totals.levelSigils.toLocaleString()} sigils
              </div>
            )}
            {curLv === MAX_LEVEL && (
              <span style={{ marginLeft:8, fontSize:11, color:C.green, fontFamily:"'Space Mono',monospace" }}>✓ MAX</span>
            )}
          </div>
        </div>

        {/* ── Affinity Level ── */}
        <div style={{ padding:"12px 0 10px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textPri, marginBottom:8 }}>Affinity (Bonus) Level</div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Current</span>
              <select value={curB} onChange={e => {
                  const nv = Math.min(MAX_AFFINITY, Number(e.target.value));
                  setExpert(expert.name, { affinity: nv, goalAffinity: Math.max(nv, goalB) });
                }}
                style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:5,
                  color:C.textPri, padding:"4px 6px", fontSize:12, fontFamily:"'Space Mono',monospace", width:110 }}>
                {bLevels.map(i => <option key={i} value={i}>{AFFINITY_NAMES[i]} — {AFFINITY_LABELS[i]}</option>)}
              </select>
            </div>
            <span style={{ color:C.textDim, fontSize:18, marginTop:14 }}>→</span>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Goal</span>
              <select value={goalB} onChange={e => setExpert(expert.name, { goalAffinity: Number(e.target.value) })}
                style={{ background:C.card, border:`1px solid ${goalB === MAX_AFFINITY ? C.green : C.border}`, borderRadius:5,
                  color: goalB === MAX_AFFINITY ? C.green : C.textPri, padding:"4px 6px", fontSize:12,
                  fontFamily:"'Space Mono',monospace", width:110 }}>
                {bLevels.filter(i => i >= curB).map(i => (
                  <option key={i} value={i}>{AFFINITY_NAMES[i]}{i === MAX_AFFINITY ? " ★" : ""} — {AFFINITY_LABELS[i]}</option>
                ))}
              </select>
            </div>
          </div>
          {goalB > curB && (
            <div style={{ marginTop:6, fontSize:12, color:C.amber, fontFamily:"'Space Mono',monospace" }}>
              🔶 {totals.affinitySigils.toLocaleString()} affinity sigils · Bonus: {BONUS_VALUES[expert.name]?.[curB]} → {BONUS_VALUES[expert.name]?.[goalB]}
            </div>
          )}
          {curB === MAX_AFFINITY && (
            <div style={{ marginTop:4, fontSize:11, color:C.green, fontFamily:"'Space Mono',monospace" }}>✓ INTIMATE (MAX)</div>
          )}
        </div>

        {/* ── Skills ── */}
        <div style={{ padding:"12px 0 0" }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textPri, marginBottom:4 }}>Skills</div>
          {expert.skills.map((sk, i) => (
            <SkillRow
              key={sk.name}
              expert={expert}
              skKey={`sk${i+1}`}
              label={sk.name}
              desc={sk.desc}
              skIdx={i}
            />
          ))}
        </div>

        {/* ── Power Breakdown ── */}
        <ExpertPowerDisplay expert={expert} d={d} C={C} />

        {/* ── Summary Footer ── */}
        {(totals.sigils > 0 || totals.books > 0) && (
          <div style={{
            marginTop:14, padding:"12px 14px", borderRadius:8,
            background:C.card, border:`1px solid ${C.border}`,
          }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textSec,
              textTransform:"uppercase", letterSpacing:"1.5px",
              fontFamily:"'Space Mono',monospace", marginBottom:10 }}>
              Upgrade Summary
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {totals.sigils > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:C.textPri }}>🔶 Sigils needed</span>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ fontSize:13, fontWeight:700, fontFamily:"'Space Mono',monospace",
                      color: sigShortfall > 0 ? C.red : C.green }}>
                      {totals.sigils.toLocaleString()}
                    </span>
                    {sigShortfall > 0 && (
                      <div style={{ fontSize:10, color:C.red, fontFamily:"'Space Mono',monospace" }}>
                        ({sigShortfall.toLocaleString()} short)
                      </div>
                    )}
                    {sigShortfall <= 0 && (
                      <div style={{ fontSize:10, color:C.green, fontFamily:"'Space Mono',monospace" }}>
                        ✓ Enough sigils
                      </div>
                    )}
                  </div>
                </div>
              )}
              {totals.books > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:C.textPri }}>📚 Books needed</span>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ fontSize:13, fontWeight:700, fontFamily:"'Space Mono',monospace",
                      color: bookShortfall > 0 ? C.red : C.green }}>
                      {totals.books.toLocaleString()}
                    </span>
                    {bookShortfall > 0 && (
                      <div style={{ fontSize:10, color:C.red, fontFamily:"'Space Mono',monospace" }}>
                        ({bookShortfall.toLocaleString()} short)
                      </div>
                    )}
                    {bookShortfall <= 0 && (
                      <div style={{ fontSize:10, color:C.green, fontFamily:"'Space Mono',monospace" }}>
                        ✓ Enough books
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────────────

  // Total costs across all experts
  const grandTotalBooks  = EXPERTS.reduce((sum, e) => sum + getExpertTotals(e).books, 0);
  const grandTotalSigils = EXPERTS.reduce((sum, e) => sum + getExpertTotals(e).sigils, 0);
  const generalSigils = inv.generalSigils ?? 0;
  const books = inv.books ?? 0;

  return (
    <div className="fade-in">

      {/* ── Resource Summary Bar ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
        {[
          { label:"Books of Knowledge", value:books, sub:"Available", icon:"📚", color:C.blue,
            field:"books", invKey:"books" },
          { label:"General Sigils", value:generalSigils, sub:"Available", icon:"🔶", color:C.amber,
            field:"generalSigils", invKey:"generalSigils" },
        ].map(item => (
          <div key={item.label} style={{ background:C.card, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"14px 16px", display:"flex", alignItems:"center",
            justifyContent:"space-between", gap:12 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.textDim,
                textTransform:"uppercase", letterSpacing:"1.5px",
                fontFamily:"'Space Mono',monospace" }}>{item.icon} {item.label}</div>
              <input
                type="number" min={0}
                value={item.value}
                onChange={e => setInv(prev => ({ ...prev, [item.invKey]: Math.max(0, Number(e.target.value) || 0) }))}
                style={{ marginTop:4, background:"transparent", border:"none", outline:"none",
                  fontSize:24, fontWeight:800, color:item.color,
                  fontFamily:"Syne,sans-serif", width:"100%", padding:0 }}
              />
            </div>
            {(grandTotalBooks > 0 || grandTotalSigils > 0) && (
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:10, color:C.textDim, fontFamily:"'Space Mono',monospace" }}>All goals</div>
                <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Space Mono',monospace",
                  color: (item.label.includes("Books") ? grandTotalBooks > books : grandTotalSigils > generalSigils) ? C.red : C.green }}>
                  {item.label.includes("Books") ? grandTotalBooks.toLocaleString() : grandTotalSigils.toLocaleString()} needed
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Expert Cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 }}>
        {EXPERTS.map(expert => {
          const d = getExpert(expert.name);
          const curLv  = Number(d.level ?? 0);
          const curB   = Number(d.affinity ?? 0);
          const totals = getExpertTotals(expert);
          const ownSigils = inv[expert.invKey] ?? 0;
          const pct = Math.round((curLv / 100) * 100);
          const comingSoon = isComingSoon(expert);
          const isOpen = openCard === expert.name;

          return (
            <div key={expert.name} style={{ borderRadius:10, overflow:"hidden",
              border:`1px solid ${isOpen ? expert.color : C.border}`,
              transition:"border-color 0.2s" }}>

              {/* Card Header */}
              <div
                onClick={() => setOpenCard(isOpen ? null : expert.name)}
                style={{ background:C.card, padding:"14px 16px", cursor:"pointer",
                  borderBottom: isOpen ? `1px solid ${expert.color}44` : "none",
                  display:"flex", alignItems:"center", gap:12,
                  transition:"background 0.15s",
                  userSelect:"none" }}
                onMouseEnter={e => e.currentTarget.style.background = C.surface}
                onMouseLeave={e => e.currentTarget.style.background = C.card}
              >
                {/* Avatar */}
                <div style={{
                  width:42, height:42, borderRadius:8, flexShrink:0,
                  background:expert.color + "22", border:`2px solid ${expert.color}66`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:14, fontWeight:800, color:expert.color,
                  fontFamily:"Syne,sans-serif",
                }}>
                  {expert.name.slice(0,2).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                    <span style={{ fontSize:14, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif" }}>
                      {expert.name}
                    </span>
                    {comingSoon && (
                      <span style={{ fontSize:9, padding:"1px 6px", borderRadius:8,
                        background:"#444", color:"#aaa", fontFamily:"'Space Mono',monospace" }}>
                        SOON
                      </span>
                    )}
                    <AffinityTag level={curB} />
                  </div>
                  <div style={{ fontSize:10, color:C.textDim, fontFamily:"'Space Mono',monospace",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {expert.bonus} · {expert.bonusDesc}
                  </div>
                  {/* Level bar */}
                  <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ flex:1, height:4, borderRadius:2, background:C.border, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`,
                        background: curLv >= 100 ? C.green : expert.color,
                        borderRadius:2, transition:"width 0.3s" }} />
                    </div>
                    <span style={{ fontSize:10, color:expert.color, fontFamily:"'Space Mono',monospace",
                      fontWeight:700, flexShrink:0 }}>
                      Lv {curLv}
                    </span>
                  </div>
                </div>

                {/* Right column: sigils + cost chip */}
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.amber,
                    fontFamily:"'Space Mono',monospace" }}>
                    {ownSigils.toLocaleString()} 🔶
                  </div>
                  {totals.sigils > 0 && (
                    <div style={{ fontSize:9, color: totals.sigils > ownSigils ? C.red : C.green,
                      fontFamily:"'Space Mono',monospace", marginTop:1 }}>
                      {totals.sigils.toLocaleString()} needed
                    </div>
                  )}
                  {totals.books > 0 && (
                    <div style={{ fontSize:9, color:C.blue,
                      fontFamily:"'Space Mono',monospace" }}>
                      📚 {totals.books.toLocaleString()} bks
                    </div>
                  )}
                  <div style={{ fontSize:14, color:C.textDim, marginTop:4 }}>
                    {isOpen ? "▲" : "▼"}
                  </div>
                </div>
              </div>

              {/* Drawer */}
              {isOpen && <ExpertDrawer expert={expert} />}
            </div>
          );
        })}
      </div>

      {/* ── Troop Stats Summary ── */}
      <ExpertStatsSummary expertData={expertData} />

    </div>
  );
}

// ─── Expert Troop Stats Summary ──────────────────────────────────────────────

const EXPERT_LEVEL_STATS = {
  // Cyrille: Troops' Attack % per level
  Cyrille: [0,0.0158,0.0165,0.0173,0.018,0.0188,0.0195,0.0203,0.021,0.0218,0.0225,0.0293,0.03,0.0308,0.0315,0.0323,0.033,0.0338,0.0345,0.0353,0.036,0.0428,0.0435,0.0443,0.045,0.0458,0.0465,0.0473,0.048,0.0488,0.0495,0.0563,0.057,0.0578,0.0585,0.0593,0.06,0.0608,0.0615,0.0623,0.063,0.0698,0.0705,0.0713,0.072,0.0728,0.0735,0.0743,0.075,0.0758,0.0765,0.0833,0.084,0.0848,0.0855,0.0863,0.087,0.0878,0.0885,0.0893,0.09,0.0968,0.0975,0.0983,0.099,0.0998,0.1005,0.1013,0.102,0.1028,0.1035,0.1103,0.111,0.1118,0.1125,0.1133,0.114,0.1148,0.1155,0.1163,0.117,0.1238,0.1245,0.1253,0.126,0.1268,0.1275,0.1283,0.129,0.1298,0.1305,0.1373,0.138,0.1388,0.1395,0.1403,0.141,0.1418,0.1425,0.1433,0.15],
  // Agnes: Troops' Defense % per level
  Agnes:   [0,0.0158,0.0165,0.0173,0.018,0.0188,0.0195,0.0203,0.021,0.0218,0.0228,0.0293,0.03,0.0308,0.0315,0.0323,0.033,0.0338,0.0345,0.0353,0.036,0.0428,0.0435,0.0443,0.045,0.0458,0.0465,0.0473,0.048,0.0488,0.0495,0.0563,0.057,0.0578,0.0585,0.0593,0.06,0.0608,0.0615,0.0623,0.063,0.0698,0.0705,0.0713,0.072,0.0728,0.0735,0.0743,0.075,0.0758,0.0765,0.0833,0.084,0.0848,0.0855,0.0863,0.087,0.0878,0.0885,0.0893,0.09,0.0968,0.0975,0.0983,0.099,0.0998,0.1005,0.1013,0.102,0.1028,0.1035,0.1103,0.111,0.1118,0.1125,0.1133,0.114,0.1148,0.1155,0.1163,0.117,0.1238,0.1245,0.1253,0.126,0.1268,0.1275,0.1283,0.129,0.1298,0.1305,0.1373,0.138,0.1388,0.1395,0.1403,0.141,0.1418,0.1425,0.1433,0.144],
  // Romulus: Troops' Lethality & Health % per level
  Romulus: [0,0.021,0.022,0.023,0.024,0.025,0.026,0.027,0.028,0.029,0.03,0.039,0.04,0.041,0.042,0.043,0.044,0.045,0.046,0.047,0.048,0.057,0.058,0.059,0.06,0.061,0.062,0.063,0.064,0.065,0.066,0.075,0.076,0.077,0.078,0.079,0.08,0.081,0.082,0.083,0.084,0.093,0.094,0.095,0.096,0.097,0.098,0.099,0.1,0.101,0.102,0.111,0.112,0.113,0.114,0.115,0.116,0.117,0.118,0.119,0.12,0.129,0.13,0.131,0.132,0.133,0.134,0.135,0.136,0.137,0.138,0.147,0.148,0.149,0.15,0.151,0.152,0.153,0.154,0.155,0.156,0.165,0.166,0.167,0.168,0.169,0.17,0.171,0.172,0.173,0.174,0.183,0.184,0.185,0.186,0.187,0.188,0.189,0.19,0.191,0.192],
  // Holger: Troops' Attack & Defense % per level (same curve as Cyrille per spreadsheet col F)
  Holger:  [0,0.0158,0.0165,0.0173,0.018,0.0188,0.0195,0.0203,0.021,0.0218,0.0225,0.0293,0.03,0.0308,0.0315,0.0323,0.033,0.0338,0.0345,0.0353,0.036,0.0428,0.0435,0.0443,0.045,0.0458,0.0465,0.0473,0.048,0.0488,0.0495,0.0563,0.057,0.0578,0.0585,0.0593,0.06,0.0608,0.0615,0.0623,0.063,0.0698,0.0705,0.0713,0.072,0.0728,0.0735,0.0743,0.075,0.0758,0.0765,0.0833,0.084,0.0848,0.0855,0.0863,0.087,0.0878,0.0885,0.0893,0.09,0.0968,0.0975,0.0983,0.099,0.0998,0.1005,0.1013,0.102,0.1028,0.1035,0.1103,0.111,0.1118,0.1125,0.1133,0.114,0.1148,0.1155,0.1163,0.117,0.1238,0.1245,0.1253,0.126,0.1268,0.1275,0.1283,0.129,0.1298,0.1305,0.1373,0.138,0.1388,0.1395,0.1403,0.141,0.1418,0.1425,0.1433,0.144],
  // Fabian: Troops' Lethality & Health % per level (wiki — same curve as Cyrille, max +15%)
  Fabian:  [0,0.0158,0.0165,0.0173,0.018,0.0188,0.0195,0.0203,0.021,0.0218,0.0225,0.0293,0.03,0.0308,0.0315,0.0323,0.033,0.0338,0.0345,0.0353,0.036,0.0428,0.0435,0.0443,0.045,0.0458,0.0465,0.0473,0.048,0.0488,0.0495,0.0563,0.057,0.0578,0.0585,0.0593,0.06,0.0608,0.0615,0.0623,0.063,0.0698,0.0705,0.0713,0.072,0.0728,0.0735,0.0743,0.075,0.0758,0.0765,0.0833,0.084,0.0848,0.0855,0.0863,0.087,0.0878,0.0885,0.0893,0.09,0.0968,0.0975,0.0983,0.099,0.0998,0.1005,0.1013,0.102,0.1028,0.1035,0.1103,0.111,0.1118,0.1125,0.1133,0.114,0.1148,0.1155,0.1163,0.117,0.1238,0.1245,0.1253,0.126,0.1268,0.1275,0.1283,0.129,0.1298,0.1305,0.1373,0.138,0.1388,0.1395,0.1403,0.141,0.1418,0.1425,0.1433,0.15],
  // Valeria: Troops' Lethality & Health % per level (wiki — unique curve, max +20%)
  Valeria: [0,0.021,0.022,0.023,0.024,0.025,0.026,0.027,0.028,0.029,0.038,0.039,0.04,0.041,0.042,0.043,0.044,0.045,0.046,0.047,0.056,0.057,0.058,0.059,0.06,0.061,0.062,0.063,0.064,0.065,0.074,0.075,0.076,0.077,0.078,0.079,0.08,0.081,0.082,0.083,0.092,0.093,0.094,0.095,0.096,0.097,0.098,0.099,0.1,0.101,0.11,0.111,0.112,0.113,0.114,0.115,0.116,0.117,0.118,0.119,0.128,0.129,0.13,0.131,0.132,0.133,0.134,0.135,0.136,0.137,0.146,0.147,0.148,0.149,0.15,0.151,0.152,0.153,0.154,0.155,0.164,0.165,0.166,0.167,0.168,0.169,0.17,0.171,0.172,0.173,0.182,0.183,0.184,0.185,0.186,0.187,0.188,0.189,0.19,0.191,0.2],
  // Ronne: Troops' Attack & Defense % per level (same stat curve as Cyrille per wiki, max +30% in raids)
  Ronne:   [0,0.0158,0.0165,0.0173,0.018,0.0188,0.0195,0.0203,0.021,0.0218,0.0225,0.0293,0.03,0.0308,0.0315,0.0323,0.033,0.0338,0.0345,0.0353,0.036,0.0428,0.0435,0.0443,0.045,0.0458,0.0465,0.0473,0.048,0.0488,0.0495,0.0563,0.057,0.0578,0.0585,0.0593,0.06,0.0608,0.0615,0.0623,0.063,0.0698,0.0705,0.0713,0.072,0.0728,0.0735,0.0743,0.075,0.0758,0.0765,0.0833,0.084,0.0848,0.0855,0.0863,0.087,0.0878,0.0885,0.0893,0.09,0.0968,0.0975,0.0983,0.099,0.0998,0.1005,0.1013,0.102,0.1028,0.1035,0.1103,0.111,0.1118,0.1125,0.1133,0.114,0.1148,0.1155,0.1163,0.117,0.1238,0.1245,0.1253,0.126,0.1268,0.1275,0.1283,0.129,0.1298,0.1305,0.1373,0.138,0.1388,0.1395,0.1403,0.141,0.1418,0.1425,0.1433,0.15],
  // Kathy: Troops' Lethality & Health % per level (same stat curve as Cyrille per wiki)
  Kathy:   [0,0.0158,0.0165,0.0173,0.018,0.0188,0.0195,0.0203,0.021,0.0218,0.0225,0.0293,0.03,0.0308,0.0315,0.0323,0.033,0.0338,0.0345,0.0353,0.036,0.0428,0.0435,0.0443,0.045,0.0458,0.0465,0.0473,0.048,0.0488,0.0495,0.0563,0.057,0.0578,0.0585,0.0593,0.06,0.0608,0.0615,0.0623,0.063,0.0698,0.0705,0.0713,0.072,0.0728,0.0735,0.0743,0.075,0.0758,0.0765,0.0833,0.084,0.0848,0.0855,0.0863,0.087,0.0878,0.0885,0.0893,0.09,0.0968,0.0975,0.0983,0.099,0.0998,0.1005,0.1013,0.102,0.1028,0.1035,0.1103,0.111,0.1118,0.1125,0.1133,0.114,0.1148,0.1155,0.1163,0.117,0.1238,0.1245,0.1253,0.126,0.1268,0.1275,0.1283,0.129,0.1298,0.1305,0.1373,0.138,0.1388,0.1395,0.1403,0.141,0.1418,0.1425,0.1433,0.15],
  // Baldur: Troops' Attack & Defense % per level (distinct lower curve)
  // Baldur: Troops' Attack & Defense % per level (wiki — unique lower curve, max +10%)
  Baldur:  [0,0.0105,0.011,0.0115,0.012,0.0125,0.013,0.0135,0.014,0.0145,0.019,0.0195,0.02,0.0205,0.021,0.0215,0.022,0.0225,0.023,0.0235,0.028,0.0285,0.029,0.0295,0.03,0.0305,0.031,0.0315,0.032,0.0325,0.037,0.0375,0.038,0.0385,0.039,0.0395,0.04,0.0405,0.041,0.0415,0.046,0.0465,0.047,0.0475,0.048,0.0485,0.049,0.0495,0.05,0.0505,0.055,0.0555,0.056,0.0565,0.057,0.0575,0.058,0.0585,0.059,0.0595,0.064,0.0645,0.065,0.0655,0.066,0.0665,0.067,0.0675,0.068,0.0685,0.073,0.0735,0.074,0.0745,0.075,0.0755,0.076,0.0765,0.077,0.0775,0.082,0.0825,0.083,0.0835,0.084,0.0845,0.085,0.0855,0.086,0.0865,0.091,0.0915,0.092,0.0925,0.093,0.0935,0.094,0.0945,0.095,0.0955,0.1],
};

const ROMULUS_BONUS_DEPLOY = [0,300,600,1000,1500,2000,3000,4000,5500,7000,8500,10000]; // Commander's Crest: Expedition Army size per affinity level
const ROMULUS_SK2_STAT  = [0,0.005,0.01,0.015,0.02,0.025,0.03,0.035,0.04,0.045,0.05,0.055,0.06,0.065,0.07,0.075,0.08,0.085,0.09,0.095,0.10];
const ROMULUS_SK3_STAT  = [0,0.005,0.01,0.015,0.02,0.025,0.03,0.035,0.04,0.045,0.05,0.055,0.06,0.065,0.07,0.075,0.08,0.085,0.09,0.095,0.10];
const ROMULUS_SK4_RALLY = [0,5000,10000,15000,20000,25000,30000,35000,40000,45000,50000,55000,60000,65000,70000,75000,80000,85000,90000,95000,100000];


// ─── Expert Power Constants ───────────────────────────────────────────────────
// Affinity Power per tier (B1–B11): power = rate × tier
const EXPERT_AFFINITY_POWER_RATE = {
  Cyrille:  43200,
  Agnes:    43200,
  Romulus:  144000,
  Holger:   86400,
  Fabian:   108000,
  Baldur:   57600,
  Valeria:  null,  // unknown
  Ronne:    null,
  Kathy:    null,
};

// Talent Power per bonus level: power = rate × talent_level
const EXPERT_TALENT_POWER_RATE = {
  Cyrille:  36000,
  Agnes:    36000,
  Romulus:  236000,
  Holger:   58000,
  Fabian:   86000,
  Baldur:   43000,
  Valeria:  null,
  Ronne:    null,
  Kathy:    null,
};

// Level Power formula: power = rate × (level + offset)
// Confirmed exact: Cyrille, Agnes, Romulus. Others approximate.
const EXPERT_LEVEL_POWER = {
  Cyrille:  { rate: 6048,  offset: 0  },   // exact: 6,048 × level
  Agnes:    { rate: 5400,  offset: 12 },   // exact: 5,400 × (level+12)
  Romulus:  { rate: 20400, offset: 0  },   // exact: 20,400 × level
  Holger:   { rate: 12380, offset: 0  },   // approx from L82 data
  Fabian:   { rate: 16113, offset: 0  },   // approx from L62 data
  Baldur:   { rate: 8434,  offset: 0  },   // approx from L70 data
  Valeria:  null,
  Ronne:    null,
  Kathy:    null,
};

// Skill Power per skill per level (null = unknown, use stored total)
const EXPERT_SKILL_POWER = {
  Cyrille:  { sk1: 3000,  sk2: 13000, sk3: 20000, sk4: 7000   },
  Agnes:    null,  // unknown per-skill; total at max = 285,000
  Romulus:  { sk1: 18000, sk2: 108000, sk3: 135000, sk4: 150000 },
  Holger:   { sk1: 42000, sk2: 18000,  sk3: 18000,  sk4: 42000  },
  Fabian:   null,  // unknown per-skill; one data point insufficient
  Baldur:   { sk1: 21000, sk2: 21000,  sk3: 21000,  sk4: 21000  },
  Valeria:  null,
  Ronne:    null,
  Kathy:    null,
};

function ExpertStatsSummary({ expertData }) {
  const C = COLORS;
  const [collapsed, setCollapsed] = React.useState(false);
  const getD = (name) => expertData[name] || {};

  const expertColors = {
    Cyrille:"#4A9EBF", Agnes:"#7B9E6B", Romulus:"#C0392B",
    Holger:"#8E44AD", Fabian:"#D4A017", Baldur:"#16A085",
    Valeria:"#E3731A", Ronne:"#2980B9", Kathy:"#636e72",
  };

  const getStatRows = () => {
    const rows = [];
    const cyrLv = Number(getD("Cyrille").level ?? 0);
    if (cyrLv > 0) rows.push({ expert:"Cyrille", stat:"Troops' Attack",    value: EXPERT_LEVEL_STATS.Cyrille[cyrLv] ?? 0, source:`Lv ${cyrLv}` });
    const agnLv = Number(getD("Agnes").level ?? 0);
    if (agnLv > 0) rows.push({ expert:"Agnes",   stat:"Troops' Defense",   value: EXPERT_LEVEL_STATS.Agnes[agnLv]   ?? 0, source:`Lv ${agnLv}` });
    const dRom  = getD("Romulus");
    const romLv = Number(dRom.level  ?? 0);
    const romSk2 = Number(dRom.sk2Level ?? 0);
    const romSk3 = Number(dRom.sk3Level ?? 0);
    if (romLv > 0) {
      const v = EXPERT_LEVEL_STATS.Romulus[romLv] ?? 0;
      rows.push({ expert:"Romulus", stat:"Troops' Lethality", value: v, source:`Lv ${romLv}` });
      rows.push({ expert:"Romulus", stat:"Troops' Health",    value: v, source:`Lv ${romLv}` });
    }
    if (romSk2 > 0) {
      const v = ROMULUS_SK2_STAT[romSk2] ?? 0;
      rows.push({ expert:"Romulus", stat:"Troops' Attack",  value: v, source:`Sk2 (Last Line) Lv ${romSk2}` });
      rows.push({ expert:"Romulus", stat:"Troops' Defense", value: v, source:`Sk2 (Last Line) Lv ${romSk2}` });
    }
    if (romSk3 > 0) {
      const v = ROMULUS_SK3_STAT[romSk3] ?? 0;
      rows.push({ expert:"Romulus", stat:"Troops' Lethality", value: v, source:`Sk3 (Spirit) Lv ${romSk3}` });
      rows.push({ expert:"Romulus", stat:"Troops' Health",    value: v, source:`Sk3 (Spirit) Lv ${romSk3}` });
    }
    const fabLv = Number(getD("Fabian").level ?? 0);
    if (fabLv > 0) {
      const fabVal = EXPERT_LEVEL_STATS.Fabian[fabLv] ?? 0;
      rows.push({ expert:"Fabian", stat:"Troops' Lethality", value: fabVal, source:`Lv ${fabLv} (Foundry/Hellfire)` });
      rows.push({ expert:"Fabian", stat:"Troops' Health",    value: fabVal, source:`Lv ${fabLv} (Foundry/Hellfire)` });
    }
    // Holger: Troops' Attack & Defense
    const holLv = Number(getD("Holger").level ?? 0);
    if (holLv > 0) {
      const holVal = EXPERT_LEVEL_STATS.Holger[holLv] ?? 0;
      rows.push({ expert:"Holger", stat:"Troops' Attack",  value: holVal, source:`Lv ${holLv}` });
      rows.push({ expert:"Holger", stat:"Troops' Defense", value: holVal, source:`Lv ${holLv}` });
    }
    // Baldur: Troops' Attack & Defense (distinct curve, lower than others)
    const balLv = Number(getD("Baldur").level ?? 0);
    if (balLv > 0) {
      const balVal = EXPERT_LEVEL_STATS.Baldur[balLv] ?? 0;
      rows.push({ expert:"Baldur", stat:"Troops' Attack",  value: balVal, source:`Lv ${balLv}` });
      rows.push({ expert:"Baldur", stat:"Troops' Defense", value: balVal, source:`Lv ${balLv}` });
    }
    // Valeria: Troops' Lethality & Health (applies during SvS Battle Phase)
    const valLv = Number(getD("Valeria").level ?? 0);
    if (valLv > 0) {
      const valVal = EXPERT_LEVEL_STATS.Valeria[valLv] ?? 0;
      rows.push({ expert:"Valeria", stat:"Troops' Lethality", value: valVal, source:`Lv ${valLv} (SvS Battle Phase)` });
      rows.push({ expert:"Valeria", stat:"Troops' Health",    value: valVal, source:`Lv ${valLv} (SvS Battle Phase)` });
    }
    // Ronne: Troops' Attack & Defense (applies during raids/raiding)
    const ronneLv = Number(getD("Ronne").level ?? 0);
    if (ronneLv > 0) {
      const ronneVal = EXPERT_LEVEL_STATS.Ronne[ronneLv] ?? 0;
      rows.push({ expert:"Ronne", stat:"Troops' Attack",  value: ronneVal, source:`Lv ${ronneLv} (raid bonus)` });
      rows.push({ expert:"Ronne", stat:"Troops' Defense", value: ronneVal, source:`Lv ${ronneLv} (raid bonus)` });
    }
    // Kathy: Troops' Lethality & Health
    const kathyLv = Number(getD("Kathy").level ?? 0);
    if (kathyLv > 0) {
      const kathyVal = EXPERT_LEVEL_STATS.Kathy[kathyLv] ?? 0;
      rows.push({ expert:"Kathy", stat:"Troops' Lethality", value: kathyVal, source:`Lv ${kathyLv}` });
      rows.push({ expert:"Kathy", stat:"Troops' Health",    value: kathyVal, source:`Lv ${kathyLv}` });
    }
    return rows;
  };

  const STAT_ORDER = ["Troops' Attack","Troops' Defense","Troops' Lethality","Troops' Health"];
  const statRows = getStatRows();
  const totals = {};
  STAT_ORDER.forEach(s => { totals[s] = 0; });
  statRows.forEach(r => { if (totals[r.stat] !== undefined) totals[r.stat] += r.value; });

  const dRom = getD("Romulus");
  const romulusDeploy = ROMULUS_BONUS_DEPLOY[Number(dRom.affinity ?? 0)] ?? 0;
  const romulusRally  = ROMULUS_SK4_RALLY[Number(dRom.sk4Level ?? 0)] ?? 0;
  const pct = v => `${(v * 100).toFixed(2)}%`;

  return (
    <div style={{ marginTop:20 }}>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"12px 16px", background:C.card, border:`1px solid ${C.border}`,
          borderRadius: collapsed ? 10 : "10px 10px 0 0", cursor:"pointer", userSelect:"none" }}
        onMouseEnter={e => e.currentTarget.style.background = C.surface}
        onMouseLeave={e => e.currentTarget.style.background = C.card}
      >
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif" }}>
            Troop Stat Contributions
          </div>
          <div style={{ fontSize:11, color:C.textSec, fontFamily:"'Space Mono',monospace", marginTop:2 }}>
            Permanent buffs from expert levels & skills · feeds into Chief Profile
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {collapsed && STAT_ORDER.filter(s => totals[s] > 0).map(s => (
            <span key={s} style={{ fontSize:10, padding:"2px 8px", borderRadius:8,
              background:C.green+"22", color:C.green, border:`1px solid ${C.green}44`,
              fontFamily:"'Space Mono',monospace" }}>
              {s.replace("Troops' ","")}: +{pct(totals[s])}
            </span>
          ))}
          <span style={{ color:C.textDim, fontSize:14 }}>{collapsed ? "▼" : "▲"}</span>
        </div>
      </div>

      {!collapsed && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`,
          borderTop:"none", borderRadius:"0 0 10px 10px", overflow:"hidden" }}>

          {statRows.length === 0 ? (
            <div style={{ padding:"20px 16px", textAlign:"center", color:C.textDim,
              fontSize:12, fontFamily:"'Space Mono',monospace" }}>
              Set expert levels above to see stat contributions
            </div>
          ) : (
            <>
              <table style={{ borderCollapse:"collapse", width:"100%" }}>
                <thead>
                  <tr style={{ background:C.surface }}>
                    {["Expert","Stat","Value","Source"].map(h => (
                      <th key={h} style={{ padding:"8px 12px", fontSize:10, fontWeight:700,
                        color:C.textDim, textAlign:"left", borderBottom:`1px solid ${C.border}`,
                        fontFamily:"'Space Mono',monospace", textTransform:"uppercase", letterSpacing:"1px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statRows.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : C.surface }}>
                      <td style={{ padding:"8px 12px", fontSize:12, fontWeight:700,
                        color: expertColors[r.expert] ?? C.textPri }}>{r.expert}</td>
                      <td style={{ padding:"8px 12px", fontSize:12, color:C.textPri }}>{r.stat}</td>
                      <td style={{ padding:"8px 12px", fontSize:12, fontWeight:700,
                        color:C.green, fontFamily:"'Space Mono',monospace" }}>+{pct(r.value)}</td>
                      <td style={{ padding:"8px 12px", fontSize:11, color:C.textDim,
                        fontFamily:"'Space Mono',monospace" }}>{r.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding:"12px 16px", background:C.surface, borderTop:`2px solid ${C.border}` }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.textDim, textTransform:"uppercase",
                  letterSpacing:"1.5px", fontFamily:"'Space Mono',monospace", marginBottom:8 }}>Totals</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                  {STAT_ORDER.map(s => (
                    <div key={s} style={{ display:"flex", flexDirection:"column", padding:"8px 14px",
                      borderRadius:8, background: totals[s] > 0 ? C.green+"15" : C.card,
                      border:`1px solid ${totals[s] > 0 ? C.green+"44" : C.border}` }}>
                      <span style={{ fontSize:10, color:C.textDim, fontFamily:"'Space Mono',monospace" }}>{s}</span>
                      <span style={{ fontSize:16, fontWeight:800, fontFamily:"Syne,sans-serif",
                        color: totals[s] > 0 ? C.green : C.textDim }}>
                        {totals[s] > 0 ? `+${pct(totals[s])}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {(romulusDeploy > 0 || romulusRally > 0) && (
                <div style={{ padding:"10px 16px", background:C.card,
                  borderTop:`1px solid ${C.border}`, display:"flex", gap:16, flexWrap:"wrap" }}>
                  {romulusDeploy > 0 && (
                    <span style={{ fontSize:11, color:C.blue, fontFamily:"'Space Mono',monospace" }}>
                      🔵 Romulus Bonus (Expedition Army / Deploy Cap): +{romulusDeploy.toLocaleString()} → wired to Chief Profile
                    </span>
                  )}
                  {romulusRally > 0 && (
                    <span style={{ fontSize:11, color:C.blue, fontFamily:"'Space Mono',monospace" }}>
                      🔵 Romulus Sk4 Rally: +{romulusRally.toLocaleString()} → wired to Chief Profile
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── War Academy Data ─────────────────────────────────────────────────────────

// Research definitions: shared costs/buffs across all 3 troop types
// Troop-specific names differ but stats are identical
const WA_RESEARCH = [
  {
    id: "flameSquad", type: "Deployment Capacity", maxLv: 5,
    names: { Infantry:"Flame Squad", Lancer:"Flame Squad", Marksman:"Flame Squad" },
    prereqBldg: { 1:"War Academy FC1" },
    prereqRes:  {},
    // [shards, steel, buff(deploy cap), power, timeMins]
    levels: [
      [0,     0,       0,    0,      0],
      [16,  5000,    200, 60000,   480],
      [25,  8000,    400,120000,   768],
      [41, 13000,    600,180000,  1248],
      [68, 21000,    800,240000,  2064],
      [102,33000,   1000,300000,  3240],
    ],
    statLabel: "Deploy Cap", statSuffix: "",
  },
  {
    id: "lethality", type: "Lethality", maxLv: 8,
    names: { Infantry:"Flame Strike", Lancer:"Blazing Charge", Marksman:"Crystal Vision" },
    prereqBldg: { 2:"War Academy FC2", 5:"War Academy FC3", 7:"War Academy FC4", 8:"War Academy FC5" },
    prereqRes:  { 1:"Flame Squad Lv.3", 4:"Flame Squad Lv.4", 5:"Flame Squad Lv.5" },
    levels: [
      [0,      0,    0,      0,      0],
      [40,  10000, 1.5,  82500,   1200],
      [56,  14000, 3.0, 156750,   1680],
      [74,  18000, 6.0, 247500,   2220],
      [102, 25000, 9.0, 346500,   3060],
      [136, 34000,12.0, 442200,   4080],
      [184, 46000,15.0, 540375,   5520],
      [248, 62000,20.0, 663300,   7440],
      [334, 83000,25.0, 783750,  10020],
    ],
    statLabel: "Lethality", statSuffix: "%",
  },
  {
    id: "health", type: "Health", maxLv: 8,
    names: { Infantry:"Flame Shield", Lancer:"Blazing Armor", Marksman:"Crystal Armor" },
    prereqBldg: { 2:"War Academy FC2", 5:"War Academy FC3", 7:"War Academy FC4", 8:"War Academy FC5" },
    prereqRes:  { 1:"Flame Squad Lv.3", 4:"Flame Squad Lv.4", 5:"Flame Squad Lv.5" },
    levels: [
      [0,      0,    0,      0,      0],
      [40,  10000, 1.5,  82500,   1200],
      [56,  14000, 3.0, 156750,   1680],
      [74,  18000, 6.0, 247500,   2220],
      [102, 25000, 9.0, 346500,   3060],
      [136, 34000,12.0, 442200,   4080],
      [184, 46000,15.0, 540375,   5520],
      [248, 62000,20.0, 663300,   7440],
      [334, 83000,25.0, 783750,  10020],
    ],
    statLabel: "Health", statSuffix: "%",
  },
  {
    id: "flameLegion", type: "Rally Capacity", maxLv: 12,
    names: { Infantry:"Flame Legion", Lancer:"Flame Legion", Marksman:"Flame Legion" },
    prereqBldg: { 1:"War Academy FC4", 4:"War Academy FC5" },
    prereqRes:  { 1:"Lethality Lv.6 + Health Lv.6", 7:"Lethality Lv.7 + Health Lv.7", 8:"Lethality Lv.8 + Health Lv.8" },
    levels: [
      [0,        0,     0,       0,        0],
      [83,   23000,  1500,  150000,   1760.3],
      [102,  28000,  3000,  285000,   2165.1],
      [125,  34000,  5000,  460000,   2640.4],
      [150,  41000,  7000,  595000,   3168.5],
      [184,  51000,  9500,  769500,   3872.6],
      [225,  62000, 12000,  912000,   4752.8],
      [276,  76000, 14500, 1058500,   5808.9],
      [334,  93000, 17500, 1242500,   7041.1],
      [418, 110000, 21000, 1365000,   8801.4],
      [502, 130000, 25000, 1525000,  10561.7],
      [602, 160000, 29000, 1682000,  12674.0],
      [744, 200000, 33500, 1876000,  15666.5],
    ],
    statLabel: "Rally Cap", statSuffix: "",
  },
  {
    id: "attack", type: "Attack", maxLv: 12,
    names: { Infantry:"Flame Tomahawk", Lancer:"Blazing Lance", Marksman:"Crystal Arrow" },
    prereqBldg: { 1:"War Academy FC3", 7:"War Academy FC5" },
    prereqRes:  { 1:"Health Lv.6", 7:"Health Lv.7", 8:"Health Lv.8" },
    levels: [
      [0,       0,   0,       0,       0],
      [54,  15000, 2.0,  120000,  1135.7],
      [66,  18000, 4.0,  228000,  1396.9],
      [81,  22000, 6.0,  331200,  1703.5],
      [97,  27000, 8.5,  433500,  2044.2],
      [118, 33000,11.0,  534600,  2498.5],
      [145, 40000,14.0,  638400,  3066.3],
      [178, 49000,17.0,  744600,  3747.7],
      [216, 60000,20.0,  852000,  4542.3],
      [270, 75000,25.0,  975000,  5678.3],
      [324, 90000,30.0, 1098000,  6814.0],
      [388,100000,35.0, 1218000,  8176.8],
      [480,130000,40.0, 1344000, 10107.4],
    ],
    statLabel: "Attack", statSuffix: "%",
  },
  {
    id: "defense", type: "Defense", maxLv: 12,
    names: { Infantry:"Flame Protection", Lancer:"Blazing Guardian", Marksman:"Crystal Protection" },
    prereqBldg: { 1:"War Academy FC3", 7:"War Academy FC5" },
    prereqRes:  { 1:"Health Lv.6", 7:"Health Lv.7", 8:"Health Lv.8" },
    levels: [
      [0,       0,   0,       0,       0],
      [54,  15000, 2.0,  120000,  1135.7],
      [66,  18000, 4.0,  228000,  1396.9],
      [81,  22000, 6.0,  331200,  1703.5],
      [97,  27000, 8.5,  433500,  2044.2],
      [118, 33000,11.0,  534600,  2498.5],
      [145, 40000,14.0,  638400,  3066.3],
      [178, 49000,17.0,  744600,  3747.7],
      [216, 60000,20.0,  852000,  4542.3],
      [270, 75000,25.0,  975000,  5678.3],
      [324, 90000,30.0, 1098000,  6814.0],
      [388,100000,35.0, 1218000,  8176.8],
      [480,130000,40.0, 1344000, 10107.4],
    ],
    statLabel: "Defense", statSuffix: "%",
  },
  {
    id: "helios", type: "T11 Troop Unlock", maxLv: 1,
    names: { Infantry:"Helios Infantry", Lancer:"Helios Lancers", Marksman:"Helios Marksmen" },
    prereqBldg: { 1:"War Academy FC5" },
    prereqRes:  { 1:"Attack Lv.12 + Defense Lv.12 + Rally Capacity Lv.12" },
    levels: [
      [0,    0,       0,       0,        0],
      [2236, 1000000, 0, 8000000, 131535],
    ],
    statLabel: "T11 Unlocked", statSuffix: "",
  },
  {
    id: "heliosHealing", type: "Helios Healing", maxLv: 10,
    names: { Infantry:"Helios Infantry Healing", Lancer:"Helios Lancer Healing", Marksman:"Helios Marksman Healing" },
    prereqBldg: {},
    prereqRes:  { 1:"Helios Lv.1" },
    // dual buffs: [shards, steel, infAtk%, healCost%, power, timeMins]
    levels: [
      [0,   0,      0,    0,      0,      0],
      [102, 30000,  2.0,  5.0, 155000,  3000],
      [137, 40000,  4.0, 10.0, 310000,  4050],
      [188, 55000,  6.0, 15.0, 465000,  5550],
      [255, 75000,  8.0, 20.0, 620000,  7500],
      [341,100000, 10.0, 25.0, 775000, 10050],
      [459,130000, 12.0, 30.0, 930000, 13500],
      [612,180000, 14.0, 35.0,1085000, 18000],
      [836,240000, 16.0, 40.0,1240000, 24600],
      [1122,330000,18.0, 45.0,1395000, 33000],
      [1530,450000,20.0, 50.0,1550000, 45000],
    ],
    statLabel: "Inf. Atk", statSuffix: "%", statLabel2: "Heal Cost ↓", statSuffix2: "%",
  },
  {
    id: "heliosTraining", type: "Helios Training", maxLv: 10,
    names: { Infantry:"Helios Infantry Training", Lancer:"Helios Lancer Training", Marksman:"Helios Marksman Training" },
    prereqBldg: {},
    prereqRes:  { 1:"Helios Lv.1" },
    // dual buffs: [shards, steel, deployBuff, trainCost%, power, timeMins]
    levels: [
      [0,   0,     0,    0,     0,      0],
      [102, 30000, 100,  5.0,  65000,  3000],
      [137, 40000, 200, 10.0,  13000,  4050],
      [188, 55000, 300, 15.0, 195000,  5550],
      [255, 75000, 400, 20.0, 260000,  7500],
      [341,100000, 500, 25.0, 325000, 10050],
      [459,130000, 600, 30.0, 390000, 13500],
      [612,180000, 700, 35.0, 455000, 18000],
      [836,240000, 800, 40.0, 520000, 24600],
      [1122,330000,900, 45.0, 585000, 33000],
      [1530,450000,1000,50.0, 650000, 45000],
    ],
    statLabel: "Deploy", statSuffix: "", statLabel2: "Train Cost ↓", statSuffix2: "%",
  },
  {
    id: "heliosFirstAid", type: "Helios First Aid", maxLv: 10,
    names: { Infantry:"Helios Infantry First Aid", Lancer:"Helios Lancer First Aid", Marksman:"Helios Marksman First Aid" },
    prereqBldg: {},
    prereqRes:  { 1:"Helios Lv.1" },
    // dual buffs: [shards, steel, def%, healTime%, power, timeMins]
    levels: [
      [0,    0,      0,     0,       0,      0],
      [51,  15000,  2.0,  1.5,  137250,  1500],
      [68,  20000,  4.0,  3.0,  274500,  2025],
      [94,  27000,  6.0,  4.5,  411750,  2760],
      [127, 37000,  8.0,  6.0,  549000,  3750],
      [170, 50000, 10.0,  7.5,  686250,  5025],
      [229, 67000, 12.0,  9.0,  823500,  6750],
      [306, 90000, 14.0, 10.5,  960750,  9000],
      [418,120000, 16.0, 12.0, 1098000, 12300],
      [561,160000, 18.0, 13.5, 1235250, 16500],
      [765,220000, 20.0, 15.0, 1372500, 22500],
    ],
    statLabel: "Defense", statSuffix: "%", statLabel2: "Heal Time ↓", statSuffix2: "%",
  },
];

// Dual-buff research IDs
const WA_DUAL = new Set(["heliosHealing","heliosTraining","heliosFirstAid"]);

function waFmtMins(totalMins) {
  if (!totalMins || totalMins <= 0) return "—";
  const d = Math.floor(totalMins / 1440);
  const h = Math.floor((totalMins % 1440) / 60);
  const m = Math.round(totalMins % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(" ");
}

function waFmtStat(res, lv) {
  if (lv === 0) return "—";
  const row = res.levels[lv];
  if (!row) return "—";
  const val = row[2];
  if (res.statSuffix === "%") return `${val.toFixed(1)}%`;
  if (val === 0) return res.id === "helios" && lv === 1 ? "Unlocked" : "—";
  return val.toLocaleString();
}

// Returns {shards, steel} cost to go from lvCur to lvGoal
function waCalcCost(res, lvCur, lvGoal) {
  let shards = 0, steel = 0;
  for (let i = lvCur + 1; i <= lvGoal; i++) {
    const row = res.levels[i];
    if (row) { shards += row[0]; steel += row[1]; }
  }
  return { shards, steel };
}

// Returns total base-time in minutes from lvCur to lvGoal
function waCalcTime(res, lvCur, lvGoal) {
  let mins = 0;
  for (let i = lvCur + 1; i <= lvGoal; i++) {
    const row = res.levels[i];
    if (row) mins += (WA_DUAL.has(res.id) ? row[5] : row[4]) || 0;
  }
  return mins;
}

// Power at a given level
function waPower(res, lv) {
  if (lv === 0) return 0;
  const row = res.levels[lv];
  return row ? (WA_DUAL.has(res.id) ? row[4] : row[3]) || 0 : 0;
}

// ─── War Academy Page ─────────────────────────────────────────────────────────
function WarAcademyPage({ inv, setInv }) {
  const C = COLORS;

  // ── State ──────────────────────────────────────────────────────────────────
  // Per-troop current/goal levels: { Infantry: { flameSquad: {cur,goal}, ... }, Lancer: ..., Marksman: ... }
  const defaultLevels = () => {
    const out = {};
    ["Infantry","Lancer","Marksman"].forEach(t => {
      out[t] = {};
      WA_RESEARCH.forEach(r => { out[t][r.id] = { cur: 0, goal: 0 }; });
    });
    return out;
  };
  const [levels, setLevels] = useLocalStorage("wa-levels", defaultLevels());

  // Research speed buff (mirroring Construction Planner)
  const [speedBuff, setSpeedBuff] = useLocalStorage("wa-speedbuff", 0);
  const [buffs, setBuffs] = useLocalStorage("wa-buffs", { presSkill: false, presPos: false });
  const toggleBuff = k => setBuffs(prev => ({ ...prev, [k]: !prev[k] }));

  const buffTotal = React.useMemo(() => {
    let t = speedBuff / 100;
    if (buffs.presSkill) t += 0.10;
    if (buffs.presPos)   t += 0.10;
    return t;
  }, [speedBuff, buffs]);

  // War Academy FC level (read from construction planner state)
  const waFCLevel = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("cp-buildings");
      if (!raw) return 0;
      const bldgs = JSON.parse(raw);
      const wa = bldgs.find(b => b.name === "War Academy");
      if (!wa) return 0;
      const FC_ORDER = ["FC1","FC2","FC3","FC4","FC5","FC6","FC7","FC8","FC9","FC10"];
      return FC_ORDER.indexOf(wa.current) + 1; // 1-based
    } catch { return 0; }
  }, []);

  // ── SvS date calculation (Tuesday = SvS Day 2) ────────────────────────────
  const [dailyEarnShards, setDailyEarnShards] = useLocalStorage("wa-dailyshards", null);
  const effectiveDailyShards = dailyEarnShards !== null ? dailyEarnShards : (inv.dailyIntel ?? 0);
  const daysToSvSTuesday = React.useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    // Find next Tuesday (day 2 = Tue, JS: 0=Sun, 2=Tue)
    const day = today.getDay();
    const daysUntilTue = day <= 2 ? 2 - day : 9 - day;
    return daysUntilTue === 0 ? 7 : daysUntilTue; // if today is Tuesday, next Tuesday
  }, []);

  // ── Inventory (reads directly from inv, writes back via setInv for full sync) ─
  const curShards = inv.shards ?? 0;
  const curSteel  = (inv.steel ?? 0) * (inv.steelUnit === "B" ? 1000 : 1);
  const steelRate = inv.steelHourlyRate ?? 0; // per hour

  // Estimated SvS inventory
  const estShardsAtSvS = curShards + effectiveDailyShards * daysToSvSTuesday;
  const estSteelAtSvS  = curSteel  + steelRate * 18 * daysToSvSTuesday; // 18 hrs/day effective

  // ── Prerequisite checker ───────────────────────────────────────────────────
  // Returns array of unmet prereq warnings for a research at a given goal level
  // Only fires when goal > cur (upgrade is actually planned)
  // Checks current levels of prereq researches — warns only if unmet
  function getPrereqs(res, cur, goal, troop) {
    if (goal <= cur) return []; // no upgrade planned — no warnings
    const warnings = [];
    const lvs = levels[troop] || {};

    // Building prereq: find highest FC level required for any level ≤ goal
    let reqFC = 0;
    Object.entries(res.prereqBldg).forEach(([lv, bldg]) => {
      if (Number(lv) <= goal && bldg.includes("War Academy")) {
        const fcNum = parseInt(bldg.replace(/[^0-9]/g,""));
        if (fcNum > reqFC) reqFC = fcNum;
      }
    });
    // Only warn if construction level doesn't already meet it
    if (reqFC > 0 && waFCLevel < reqFC) {
      warnings.push({ type:"bldg", msg:`Requires War Academy FC${reqFC} (currently FC${waFCLevel||0})` });
    }

    // Research prereqs: parse the string to extract research id and required level
    // Format examples: "Flame Squad Lv.3", "Lethality Lv.6 + Health Lv.6", "Helios Lv.1"
    const parsePrereqStr = str => {
      const parts = str.split("+").map(s => s.trim());
      return parts.map(part => {
        const m = part.match(/^(.+?)\s+Lv\.(\d+)$/i);
        if (!m) return null;
        return { name: m[1].trim(), level: parseInt(m[2]) };
      }).filter(Boolean);
    };

    // Map display names to research ids
    const nameToId = {
      "Flame Squad": "flameSquad", "Lethality": "lethality", "Health": "health",
      "Rally Capacity": "flameLegion", "Attack": "attack", "Defense": "defense",
      "Helios": "helios", "Helios Healing": "heliosHealing",
      "Helios Training": "heliosTraining", "Helios First Aid": "heliosFirstAid",
    };

    Object.entries(res.prereqRes).forEach(([lv, prereqStr]) => {
      if (Number(lv) > goal) return; // this prereq doesn't apply yet
      const reqs = parsePrereqStr(prereqStr);
      reqs.forEach(({ name, level }) => {
        const id = nameToId[name];
        if (!id) return;
        const prereqCur = lvs[id]?.cur ?? 0;
        if (prereqCur < level) {
          warnings.push({ type:"res", msg:`Requires ${name} Lv.${level} (currently Lv.${prereqCur})` });
        }
      });
    });

    return warnings;
  }

  // ── Auto-fill prerequisites when goal is set ───────────────────────────────
  function setGoal(troop, resId, newGoal) {
    const res = WA_RESEARCH.find(r => r.id === resId);
    if (!res) return;
    setLevels(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const cur = next[troop][resId].cur;
      next[troop][resId].goal = Math.max(newGoal, cur);

      // Auto-fill research prereqs
      if (resId === "flameLegion") {
        // Lv 1 needs Lethality 6 + Health 6
        if (newGoal >= 1) {
          if (next[troop].lethality.goal < 6) next[troop].lethality.goal = 6;
          if (next[troop].health.goal    < 6) next[troop].health.goal    = 6;
        }
        if (newGoal >= 7) {
          if (next[troop].lethality.goal < 7) next[troop].lethality.goal = 7;
          if (next[troop].health.goal    < 7) next[troop].health.goal    = 7;
        }
        if (newGoal >= 8) {
          if (next[troop].lethality.goal < 8) next[troop].lethality.goal = 8;
          if (next[troop].health.goal    < 8) next[troop].health.goal    = 8;
        }
      }
      if (resId === "attack" || resId === "defense") {
        if (newGoal >= 1) {
          if (next[troop].health.goal < 6) next[troop].health.goal = 6;
        }
        if (newGoal >= 7) {
          if (next[troop].health.goal < 7) next[troop].health.goal = 7;
        }
        if (newGoal >= 8) {
          if (next[troop].health.goal < 8) next[troop].health.goal = 8;
        }
      }
      if (["heliosHealing","heliosTraining","heliosFirstAid"].includes(resId)) {
        if (next[troop].helios.goal < 1) next[troop].helios.goal = 1;
      }
      if (resId === "helios") {
        if (next[troop].attack.goal < 12)      next[troop].attack.goal      = 12;
        if (next[troop].health.goal < 12)      next[troop].health.goal      = 12;
        if (next[troop].flameLegion.goal < 12) next[troop].flameLegion.goal = 12;
      }
      if (resId === "lethality" || resId === "health") {
        if (newGoal >= 3 && next[troop].flameSquad.goal < 3) next[troop].flameSquad.goal = 3;
        if (newGoal >= 4 && next[troop].flameSquad.goal < 4) next[troop].flameSquad.goal = 4;
        if (newGoal >= 5 && next[troop].flameSquad.goal < 5) next[troop].flameSquad.goal = 5;
      }
      return next;
    });
  }

  function setCurrent(troop, resId, newCur) {
    setLevels(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[troop][resId].cur = newCur;
      if (next[troop][resId].goal < newCur) next[troop][resId].goal = newCur;
      return next;
    });
  }

  // ── Totals across all troops ───────────────────────────────────────────────
  const grandTotals = React.useMemo(() => {
    let shards = 0, steel = 0;
    ["Infantry","Lancer","Marksman"].forEach(troop => {
      WA_RESEARCH.forEach(res => {
        const { cur, goal } = levels[troop]?.[res.id] || { cur:0, goal:0 };
        const c = waCalcCost(res, cur, goal);
        shards += c.shards; steel += c.steel;
      });
    });
    return { shards, steel };
  }, [levels]);

  // ── Rendering helpers ──────────────────────────────────────────────────────
  const C_ = { // shorthand for frequently used colors
    green: C.green, red: C.red, amber: C.amber, blue: C.blue,
    textSec: C.textSec, textDim: C.textDim, textPri: C.textPri,
    border: C.border, surface: C.surface, card: C.card,
    greenBg: C.greenBg, redBg: C.redBg, amberBg: C.amberBg,
    greenDim: C.greenDim, amberDim: C.amberDim,
    accent: C.accent, accentBg: C.accentBg, accentDim: C.accentDim,
  };

  const thS = { padding:"7px 8px", fontSize:9, fontWeight:700, textAlign:"left",
    borderBottom:`1px solid ${C_.border}`, color:C_.textDim,
    fontFamily:"'Space Mono',monospace", whiteSpace:"nowrap", letterSpacing:"0.5px",
    textTransform:"uppercase" };
  const tdS = { padding:"6px 8px", fontSize:11, borderBottom:`1px solid ${C_.border}`,
    verticalAlign:"middle" };
  const tdMono = { ...tdS, fontFamily:"'Space Mono',monospace", fontSize:10 };
  const sel = { background:C_.surface, border:`1px solid ${C_.border}`, borderRadius:5,
    color:C_.textPri, padding:"3px 5px", fontSize:11, outline:"none" };

  const typeColor = t => t === "Infantry" ? C_.green : t === "Lancer" ? C_.blue : C_.amber;
  const secHead = txt => (
    <div style={{ fontSize:9, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase",
      color:C_.textDim, fontFamily:"'Space Mono',monospace", marginBottom:10,
      paddingBottom:5, borderBottom:`1px solid ${C_.border}` }}>{txt}</div>
  );

  // Collapse maxed rows per troop type
  const [collapseMaxed, setCollapseMaxed] = React.useState({
    Infantry: false, Lancer: false, Marksman: false
  });
  const toggleCollapse = troop => setCollapseMaxed(p => ({ ...p, [troop]: !p[troop] }));

  // ── Troop table renderer ───────────────────────────────────────────────────
  const renderTroopTable = (troop) => {
    const lvs = levels[troop] || {};
    let troopShards = 0, troopSteel = 0;
    WA_RESEARCH.forEach(res => {
      const { cur, goal } = lvs[res.id] || { cur:0, goal:0 };
      const c = waCalcCost(res, cur, goal);
      troopShards += c.shards; troopSteel += c.steel;
    });
    const tc = typeColor(troop);
    const hiding = collapseMaxed[troop];
    const maxedCount = WA_RESEARCH.filter(res => {
      const cur = lvs[res.id]?.cur ?? 0;
      return cur >= res.maxLv;
    }).length;

    return (
      <div key={troop} style={{ marginBottom:28 }}>
        {/* Troop header with collapse toggle */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{ fontSize:14, fontWeight:800, color:tc, fontFamily:"Syne,sans-serif" }}>{troop}</div>
          <div style={{ fontSize:10, color:C_.textDim, fontFamily:"'Space Mono',monospace" }}>
            War Academy Research
          </div>
          {maxedCount > 0 && (
            <button onClick={() => toggleCollapse(troop)}
              style={{ marginLeft:"auto", padding:"3px 10px", borderRadius:5, fontSize:11,
                fontWeight:700, cursor:"pointer", fontFamily:"'Space Mono',monospace",
                background: hiding ? C_.accentBg : C_.surface,
                color: hiding ? C_.accent : C_.textSec,
                border:`1px solid ${hiding ? C_.accentDim : C_.border}` }}>
              {hiding ? `▶ Show ${maxedCount} maxed` : `◀ Hide ${maxedCount} maxed`}
            </button>
          )}
        </div>

        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:820 }}>
            <thead>
              <tr>
                <th style={{ ...thS, minWidth:140 }}>Research</th>
                <th style={{ ...thS, textAlign:"center" }}>Current</th>
                <th style={{ ...thS }}>Cur. Stat</th>
                <th style={{ ...thS, textAlign:"center" }}>Goal</th>
                <th style={{ ...thS }}>Goal Stat</th>
                <th style={{ ...thS }}>Stat Δ</th>
                <th style={{ ...thS, textAlign:"right" }}>Shards</th>
                <th style={{ ...thS, textAlign:"right" }}>Steel</th>
                <th style={{ ...thS, textAlign:"right" }}>Power Δ</th>
                <th style={{ ...thS, textAlign:"right" }}>Orig. Time</th>
                <th style={{ ...thS, textAlign:"right", color:C_.accent }}>Actual Time</th>
              </tr>
            </thead>
            <tbody>
              {WA_RESEARCH.map((res, ri) => {
                const { cur, goal } = lvs[res.id] || { cur:0, goal:0 };
                const isMaxed = cur >= res.maxLv;
                const changed = goal > cur;

                // Hide maxed rows when collapsed
                if (hiding && isMaxed) return null;

                const cost = waCalcCost(res, cur, goal);
                const baseMins = waCalcTime(res, cur, goal);
                const actualMins = baseMins > 0 ? Math.round(baseMins / (1 + buffTotal)) : 0;
                const powerDelta = waPower(res, goal) - waPower(res, cur);

                // Stat display
                const fmtStat = (lv) => {
                  if (lv === 0) return "—";
                  const row = res.levels[lv];
                  if (!row) return "—";
                  const val = row[2];
                  if (res.id === "helios") return lv >= 1 ? "Unlocked" : "—";
                  if (res.id === "flameLegion" || res.id === "flameSquad") return val.toLocaleString();
                  return `${val.toFixed(1)}${res.statSuffix}`;
                };

                const statDelta = () => {
                  if (goal <= cur || goal === 0) return "—";
                  const gRow = res.levels[goal]; const cRow = res.levels[cur];
                  if (!gRow) return "—";
                  const gVal = gRow[2]; const cVal = cRow ? cRow[2] : 0;
                  const d = gVal - cVal;
                  if (res.id === "helios") return "+T11";
                  if (res.id === "flameLegion" || res.id === "flameSquad") return `+${d.toLocaleString()}`;
                  return `+${d.toFixed(1)}${res.statSuffix}`;
                };

                // Prerequisite warnings
                const prereqs = getPrereqs(res, cur, goal, troop);
                const hasWarn = prereqs.length > 0;

                // Goal dropdown options
                const goalOpts = [];
                for (let i = cur; i <= res.maxLv; i++) {
                  goalOpts.push(i);
                }

                return (
                  <React.Fragment key={res.id}>
                    <tr style={{ background: ri%2===0 ? "transparent" : C_.surface,
                      opacity: isMaxed && goal === res.maxLv ? 0.7 : 1 }}>
                      {/* Research name */}
                      <td style={{ ...tdS, fontWeight:600 }}>
                        <div style={{ fontSize:11, color:C_.textPri }}>{res.type}</div>
                        <div style={{ fontSize:9, color:C_.textDim, fontFamily:"'Space Mono',monospace", marginTop:1 }}>
                          {res.names[troop]}
                        </div>
                      </td>

                      {/* Current level */}
                      <td style={{ ...tdS, textAlign:"center", width:70 }}>
                        <select value={cur} onChange={e => setCurrent(troop, res.id, Number(e.target.value))} style={sel}>
                          {Array.from({length: res.maxLv+1}, (_,i)=>i).map(i => (
                            <option key={i} value={i}>{i === 0 ? "0" : i}</option>
                          ))}
                        </select>
                      </td>

                      {/* Current stat */}
                      <td style={{ ...tdMono, color:C_.textSec }}>{fmtStat(cur)}</td>

                      {/* Goal level */}
                      <td style={{ ...tdS, textAlign:"center", width:70 }}>
                        {isMaxed ? (
                          <span style={{ fontSize:10, color:C_.green, fontFamily:"'Space Mono',monospace",
                            fontWeight:700 }}>Maxed</span>
                        ) : (
                          <select value={goal}
                            onChange={e => setGoal(troop, res.id, Number(e.target.value))}
                            style={{ ...sel, color: goal > cur ? C_.accent : C_.textPri }}>
                            {goalOpts.map(i => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Goal stat */}
                      <td style={{ ...tdMono, color: goal > cur ? C_.accent : C_.textSec }}>
                        {fmtStat(goal)}
                      </td>

                      {/* Stat delta */}
                      <td style={{ ...tdMono, color: goal > cur ? C_.green : C_.textDim }}>
                        {statDelta()}
                      </td>

                      {/* Shards */}
                      <td style={{ ...tdMono, textAlign:"right",
                        color: changed ? C_.textPri : C_.textDim }}>
                        {changed ? cost.shards.toLocaleString() : "—"}
                      </td>

                      {/* Steel */}
                      <td style={{ ...tdMono, textAlign:"right",
                        color: changed ? C_.textPri : C_.textDim }}>
                        {changed ? cost.steel.toLocaleString() : "—"}
                      </td>

                      {/* Power delta */}
                      <td style={{ ...tdMono, textAlign:"right",
                        color: powerDelta > 0 ? C_.green : C_.textDim }}>
                        {powerDelta > 0 ? `+${powerDelta.toLocaleString()}` : "—"}
                      </td>

                      {/* Original time */}
                      <td style={{ ...tdMono, textAlign:"right", color:C_.textDim }}>
                        {changed ? waFmtMins(baseMins) : "—"}
                      </td>

                      {/* Actual time */}
                      <td style={{ ...tdMono, textAlign:"right",
                        color: changed ? C_.accent : C_.textDim, fontWeight: changed ? 700 : 400 }}>
                        {changed ? waFmtMins(actualMins) : "—"}
                      </td>
                    </tr>

                    {/* Prerequisite warning row */}
                    {hasWarn && prereqs.map((w, wi) => (
                      <tr key={`warn-${res.id}-${wi}`}
                        style={{ background: w.type === "bldg" ? C_.amberBg : "rgba(56,139,253,0.06)" }}>
                        <td colSpan={11} style={{ padding:"4px 10px",
                          borderBottom:`1px solid ${C_.border}` }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:10 }}>
                            <span style={{ color: w.type==="bldg" ? C_.amber : C_.blue, fontWeight:700 }}>
                              {w.type==="bldg" ? "⚠ Building" : "⚠ Research"}
                            </span>
                            <span style={{ color: w.type==="bldg" ? C_.amber : C_.blue,
                              fontFamily:"'Space Mono',monospace" }}>
                              {w.msg}
                            </span>
                            {/* Checkmark if goal already meets prereq */}
                            {w.type==="res" && (
                              <span style={{ marginLeft:"auto", color:C_.green, fontSize:11 }}>
                                {/* Check is implicit — shown in goal column */}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Troop subtotal row */}
              <tr style={{ background:C_.surface, borderTop:`2px solid ${C_.border}` }}>
                <td colSpan={6} style={{ ...tdS, fontWeight:700, color:tc }}>
                  {troop} Total
                </td>
                <td style={{ ...tdMono, textAlign:"right", fontWeight:700, color:C_.textPri }}>
                  {troopShards > 0 ? troopShards.toLocaleString() : "—"}
                </td>
                <td style={{ ...tdMono, textAlign:"right", fontWeight:700, color:C_.textPri }}>
                  {troopSteel > 0 ? troopSteel.toLocaleString() : "—"}
                </td>
                <td colSpan={3} style={{ ...tdS }} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── Summary section ────────────────────────────────────────────────────────
  const SummaryRow = ({ label, val, color, bold }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"6px 0", borderBottom:`1px solid ${C_.border}40` }}>
      <span style={{ fontSize:12, color:C_.textSec }}>{label}</span>
      <span style={{ fontSize:12, fontFamily:"'Space Mono',monospace", fontWeight: bold?700:400,
        color: color || C_.textPri }}>
        {typeof val === "number" ? val.toLocaleString(undefined,{maximumFractionDigits:0}) : val}
      </span>
    </div>
  );

  const balShards = estShardsAtSvS - grandTotals.shards;
  const balSteel  = estSteelAtSvS  - grandTotals.steel;

  return (
    <div className="fade-in" style={{ padding:"0 0 40px" }}>

      {/* ── Research Speed Buffs ─────────────────────────────────────────── */}
      <div style={{ marginBottom:24, padding:"16px", background:C_.surface,
        borderRadius:8, border:`1px solid ${C_.border}` }}>
        {secHead("Research Buffs (Time Reduction)")}
        <div style={{ display:"flex", flexWrap:"wrap", gap:16, alignItems:"flex-start" }}>
          {/* Speed input */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, minWidth:260 }}>
            <label style={{ fontSize:11, color:C_.textSec }}>
              Bonus Overview Total — Research Speed (%)
            </label>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input type="number" min={0} max={500} step={0.5}
                value={speedBuff}
                onChange={e => setSpeedBuff(Number(e.target.value))}
                style={{ width:100, textAlign:"right", background:C_.card,
                  border:`1px solid ${C_.border}`, borderRadius:6,
                  color:C_.textPri, padding:"5px 8px", fontSize:12, outline:"none" }} />
              <span style={{ fontSize:12, color:C_.textSec, fontFamily:"Space Mono,monospace" }}>%</span>
            </div>
            <div style={{ fontSize:11, color:C_.textSec, marginTop:2, lineHeight:1.5 }}>
              Non-buffed Research speed — located in{" "}
              <span style={{ color:C_.accent, fontFamily:"Space Mono,monospace" }}>
                Bonus Overview &gt; Growth
              </span>
            </div>
          </div>
          {/* Toggle buttons */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, alignSelf:"flex-end" }}>
            {[
              { k:"presSkill", label:"President Skill — Research Advancement", val:"10%" },
              { k:"presPos",   label:"Vice President",                          val:"10%" },
            ].map(b => (
              <button key={b.k} onClick={() => toggleBuff(b.k)}
                style={{ padding:"7px 13px", borderRadius:7, fontSize:11, fontWeight:700,
                  cursor:"pointer", fontFamily:"Syne,sans-serif", transition:"all 0.15s",
                  textAlign:"left",
                  background: buffs[b.k] ? C_.greenBg  : C_.surface,
                  color:      buffs[b.k] ? C_.green    : C_.textDim,
                  border:     `1px solid ${buffs[b.k] ? C_.greenDim : C_.border}` }}>
                {b.label} <span style={{ opacity:0.7 }}>+{b.val}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop:10, fontSize:12, color:C_.textSec }}>
          Total research speed bonus:{" "}
          <span style={{ color:C_.green, fontFamily:"Space Mono,monospace", fontWeight:700 }}>
            {(buffTotal*100).toFixed(1)}%
          </span>
          {" · "}Actual time = base time ÷ (1 + {(buffTotal*100).toFixed(1)}%)
        </div>
      </div>

      {/* ── Three troop tables ───────────────────────────────────────────── */}
      {["Infantry","Lancer","Marksman"].map(t => renderTroopTable(t))}

      {/* ── Summary ─────────────────────────────────────────────────────── */}
      <div style={{ marginTop:8, padding:"20px", background:C_.surface,
        borderRadius:8, border:`1px solid ${C_.border}` }}>
        {secHead("Materials Summary")}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

          {/* Shards column */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:C_.textDim,
              fontFamily:"'Space Mono',monospace", marginBottom:8, letterSpacing:"1px" }}>
              FC SHARDS
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:11, color:C_.textSec }}>Current Inventory</span>
              <input type="number" min={0}
                value={inv.shards ?? 0}
                onChange={e => setInv(p => ({...p, shards: Number(e.target.value)}))}
                style={{ width:90, textAlign:"right", background:C_.card,
                  border:`1px solid ${C_.border}`, borderRadius:5,
                  color:C_.textPri, padding:"3px 6px", fontSize:11, outline:"none",
                  fontFamily:"'Space Mono',monospace" }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{ fontSize:11, color:C_.textSec }}>Daily Earn (shards)</span>
              <input type="number" min={0}
                value={effectiveDailyShards}
                onChange={e => setDailyEarnShards(Number(e.target.value))}
                style={{ width:90, textAlign:"right", background:C_.card,
                  border:`1px solid ${C_.border}`, borderRadius:5,
                  color:C_.textPri, padding:"3px 6px", fontSize:11, outline:"none",
                  fontFamily:"'Space Mono',monospace" }} />
            </div>
            <div style={{ fontSize:10, color:C_.textDim, marginBottom:12 }}>
              Pulled from Inventory tab · Daily Intel field
            </div>
            <SummaryRow label={`Est. by SvS Tue (${daysToSvSTuesday}d)`}
              val={Math.round(estShardsAtSvS)} />
            <SummaryRow label="Total Required" val={grandTotals.shards} />
            <SummaryRow label="Balance"
              val={(balShards >= 0 ? "+" : "") + Math.round(balShards).toLocaleString()}
              color={balShards >= 0 ? C_.green : C_.red}
              bold />
          </div>

          {/* Steel column */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:C_.textDim,
              fontFamily:"'Space Mono',monospace", marginBottom:8, letterSpacing:"1px" }}>
              STEEL
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:11, color:C_.textSec }}>Current Inventory</span>
              <input type="number" min={0} step="0.01"
                value={inv.steel ?? 0}
                onChange={e => setInv(p => ({...p, steel: Number(e.target.value)}))}
                style={{ width:110, textAlign:"right", background:C_.card,
                  border:`1px solid ${C_.border}`, borderRadius:5,
                  color:C_.textPri, padding:"3px 6px", fontSize:11, outline:"none",
                  fontFamily:"'Space Mono',monospace" }} />
              <span style={{ fontSize:11, color:C_.textDim,
                fontFamily:"'Space Mono',monospace" }}>{inv.steelUnit || "M"}</span>
            </div>
            <div style={{ fontSize:10, color:C_.textDim, marginBottom:12, lineHeight:1.5 }}>
              Rate: {steelRate.toLocaleString()}/hr · 18hr/day effective · {daysToSvSTuesday}d to SvS Tue
            </div>
            <SummaryRow label={`Est. by SvS Tue (${daysToSvSTuesday}d)`}
              val={Math.round(estSteelAtSvS)} />
            <SummaryRow label="Total Required" val={grandTotals.steel} />
            <SummaryRow label="Balance"
              val={(balSteel >= 0 ? "+" : "") + Math.round(balSteel).toLocaleString()}
              color={balSteel >= 0 ? C_.green : C_.red}
              bold />
          </div>
        </div>
      </div>
    </div>
  );
}



// ─── Chief Gear Data ─────────────────────────────────────────────────────────
// [step, label, plans, polish, alloy, amber, power, atkStat, defStat, deploy]
const CHIEF_GEAR_LEVELS = [
  [1,"UC",0,15,1500,0,224400,0.0935,0.0935,0],
  [2,"UC1★",0,40,3800,0,306000,0.1275,0.1275,0],
  [3,"R",0,70,7000,0,408000,0.17,0.17,0],
  [4,"R1★",0,95,9700,0,510000,0.2125,0.2125,0],
  [5,"R2★",45,0,0,0,612000,0.255,0.255,0],
  [6,"R3★",50,0,0,0,714000,0.2975,0.2975,0],
  [7,"E",60,0,0,0,816000,0.34,0.34,0],
  [8,"E1★",70,0,0,0,885360,0.3689,0.3689,0],
  [9,"E2★",40,65,6500,0,954720,0.3978,0.3978,0],
  [10,"E3★",50,80,8000,0,1024080,0.4267,0.4267,0],
  [11,"ET1",60,95,10000,0,1093440,0.4556,0.4556,0],
  [12,"ET1 1★",70,110,11000,0,1162800,0.4845,0.4845,0],
  [13,"ET1 2★",85,130,13000,0,1232160,0.5134,0.5134,0],
  [14,"ET1 3★",100,160,15000,0,1301520,0.5423,0.5423,0],
  [15,"M",40,220,22000,0,1362720,0.5678,0.5678,0],
  [16,"M1★",40,230,23000,0,1423920,0.5933,0.5933,0],
  [17,"M2★",45,250,25000,0,1485120,0.6188,0.6188,0],
  [18,"M3★",45,260,26000,0,1546320,0.6443,0.6443,0],
  [19,"MT1",45,280,28000,0,1607520,0.6698,0.6698,0],
  [20,"MT1 1★",55,280,28000,0,1668720,0.6953,0.6953,0],
  [21,"MT1 2★",55,320,32000,0,1729920,0.7208,0.7208,0],
  [22,"MT1 3★",55,340,35000,0,1791120,0.7463,0.7463,0],
  [23,"MT2",55,360,38000,0,1852320,0.7718,0.7718,0],
  [24,"MT2 1★",75,430,43000,0,1913520,0.7973,0.7973,0],
  [25,"MT2 2★",80,460,45000,0,1974720,0.8228,0.8228,0],
  [26,"MT2 3★",85,500,48000,0,2040000,0.85,0.85,0],
  [27,"L",21,132,12500,2,2142000,0.8925,0.8925,40],
  [28,"L+1",21,132,12500,2,2166000,0.9031,0.9031,50],
  [29,"L+2",21,132,12500,2,2190000,0.9137,0.9137,60],
  [30,"L+3",22,134,12500,4,2214000,0.9243,0.9243,70],
  [31,"L1★",22,140,13000,2,2244000,0.935,0.935,80],
  [32,"L1★+1",22,140,13000,2,2268000,0.9456,0.9456,90],
  [33,"L1★+2",22,140,13000,2,2292000,0.9562,0.9562,100],
  [34,"L1★+3",24,140,13000,4,2316000,0.9668,0.9668,110],
  [35,"L2★",23,147,13500,2,2346000,0.9775,0.9775,120],
  [36,"L2★+1",23,147,13500,2,2370000,0.9881,0.9881,130],
  [37,"L2★+2",23,147,13500,2,2394000,0.9987,0.9987,140],
  [38,"L2★+3",26,149,13500,4,2418000,1.0093,1.0093,150],
  [39,"L3★",25,155,14000,2,2448000,1.02,1.02,160],
  [40,"L3★+1",25,155,14000,2,2472000,1.0306,1.0306,170],
  [41,"L3★+2",25,155,14000,2,2496000,1.0412,1.0412,180],
  [42,"L3★+3",25,155,14000,4,2520000,1.0518,1.0518,190],
  [43,"LT1",27,167,14750,3,2550000,1.0625,1.0625,290],
  [44,"LT1+1",27,167,14750,3,2574000,1.0731,1.0731,300],
  [45,"LT1+2",27,167,14750,3,2598000,1.0837,1.0837,310],
  [46,"LT1+3",29,169,14750,6,2622000,1.0943,1.0943,320],
  [47,"LT1 1★",28,175,15250,3,2652000,1.105,1.105,330],
  [48,"LT1 1★+1",28,175,15250,3,2676000,1.1156,1.1156,340],
  [49,"LT1 1★+2",28,175,15250,3,2700000,1.1262,1.1262,350],
  [50,"LT1 1★+3",31,175,15250,6,2724000,1.1368,1.1368,360],
  [51,"LT1 2★",30,182,15750,3,2754000,1.1475,1.1475,370],
  [52,"LT1 2★+1",30,182,15750,3,2778000,1.1581,1.1581,380],
  [53,"LT1 2★+2",30,182,15750,3,2802000,1.1687,1.1687,390],
  [54,"LT1 2★+3",30,184,15750,6,2826000,1.1793,1.1793,400],
  [55,"LT1 3★",31,190,16250,3,2856000,1.19,1.19,410],
  [56,"LT1 3★+1",31,190,16250,3,2880000,1.2006,1.2006,420],
  [57,"LT1 3★+2",31,190,16250,3,2904000,1.2112,1.2112,430],
  [58,"LT1 3★+3",32,190,16250,6,2928000,1.2218,1.2218,440],
  [59,"LT2",33,202,17000,5,2958000,1.2325,1.2325,540],
  [60,"LT2+1",33,202,17000,5,2983000,1.2431,1.2431,550],
  [61,"LT2+2",33,202,17000,5,3008000,1.2537,1.2537,560],
  [62,"LT2+3",36,204,17000,5,3033000,1.2643,1.2643,570],
  [63,"LT2 1★",35,210,17500,5,3060000,1.275,1.275,580],
  [64,"LT2 1★+1",35,210,17500,5,3085000,1.2856,1.2856,590],
  [65,"LT2 1★+2",35,210,17500,5,3110000,1.2962,1.2962,600],
  [66,"LT2 1★+3",35,210,17500,5,3135000,1.3068,1.3068,610],
  [67,"LT2 2★",36,217,18000,5,3162000,1.3175,1.3175,620],
  [68,"LT2 2★+1",36,217,18000,5,3187000,1.3281,1.3281,630],
  [69,"LT2 2★+2",36,217,18000,5,3212000,1.3387,1.3387,640],
  [70,"LT2 2★+3",37,219,18000,5,3237000,1.3493,1.3493,650],
  [71,"LT2 3★",37,225,18500,5,3264000,1.36,1.36,660],
  [72,"LT2 3★+1",37,225,18500,5,3289000,1.3706,1.3706,670],
  [73,"LT2 3★+2",37,225,18500,5,3314000,1.3812,1.3812,680],
  [74,"LT2 3★+3",39,225,18500,5,3339000,1.3918,1.3918,690],
  [75,"LT3",40,237,19250,6,3366000,1.4025,1.4025,790],
  [76,"LT3+1",40,237,19250,6,3391000,1.4131,1.4131,800],
  [77,"LT3+2",40,237,19250,6,3416000,1.4237,1.4237,810],
  [78,"LT3+3",40,239,19250,7,3441000,1.4343,1.4343,820],
  [79,"LT3 1★",41,247,20000,6,3468000,1.445,1.445,830],
  [80,"LT3 1★+1",41,247,20000,6,3493000,1.4556,1.4556,840],
  [81,"LT3 1★+2",41,247,20000,6,3518000,1.4662,1.4662,850],
  [82,"LT3 1★+3",42,249,20000,7,3543000,1.4768,1.4768,860],
  [83,"LT3 2★",42,257,20750,6,3570000,1.4875,1.4875,870],
  [84,"LT3 2★+1",42,257,20750,6,3595000,1.4981,1.4981,880],
  [85,"LT3 2★+2",42,257,20750,6,3620000,1.5087,1.5087,890],
  [86,"LT3 2★+3",44,259,20750,7,3645000,1.5193,1.5193,900],
  [87,"LT3 3★",50,300,24000,8,3672000,1.53,1.53,910],
  [88,"LT3 3★+1",50,300,24000,8,3697000,1.5406,1.5406,920],
  [89,"LT3 3★+2",50,300,24000,8,3722000,1.5512,1.5512,930],
  [90,"LT3 3★+3",50,300,24000,8,3747000,1.5618,1.5618,940],
  [91,"LT4",50,300,24000,8,3876000,1.615,1.615,1050],
  [92,"LT4+1",55,330,28000,8,3916000,1.632,1.632,1060],
  [93,"LT4+2",55,330,28000,8,3956000,1.649,1.649,1070],
  [94,"LT4+3",55,330,28000,8,3996000,1.666,1.666,1080],
  [95,"LT4+4",55,330,28000,8,4036000,1.683,1.683,1090],
  [96,"LT4 1★",55,330,28000,8,4080000,1.7,1.7,1100],
  [97,"LT4 1★+1",60,360,32000,8,4120000,1.717,1.717,1110],
  [98,"LT4 1★+2",60,360,32000,8,4160000,1.734,1.734,1120],
  [99,"LT4 1★+3",60,360,32000,8,4200000,1.751,1.751,1130],
  [100,"LT4 1★+4",60,360,32000,8,4240000,1.768,1.768,1140],
  [101,"LT4 2★",60,360,32000,8,4284000,1.785,1.785,1150],
  [102,"LT4 2★+1",65,390,36000,8,4324000,1.802,1.802,1160],
  [103,"LT4 2★+2",65,390,36000,8,4364000,1.819,1.819,1170],
  [104,"LT4 2★+3",65,390,36000,8,4404000,1.836,1.836,1180],
  [105,"LT4 2★+4",65,390,36000,8,4444000,1.853,1.853,1190],
  [106,"LT4 3★",65,390,36000,8,4488000,1.87,1.87,1200],
];

// Helper: is a level label "Legendary" tier?
function isLegendaryGearLevel(label) {
  return /^L/.test(label);
}

// Compute cost to go from stepIdx cur to stepIdx goal (exclusive of cur step)
function calcChiefGearCost(curIdx, goalIdx) {
  let plans=0, polish=0, alloy=0, amber=0;
  for (let i = curIdx+1; i <= goalIdx; i++) {
    const r = CHIEF_GEAR_LEVELS[i];
    plans  += r[2]; polish += r[3]; alloy  += r[4]; amber  += r[5];
  }
  return { plans, polish, alloy, amber };
}

// Build two-level grouping: main levels (no "+") each hold their sub-levels (with "+")
// GEAR_GROUPS[i] = { label, stepIdx, subs: [{label, stepIdx}] }
const GEAR_GROUPS = (() => {
  const groups = [];
  let last = null;
  CHIEF_GEAR_LEVELS.forEach((r, i) => {
    if (!r[1].includes('+')) {
      last = { label: r[1], stepIdx: i, subs: [] };
      groups.push(last);
    } else {
      last.subs.push({ label: r[1], stepIdx: i });
    }
  });
  return groups;
})();

// Given a flat stepIdx, return { groupIdx, subIdx }
// subIdx 0 = the main level itself, 1+ = sub-levels
function stepToGroupSub(stepIdx) {
  for (let g = 0; g < GEAR_GROUPS.length; g++) {
    const grp = GEAR_GROUPS[g];
    if (grp.stepIdx === stepIdx) return { groupIdx: g, subIdx: 0 };
    for (let s = 0; s < grp.subs.length; s++) {
      if (grp.subs[s].stepIdx === stepIdx) return { groupIdx: g, subIdx: s + 1 };
    }
  }
  return { groupIdx: 0, subIdx: 0 };
}

// Given groupIdx + subIdx, return flat stepIdx
function groupSubToStep(groupIdx, subIdx) {
  const grp = GEAR_GROUPS[groupIdx];
  if (!grp) return 0;
  if (subIdx === 0) return grp.stepIdx;
  return grp.subs[subIdx - 1]?.stepIdx ?? grp.stepIdx;
}

// ─── Chief Gear Pieces ───────────────────────────────────────────────────────
const CHIEF_GEAR_PIECES = [
  { name:"Cap",    troop:"Lancer"   },
  { name:"Watch",  troop:"Lancer"   },
  { name:"Coat",   troop:"Infantry" },
  { name:"Pants",  troop:"Infantry" },
  { name:"Ring",   troop:"Marksman" },
  { name:"Weapon", troop:"Marksman" },
];

function defaultChiefGearSlots() {
  return CHIEF_GEAR_PIECES.map(p => ({ piece: p.name, current: 0, goal: 0 }));
}

// ─── Chief Gear Page ─────────────────────────────────────────────────────────
// Two-dropdown level picker: main tier + sub-level
function GearLevelPicker({ value, onChange, minStep, sel }) {
  const { groupIdx, subIdx } = stepToGroupSub(value);
  const grp = GEAR_GROUPS[groupIdx] || GEAR_GROUPS[0];
  const hasSubs = grp.subs.length > 0;

  // Available main groups (for goal: only those whose last step >= minStep)
  const availableGroups = GEAR_GROUPS.reduce((acc, g, gi) => {
    if (minStep != null) {
      const lastStep = g.subs.length > 0 ? g.subs[g.subs.length-1].stepIdx : g.stepIdx;
      if (lastStep < minStep) return acc;
    }
    acc.push({ g, gi });
    return acc;
  }, []);

  // Sub options for current group (base + subs), filtered to >= minStep
  const subOpts = [
    { label:"Base", si:0, stepIdx:grp.stepIdx },
    ...grp.subs.map((s, i) => ({
      label:`+${s.label.split('+').pop()}`,
      si: i+1,
      stepIdx: s.stepIdx,
    })),
  ].filter(o => minStep == null || o.stepIdx >= minStep);

  const handleMain = e => {
    const newGi = Number(e.target.value);
    const newGrp = GEAR_GROUPS[newGi];
    if (!newGrp) return;
    // Use base step, unless it's below minStep — then use minStep
    const base = newGrp.stepIdx;
    const step = (minStep != null && base < minStep) ? minStep : base;
    onChange(step);
  };

  const handleSub = e => {
    const si = Number(e.target.value);
    onChange(si === 0 ? grp.stepIdx : grp.subs[si-1].stepIdx);
  };

  return (
    <div style={{display:"flex",gap:4,alignItems:"center"}}>
      <select value={groupIdx} onChange={handleMain} style={{...sel,minWidth:90}}>
        {availableGroups.map(({g,gi}) => (
          <option key={gi} value={gi}>{g.label}</option>
        ))}
      </select>
      {hasSubs && subOpts.length > 0 && (
        <select key={`sub-${groupIdx}`} value={subIdx} onChange={handleSub}
          style={{...sel,minWidth:52}}>
          {subOpts.map(o => (
            <option key={o.si} value={o.si}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
function ChiefGearPage({ inv }) {
  const C = COLORS;
  const sel = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
    color:C.textPri, padding:"4px 6px", fontSize:11, outline:"none" };
  const [slots, setSlots] = useLocalStorage("cg-slots", defaultChiefGearSlots());
  const [bulkCurrent, setBulkCurrent] = useState(0);
  const [bulkGoal,    setBulkGoal]    = useState(0);

  const setSlotField = (idx, field, val) => {
    setSlots(prev => prev.map((s,i) => {
      if (i !== idx) return s;
      const updated = { ...s, [field]: val };
      if (field === "current" && val > updated.goal) updated.goal = val;
      if (field === "goal" && val < updated.current) updated.goal = updated.current;
      return updated;
    }));
  };

  const applyBulkCurrent = () => setSlots(prev => prev.map(s => ({
    ...s, current: bulkCurrent, goal: Math.max(s.goal, bulkCurrent),
  })));

  const applyBulkGoal = () => setSlots(prev => prev.map(s => ({
    ...s, goal: Math.max(bulkGoal, s.current),
  })));

  // Totals
  const totals = slots.reduce((acc, s) => {
    if (s.current === s.goal) return acc;
    const c = calcChiefGearCost(s.current, s.goal);
    acc.plans  += c.plans;  acc.polish += c.polish;
    acc.alloy  += c.alloy;  acc.amber  += c.amber;
    return acc;
  }, { plans:0, polish:0, alloy:0, amber:0 });

  const typeColor = t => t === "Infantry" ? C.green : t === "Lancer" ? C.blue : C.amber;

  const thS = { padding:"8px 10px", fontSize:10, fontWeight:700, textAlign:"left",
    borderBottom:`1px solid ${C.border}`, color:C.textSec,
    fontFamily:"'Space Mono',monospace", whiteSpace:"nowrap" };
  const tdS = { padding:"8px 10px", fontSize:11, borderBottom:`1px solid ${C.border}`,
    verticalAlign:"middle" };
  const tdMono = { ...tdS, fontFamily:"'Space Mono',monospace", textAlign:"right" };

  return (
    <div style={{ padding:"0 0 40px" }}>

      {/* Bulk controls */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:16,
        padding:"12px 14px", background:C.surface, borderRadius:8,
        border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, color:C.textSec, whiteSpace:"nowrap" }}>Set all Current to:</span>
          <GearLevelPicker value={bulkCurrent} onChange={setBulkCurrent} sel={sel} />
          <button onClick={applyBulkCurrent}
            style={{ padding:"5px 12px", borderRadius:6, fontSize:11, fontWeight:700,
              cursor:"pointer", fontFamily:"Syne,sans-serif", border:`1px solid ${C.blue}`,
              background:C.blueBg, color:C.blue }}>Apply</button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, color:C.textSec, whiteSpace:"nowrap" }}>Set all Goal to:</span>
          <GearLevelPicker value={bulkGoal} onChange={setBulkGoal} sel={sel} />
          <button onClick={applyBulkGoal}
            style={{ padding:"5px 12px", borderRadius:6, fontSize:11, fontWeight:700,
              cursor:"pointer", fontFamily:"Syne,sans-serif", border:`1px solid ${C.green}`,
              background:C.greenBg, color:C.green }}>Apply</button>
        </div>
      </div>

      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
          <thead>
            <tr>
              <th style={thS}>Troop</th>
              <th style={thS}>Piece</th>
              <th style={thS}>Current Level</th>
              <th style={thS}>Goal Level</th>
              <th style={{ ...thS, textAlign:"right" }}>Plans</th>
              <th style={{ ...thS, textAlign:"right" }}>Polish</th>
              <th style={{ ...thS, textAlign:"right" }}>Alloy</th>
              <th style={{ ...thS, textAlign:"right" }}>Amber</th>
              <th style={{ ...thS, textAlign:"right" }}>Cur. Power</th>
              <th style={{ ...thS, textAlign:"right" }}>Goal Power</th>
              <th style={{ ...thS, textAlign:"right" }}>Deployment Buff</th>
            </tr>
          </thead>
          <tbody>
            {CHIEF_GEAR_PIECES.map((piece, idx) => {
              const s = slots[idx] || { current:0, goal:0 };
              const curRow = CHIEF_GEAR_LEVELS[s.current];
              const goalRow = CHIEF_GEAR_LEVELS[s.goal];
              const cost = calcChiefGearCost(s.current, s.goal);
              const changed = s.current !== s.goal;

              // Show troop label only on first piece of each troop group
              const prevPiece = idx > 0 ? CHIEF_GEAR_PIECES[idx-1] : null;
              const showTroop = !prevPiece || prevPiece.troop !== piece.troop;

              // Deployment buff: only show if either current or goal is Legendary
              const showDeploy = isLegendaryGearLevel(curRow[1]) || isLegendaryGearLevel(goalRow[1]);

              return (
                <React.Fragment key={piece.name}>
                  <tr style={{ background: idx%2===0 ? "transparent" : C.surface }}>
                    <td style={{ ...tdS, fontWeight:700, color: typeColor(piece.troop), width:90 }}>
                      {showTroop ? piece.troop : ""}
                    </td>
                    <td style={{ ...tdS, fontWeight:600 }}>{piece.name}</td>
                    <td style={{ ...tdS, width:180 }}>
                      <GearLevelPicker
                        value={s.current}
                        onChange={v => setSlotField(idx,"current",v)}
                        sel={sel}
                      />
                    </td>
                    <td style={{ ...tdS, width:180 }}>
                      <GearLevelPicker
                        value={s.goal}
                        onChange={v => setSlotField(idx,"goal",v)}
                        minStep={s.current}
                        sel={sel}
                      />
                    </td>
                    <td style={tdMono}>{changed ? cost.plans.toLocaleString() : "—"}</td>
                    <td style={tdMono}>{changed ? cost.polish.toLocaleString() : "—"}</td>
                    <td style={tdMono}>{changed ? cost.alloy.toLocaleString() : "—"}</td>
                    <td style={tdMono}>{changed ? cost.amber.toLocaleString() : "—"}</td>
                    <td style={tdMono}>{curRow[6] != null ? curRow[6].toLocaleString() : "TBD"}</td>
                    <td style={tdMono}>{goalRow[6] != null ? goalRow[6].toLocaleString() : "TBD"}</td>
                    <td style={tdMono}>{showDeploy ? (goalRow[9] > 0 ? `+${goalRow[9].toLocaleString()}` : "—") : "—"}</td>
                  </tr>

                  {/* Stat sub-row */}
                  {changed && (() => {
                    const LABELS = ["Power","Troop Atk","Troop Def","Deploy Buff"];
                    const getVals = row => [
                      row[6],
                      row[7],
                      row[8],
                      showDeploy ? row[9] : null,
                    ];
                    const curVals  = getVals(curRow);
                    const goalVals = getVals(goalRow);
                    const chgVals  = curVals.map((v,i) => (v!=null && goalVals[i]!=null) ? goalVals[i]-v : null);
                    const fmtV = (v, i) => {
                      if (v == null) return "TBD";
                      if (i === 0) return v.toLocaleString();
                      if (i === 3) return v === 0 ? "—" : `+${v.toLocaleString()}`;
                      return `${(v * 100).toFixed(2)}%`;
                    };
                    const chgColor = v => v==null ? C.textDim : v>0 ? C.green : v<0 ? C.red : C.textDim;
                    const tdSt = { padding:"4px 8px", fontSize:10,
                      fontFamily:"'Space Mono',monospace",
                      borderRight:`1px solid ${C.border}`, textAlign:"center" };
                    const rows = [
                      { label:"Current", color:C.textSec, bg:"transparent",          vals:curVals  },
                      { label:"Goal",    color:C.blue,    bg:"rgba(56,139,253,0.06)", vals:goalVals },
                      { label:"Change",  color:C.green,   bg:"rgba(63,185,80,0.06)",  vals:chgVals, isChange:true },
                    ];
                    return (
                      <tr style={{ background:"rgba(56,139,253,0.04)" }}>
                        <td colSpan={11} style={{ padding:"6px 10px", borderBottom:`1px solid ${C.border}` }}>
                          <div style={{ borderRadius:6, overflow:"hidden", border:`1px solid ${C.border}` }}>
                            <table style={{ borderCollapse:"collapse", width:"100%", fontSize:10 }}>
                              <thead>
                                <tr>
                                  <td style={{ ...tdSt, width:60, color:C.textDim, fontWeight:700, fontSize:9 }}/>
                                  {LABELS.map((l,i) => (showDeploy || i<3) && (
                                    <td key={l} style={{ ...tdSt, color:C.textDim, fontWeight:700, fontSize:9, whiteSpace:"nowrap" }}>{l}</td>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map(row => (
                                  <tr key={row.label} style={{ background:row.bg }}>
                                    <td style={{ ...tdSt, color:row.color, fontWeight:700, fontSize:9 }}>{row.label}</td>
                                    {row.vals.map((v,i) => (showDeploy || i<3) && (
                                      <td key={i} style={{ ...tdSt, color: row.isChange ? chgColor(v) : (v==null?C.textDim:C.textPri) }}>
                                        {row.isChange && v!=null && v>0 && i!==3 ? "+" : ""}{fmtV(v,i)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Material Summary */}
      <div style={{ marginTop:28 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase",
          color:C.textDim, fontFamily:"'Space Mono',monospace", marginBottom:10,
          paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>
          Materials Required
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", fontSize:11, minWidth:420 }}>
            <thead>
              <tr>
                {["Material","Required","Have","Balance"].map(h => (
                  <th key={h} style={{ ...thS, textAlign: h==="Material"?"left":"right", minWidth:100 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label:"Design Plans", req:totals.plans,  have:inv.chiefPlans  ?? 0 },
                { label:"Polish",        req:totals.polish, have:inv.chiefPolish ?? 0 },
                { label:"Alloy",         req:totals.alloy,  have:inv.chiefAlloy  ?? 0 },
                { label:"Amber",         req:totals.amber,  have:inv.chiefAmber  ?? 0 },
              ].map(({ label, req, have }) => {
                const bal = have - req;
                const balColor = bal >= 0 ? C.green : C.red;
                return (
                  <tr key={label}>
                    <td style={{ ...tdS, fontWeight:600 }}>{label}</td>
                    <td style={tdMono}>{req.toLocaleString()}</td>
                    <td style={tdMono}>{have.toLocaleString()}</td>
                    <td style={{ ...tdMono, fontWeight:700, color:balColor }}>
                      {bal >= 0 ? "+" : ""}{bal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Chief Charms Data ────────────────────────────────────────────────────────
// [label, guides, designs, secrets, cumulativePower, stat%]
// Cumulative power = sum of all gains up to and including this level
const CHIEF_CHARM_LEVELS = [
  {label:"Lv. 1",guides:5,designs:5,secrets:0,power:205700,health:0.09,leth:0.09},
  {label:"Lv. 2",guides:40,designs:15,secrets:0,power:288000,health:0.12,leth:0.12},
  {label:"Lv. 3",guides:60,designs:40,secrets:0,power:370000,health:0.16,leth:0.16},
  {label:"Lv. 4",guides:80,designs:100,secrets:0,power:452000,health:0.19,leth:0.19},
  {label:"Lv. 4.1",guides:25,designs:50,secrets:0,power:483000,health:0.205,leth:0.205},
  {label:"Lv. 4.2",guides:25,designs:50,secrets:0,power:514000,health:0.22,leth:0.22},
  {label:"Lv. 4.3",guides:25,designs:50,secrets:0,power:545000,health:0.235,leth:0.235},
  {label:"Lv. 5",guides:25,designs:50,secrets:0,power:576000,health:0.25,leth:0.25},
  {label:"Lv. 5.1",guides:30,designs:75,secrets:0,power:607000,health:0.2625,leth:0.2625},
  {label:"Lv. 5.2",guides:30,designs:75,secrets:0,power:638000,health:0.275,leth:0.275},
  {label:"Lv. 5.3",guides:30,designs:75,secrets:0,power:669000,health:0.2875,leth:0.2875},
  {label:"Lv. 6",guides:30,designs:75,secrets:0,power:700000,health:0.3,leth:0.3},
  {label:"Lv. 6.1",guides:35,designs:100,secrets:0,power:731000,health:0.3125,leth:0.3125},
  {label:"Lv. 6.2",guides:35,designs:100,secrets:0,power:762000,health:0.325,leth:0.325},
  {label:"Lv. 6.3",guides:35,designs:100,secrets:0,power:793000,health:0.3375,leth:0.3375},
  {label:"Lv. 7",guides:35,designs:100,secrets:0,power:824000,health:0.35,leth:0.35},
  {label:"Lv. 7.1",guides:50,designs:100,secrets:0,power:855000,health:0.3625,leth:0.3625},
  {label:"Lv. 7.2",guides:50,designs:100,secrets:0,power:886000,health:0.375,leth:0.375},
  {label:"Lv. 7.3",guides:50,designs:100,secrets:0,power:917000,health:0.3875,leth:0.3875},
  {label:"Lv. 8",guides:50,designs:100,secrets:0,power:948000,health:0.4,leth:0.4},
  {label:"Lv. 8.1",guides:75,designs:100,secrets:0,power:979000,health:0.4125,leth:0.4125},
  {label:"Lv. 8.2",guides:75,designs:100,secrets:0,power:1010000,health:0.425,leth:0.425},
  {label:"Lv. 8.3",guides:75,designs:100,secrets:0,power:1041000,health:0.4375,leth:0.4375},
  {label:"Lv. 9",guides:75,designs:100,secrets:0,power:1072000,health:0.45,leth:0.45},
  {label:"Lv. 9.1",guides:105,designs:105,secrets:0,power:1103000,health:0.4625,leth:0.4625},
  {label:"Lv. 9.2",guides:105,designs:105,secrets:0,power:1134000,health:0.475,leth:0.475},
  {label:"Lv. 9.3",guides:105,designs:105,secrets:0,power:1165000,health:0.4875,leth:0.4875},
  {label:"Lv. 10",guides:105,designs:105,secrets:0,power:1196000,health:0.5,leth:0.5},
  {label:"Lv. 10.1",guides:112,designs:84,secrets:0,power:1220800,health:0.51,leth:0.51},
  {label:"Lv. 10.2",guides:112,designs:84,secrets:0,power:1245600,health:0.52,leth:0.52},
  {label:"Lv. 10.3",guides:112,designs:84,secrets:0,power:1270400,health:0.53,leth:0.53},
  {label:"Lv. 10.4",guides:112,designs:84,secrets:0,power:1295200,health:0.54,leth:0.54},
  {label:"Lv. 11",guides:112,designs:84,secrets:0,power:1320000,health:0.55,leth:0.55},
  {label:"Lv. 11.1",guides:116,designs:90,secrets:3,power:1344800,health:0.568,leth:0.568},
  {label:"Lv. 11.2",guides:116,designs:90,secrets:3,power:1369600,health:0.586,leth:0.586},
  {label:"Lv. 11.3",guides:116,designs:90,secrets:3,power:1394400,health:0.604,leth:0.604},
  {label:"Lv. 11.4",guides:116,designs:90,secrets:3,power:1419200,health:0.622,leth:0.622},
  {label:"Lv. 12",guides:116,designs:90,secrets:3,power:1444000,health:0.64,leth:0.64},
  {label:"Lv. 12.1",guides:116,designs:90,secrets:6,power:1468800,health:0.658,leth:0.658},
  {label:"Lv. 12.2",guides:116,designs:90,secrets:6,power:1493600,health:0.676,leth:0.676},
  {label:"Lv. 12.3",guides:116,designs:90,secrets:6,power:1518400,health:0.694,leth:0.694},
  {label:"Lv. 12.4",guides:116,designs:90,secrets:6,power:1543200,health:0.712,leth:0.712},
  {label:"Lv. 13",guides:116,designs:90,secrets:6,power:1568000,health:0.73,leth:0.73},
  {label:"Lv. 13.1",guides:120,designs:100,secrets:9,power:1592800,health:0.748,leth:0.748},
  {label:"Lv. 13.2",guides:120,designs:100,secrets:9,power:1617600,health:0.766,leth:0.766},
  {label:"Lv. 13.3",guides:120,designs:100,secrets:9,power:1642400,health:0.784,leth:0.784},
  {label:"Lv. 13.4",guides:120,designs:100,secrets:9,power:1667200,health:0.802,leth:0.802},
  {label:"Lv. 14",guides:120,designs:100,secrets:9,power:1692000,health:0.82,leth:0.82},
  {label:"Lv. 14.1",guides:120,designs:100,secrets:14,power:1716800,health:0.838,leth:0.838},
  {label:"Lv. 14.2",guides:120,designs:100,secrets:14,power:1741600,health:0.856,leth:0.856},
  {label:"Lv. 14.3",guides:120,designs:100,secrets:14,power:1766400,health:0.874,leth:0.874},
  {label:"Lv. 14.4",guides:120,designs:100,secrets:14,power:1791200,health:0.892,leth:0.892},
  {label:"Lv. 15",guides:120,designs:100,secrets:14,power:1816000,health:0.91,leth:0.91},
  {label:"Lv. 15.1",guides:130,designs:110,secrets:20,power:1840800,health:0.928,leth:0.928},
  {label:"Lv. 15.2",guides:130,designs:110,secrets:20,power:1865600,health:0.946,leth:0.946},
  {label:"Lv. 15.3",guides:130,designs:110,secrets:20,power:1890400,health:0.964,leth:0.964},
  {label:"Lv. 15.4",guides:130,designs:110,secrets:20,power:1915200,health:0.982,leth:0.982},
  {label:"Lv. 16",guides:130,designs:110,secrets:20,power:1940000,health:1.0,leth:1.0},
];

// Chief Charm pieces: 6 gear pieces × 3 charms each = 18 total
const CHIEF_CHARM_PIECES = [
  { gear:"Cap",    troop:"Lancer",   charms:["Cap Charm 1","Cap Charm 2","Cap Charm 3"] },
  { gear:"Watch",  troop:"Lancer",   charms:["Watch Charm 1","Watch Charm 2","Watch Charm 3"] },
  { gear:"Coat",   troop:"Infantry", charms:["Coat Charm 1","Coat Charm 2","Coat Charm 3"] },
  { gear:"Pants",  troop:"Infantry", charms:["Pants Charm 1","Pants Charm 2","Pants Charm 3"] },
  { gear:"Ring",   troop:"Marksman", charms:["Ring Charm 1","Ring Charm 2","Ring Charm 3"] },
  { gear:"Weapon", troop:"Marksman", charms:["Weapon Charm 1","Weapon Charm 2","Weapon Charm 3"] },
];

function defaultCharmSlots() {
  return CHIEF_CHARM_PIECES.flatMap(p =>
    p.charms.map(name => ({ charm:name, gear:p.gear, troop:p.troop, current:0, goal:0 }))
  );
}

// Compute cost between two level indices (exclusive of current)
function calcCharmCost(curIdx, goalIdx) {
  let guides=0, designs=0, secrets=0;
  for (let i = curIdx+1; i <= goalIdx; i++) {
    const r = CHIEF_CHARM_LEVELS[i];
    guides  += r.guides;
    designs += r.designs;
    secrets += r.secrets;
  }
  return { guides, designs, secrets };
}

// ─── Chief Charms Page ────────────────────────────────────────────────────────
// Build two-level grouping for charm levels
// Main = no decimal in number (Lv. 1, Lv. 4, Lv. 10)
// Sub  = has decimal (Lv. 4.1, Lv. 10.3)
// idx here is 0-based array index; stored value is idx+1 (1-based, 0=None)
const CHARM_GROUPS = (() => {
  const groups = [];
  let last = null;
  CHIEF_CHARM_LEVELS.forEach((r, i) => {
    const isSub = /Lv[.\s]+\d+\.\d+/.test(r.label);
    if (!isSub) {
      last = { label: r.label, idx: i, subs: [] };
      groups.push(last);
    } else {
      last.subs.push({ label: r.label, idx: i });
    }
  });
  return groups;
})();

function charmIdxToGroupSub(storedVal) {
  // storedVal is 1-based (0 = None). Convert to 0-based idx.
  if (!storedVal) return { groupIdx: -1, subIdx: 0 };
  const idx = storedVal - 1;
  for (let g = 0; g < CHARM_GROUPS.length; g++) {
    const grp = CHARM_GROUPS[g];
    if (grp.idx === idx) return { groupIdx: g, subIdx: 0 };
    for (let s = 0; s < grp.subs.length; s++) {
      if (grp.subs[s].idx === idx) return { groupIdx: g, subIdx: s + 1 };
    }
  }
  return { groupIdx: -1, subIdx: 0 };
}

function charmGroupSubToStored(groupIdx, subIdx) {
  if (groupIdx < 0) return 0; // None
  const grp = CHARM_GROUPS[groupIdx];
  if (!grp) return 0;
  const idx = subIdx === 0 ? grp.idx : (grp.subs[subIdx - 1]?.idx ?? grp.idx);
  return idx + 1; // convert to 1-based
}

function CharmLevelPicker({ value, onChange, minVal, sel }) {
  // value and minVal are 1-based stored values (0 = None)
  const { groupIdx, subIdx } = charmIdxToGroupSub(value);
  const grp = groupIdx >= 0 ? CHARM_GROUPS[groupIdx] : null;
  const hasSubs = grp && grp.subs.length > 0;

  // Available main groups: last step's stored val >= minVal
  const availableGroups = CHARM_GROUPS.reduce((acc, g, gi) => {
    if (minVal != null && minVal > 0) {
      const lastIdx = g.subs.length > 0 ? g.subs[g.subs.length-1].idx : g.idx;
      if (lastIdx + 1 < minVal) return acc;
    }
    acc.push({ g, gi });
    return acc;
  }, []);

  // Sub options for current group, filtered to >= minVal
  const subOpts = grp ? [
    { label:"Base", si:0, stored: grp.idx + 1 },
    ...grp.subs.map((s, i) => ({
      label: `.${s.label.split('.').pop()}`,
      si: i + 1,
      stored: s.idx + 1,
    })),
  ].filter(o => minVal == null || minVal === 0 || o.stored >= minVal) : [];

  const handleMain = e => {
    const newGi = Number(e.target.value);
    const newGrp = CHARM_GROUPS[newGi];
    if (!newGrp) return;
    const base = newGrp.idx + 1;
    const stored = (minVal && base < minVal) ? minVal : base;
    onChange(stored);
  };

  const handleSub = e => {
    onChange(charmGroupSubToStored(groupIdx, Number(e.target.value)));
  };

  return (
    <div style={{display:"flex",gap:4,alignItems:"center"}}>
      {/* None option + main dropdown */}
      <select value={groupIdx} onChange={handleMain} style={{...sel,minWidth:80}}>
        <option value={-1}>— None —</option>
        {availableGroups.map(({g,gi}) => (
          <option key={gi} value={gi}>{g.label}</option>
        ))}
      </select>
      {hasSubs && subOpts.length > 0 && (
        <select key={`csub-${groupIdx}`} value={subIdx} onChange={handleSub}
          style={{...sel,minWidth:52}}>
          {subOpts.map(o => (
            <option key={o.si} value={o.si}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function ChiefCharmsPage({ inv }) {
  const C = COLORS;
  const sel = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
    color:C.textPri, padding:"4px 6px", fontSize:11, outline:"none" };
  const [slots, setSlots] = useLocalStorage("cc-slots", defaultCharmSlots());
  const [bulkCurrent, setBulkCurrent] = useState(0);
  const [bulkGoal,    setBulkGoal]    = useState(0);

  const setSlotField = (idx, field, val) => {
    setSlots(prev => prev.map((s,i) => {
      if (i !== idx) return s;
      const updated = { ...s, [field]: val };
      if (field === "current" && val > updated.goal) updated.goal = val;
      if (field === "goal" && val < updated.current) updated.goal = updated.current;
      return updated;
    }));
  };

  const applyBulkCurrent = () => setSlots(prev => prev.map(s => ({
    ...s, current: bulkCurrent, goal: Math.max(s.goal, bulkCurrent),
  })));

  const applyBulkGoal = () => setSlots(prev => prev.map(s => ({
    ...s, goal: Math.max(bulkGoal, s.current),
  })));

  // Totals across all 18 charms
  const totals = slots.reduce((acc, s) => {
    if (s.current === s.goal) return acc;
    const c = calcCharmCost(s.current, s.goal);
    acc.guides  += c.guides;
    acc.designs += c.designs;
    acc.secrets += c.secrets;
    return acc;
  }, { guides:0, designs:0, secrets:0 });

  const typeColor = t => t==="Infantry" ? C.green : t==="Lancer" ? C.blue : C.amber;

  const thS = { padding:"8px 10px", fontSize:10, fontWeight:700, textAlign:"left",
    borderBottom:`1px solid ${C.border}`, color:C.textSec,
    fontFamily:"'Space Mono',monospace", whiteSpace:"nowrap" };
  const tdS = { padding:"6px 10px", fontSize:11, borderBottom:`1px solid ${C.border}`,
    verticalAlign:"middle" };
  const tdMono = { ...tdS, fontFamily:"'Space Mono',monospace", textAlign:"right" };

  // Charm index within its gear group (0,1,2)
  let charmIdxInGroup = 0;
  let lastGear = "";

  return (
    <div style={{ padding:"0 0 40px" }}>

      {/* Bulk controls */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:16,
        padding:"12px 14px", background:C.surface, borderRadius:8,
        border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, color:C.textSec, whiteSpace:"nowrap" }}>Set all Current Charms to:</span>
          <CharmLevelPicker value={bulkCurrent} onChange={setBulkCurrent} sel={sel} />
          <button onClick={applyBulkCurrent}
            style={{ padding:"5px 12px", borderRadius:6, fontSize:11, fontWeight:700,
              cursor:"pointer", fontFamily:"Syne,sans-serif", border:`1px solid ${C.blue}`,
              background:C.blueBg, color:C.blue }}>Apply</button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, color:C.textSec, whiteSpace:"nowrap" }}>Set all Goal Charms to:</span>
          <CharmLevelPicker value={bulkGoal} onChange={setBulkGoal} sel={sel} />
          <button onClick={applyBulkGoal}
            style={{ padding:"5px 12px", borderRadius:6, fontSize:11, fontWeight:700,
              cursor:"pointer", fontFamily:"Syne,sans-serif", border:`1px solid ${C.green}`,
              background:C.greenBg, color:C.green }}>Apply</button>
        </div>
      </div>

      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:780 }}>
          <thead>
            <tr>
              <th style={thS}>Troop</th>
              <th style={thS}>Gear</th>
              <th style={thS}>Charm</th>
              <th style={thS}>Current Level</th>
              <th style={thS}>Goal Level</th>
              <th style={{ ...thS, textAlign:"right" }}>Guides</th>
              <th style={{ ...thS, textAlign:"right" }}>Designs</th>
              <th style={{ ...thS, textAlign:"right" }}>Secrets</th>
              <th style={{ ...thS, textAlign:"right" }}>Cur. Power</th>
              <th style={{ ...thS, textAlign:"right" }}>Goal Power</th>
              <th style={{ ...thS, textAlign:"right" }}>Lethality</th>
              <th style={{ ...thS, textAlign:"right" }}>Health</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s, idx) => {
              const curLvl  = s.current > 0 ? CHIEF_CHARM_LEVELS[s.current - 1] : null;
              const goalLvl = s.goal    > 0 ? CHIEF_CHARM_LEVELS[s.goal    - 1] : null;
              const cost = calcCharmCost(s.current, s.goal);
              const changed = s.current !== s.goal;

              // Track grouping labels
              const showTroop = idx === 0 || slots[idx-1].troop !== s.troop;
              const showGear  = idx === 0 || slots[idx-1].gear  !== s.gear;
              const charmNum  = (idx % 3) + 1;

              const curPow   = s.current > 0 ? CHIEF_CHARM_LEVELS[s.current-1].power  : 0;
              const goalPow  = s.goal    > 0 ? CHIEF_CHARM_LEVELS[s.goal-1].power     : 0;
              const curLeth  = s.current > 0 ? CHIEF_CHARM_LEVELS[s.current-1].leth   : 0;
              const goalLeth = s.goal    > 0 ? CHIEF_CHARM_LEVELS[s.goal-1].leth      : 0;
              const curHp    = s.current > 0 ? CHIEF_CHARM_LEVELS[s.current-1].health : 0;
              const goalHp   = s.goal    > 0 ? CHIEF_CHARM_LEVELS[s.goal-1].health    : 0;

              const tdSt = { padding:"4px 8px", fontSize:10,
                fontFamily:"'Space Mono',monospace",
                borderRight:`1px solid ${C.border}`, textAlign:"center" };

              return (
                <React.Fragment key={idx}>
                  <tr style={{ background: Math.floor(idx/3)%2===0 ? "transparent" : C.surface }}>
                    <td style={{ ...tdS, fontWeight:700, color:typeColor(s.troop), width:90 }}>
                      {showTroop ? s.troop : ""}
                    </td>
                    <td style={{ ...tdS, fontWeight:600, color:C.textSec }}>
                      {showGear ? s.gear : ""}
                    </td>
                    <td style={{ ...tdS, color:C.textDim, fontSize:10 }}>#{charmNum}</td>
                    <td style={{ ...tdS, width:180 }}>
                      <CharmLevelPicker
                        value={s.current}
                        onChange={v => setSlotField(idx,"current",v)}
                        sel={sel}
                      />
                    </td>
                    <td style={{ ...tdS, width:180 }}>
                      <CharmLevelPicker
                        value={s.goal}
                        onChange={v => setSlotField(idx,"goal",v)}
                        minVal={s.current}
                        sel={sel}
                      />
                    </td>
                    <td style={tdMono}>{changed ? cost.guides.toLocaleString()  : "—"}</td>
                    <td style={tdMono}>{changed ? cost.designs.toLocaleString() : "—"}</td>
                    <td style={tdMono}>{changed ? cost.secrets.toLocaleString() : "—"}</td>
                    <td style={tdMono}>{curPow   > 0 ? curPow.toLocaleString()       : "—"}</td>
                    <td style={tdMono}>{goalPow  > 0 ? goalPow.toLocaleString()      : "—"}</td>
                    <td style={tdMono}>{goalLeth > 0 ? `${(goalLeth * 100).toFixed(2)}%` : "—"}</td>
                    <td style={tdMono}>{goalHp   > 0 ? `${(goalHp   * 100).toFixed(2)}%` : "—"}</td>
                  </tr>

                  {/* Stat sub-row */}
                  {changed && (() => {
                    const LABELS = ["Power","Lethality","Health"];
                    const curVals  = [curPow,  curLeth,  curHp];
                    const goalVals = [goalPow, goalLeth, goalHp];
                    const chgVals  = curVals.map((v,i) => goalVals[i] - v);
                    const fmtV = (v, i) => i===0 ? v.toLocaleString() : `${(v * 100).toFixed(2)}%`;
                    const chgColor = v => v>0 ? C.green : v<0 ? C.red : C.textDim;
                    const rows = [
                      { label:"Current", color:C.textSec, bg:"transparent",          vals:curVals  },
                      { label:"Goal",    color:C.blue,    bg:"rgba(56,139,253,0.06)", vals:goalVals },
                      { label:"Change",  color:C.green,   bg:"rgba(63,185,80,0.06)",  vals:chgVals, isChange:true },
                    ];
                    return (
                      <tr style={{ background:"rgba(56,139,253,0.04)" }}>
                        <td colSpan={12} style={{ padding:"6px 10px", borderBottom:`1px solid ${C.border}` }}>
                          <div style={{ borderRadius:6, overflow:"hidden", border:`1px solid ${C.border}` }}>
                            <table style={{ borderCollapse:"collapse", width:"100%", fontSize:10 }}>
                              <thead>
                                <tr>
                                  <td style={{ ...tdSt, width:60, color:C.textDim, fontWeight:700, fontSize:9 }}/>
                                  {LABELS.map(l => (
                                    <td key={l} style={{ ...tdSt, color:C.textDim, fontWeight:700, fontSize:9, whiteSpace:"nowrap" }}>{l}</td>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map(row => (
                                  <tr key={row.label} style={{ background:row.bg }}>
                                    <td style={{ ...tdSt, color:row.color, fontWeight:700, fontSize:9 }}>{row.label}</td>
                                    {row.vals.map((v,i) => (
                                      <td key={i} style={{ ...tdSt, color: row.isChange ? chgColor(v) : C.textPri }}>
                                        {row.isChange && v>0 ? "+" : ""}{fmtV(v,i)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Material Summary */}
      <div style={{ marginTop:28 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase",
          color:C.textDim, fontFamily:"'Space Mono',monospace", marginBottom:10,
          paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>
          Materials Required
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", fontSize:11, minWidth:420 }}>
            <thead>
              <tr>
                {["Material","Required","Have","Balance"].map(h => (
                  <th key={h} style={{ padding:"8px 10px", fontSize:10, fontWeight:700,
                    textAlign: h==="Material"?"left":"right",
                    borderBottom:`1px solid ${C.border}`, color:C.textSec,
                    fontFamily:"'Space Mono',monospace", minWidth:100 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label:"Charm Designs", req:totals.designs, have:inv.charmDesigns ?? 0 },
                { label:"Guides",         req:totals.guides,  have:inv.charmGuides  ?? 0 },
                { label:"Secrets",        req:totals.secrets, have:inv.charmSecrets ?? 0 },
              ].map(({ label, req, have }) => {
                const bal = have - req;
                return (
                  <tr key={label}>
                    <td style={{ ...tdS, fontWeight:600 }}>{label}</td>
                    <td style={tdMono}>{req.toLocaleString()}</td>
                    <td style={tdMono}>{have.toLocaleString()}</td>
                    <td style={{ ...tdMono, fontWeight:700, color: bal>=0 ? C.green : C.red }}>
                      {bal>=0 ? "+" : ""}{bal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// ─── Daybreak Island Page ─────────────────────────────────────────────────────

const DAYBREAK_BUFFS = [
  { key:"infantryAtk",     label:"Infantry Attack",            suffix:"%" },
  { key:"infantryDef",     label:"Infantry Defense",           suffix:"%" },
  { key:"lancerAtk",       label:"Lancer Attack",              suffix:"%" },
  { key:"lancerDef",       label:"Lancer Defense",             suffix:"%" },
  { key:"marksmanAtk",     label:"Marksman Attack",            suffix:"%" },
  { key:"marksmanDef",     label:"Marksman Defense",           suffix:"%" },
  { key:"troopsAtk",       label:"Troops' Attack",             suffix:"%" },
  { key:"troopsDef",       label:"Troops' Defense",            suffix:"%" },
  { key:"troopsLethality", label:"Troops' Lethality",          suffix:"%" },
  { key:"troopsHealth",    label:"Troops' Health",             suffix:"%" },
  { key:"huntingMarch",    label:"Hunting March Speed",        suffix:"%" },
  { key:"researchSpeed",   label:"Research Speed",             suffix:"%" },
  { key:"constructionSpd", label:"Construction Speed",         suffix:"%" },
  { key:"healingSpeed",    label:"Healing Speed",              suffix:"%" },
  { key:"trainingSpeed",   label:"Training Speed",             suffix:"%" },
  { key:"resourceGather",  label:"Resource Gathering Speed",   suffix:"%" },
  { key:"meatGather",      label:"Meat Gathering Speed",       suffix:"%" },
  { key:"woodGather",      label:"Wood Gathering Speed",       suffix:"%" },
  { key:"coalGather",      label:"Coal Gathering Speed",       suffix:"%" },
  { key:"ironGather",      label:"Iron Gathering Speed",       suffix:"%" },
  { key:"troopsMarch",     label:"Troops March Speed",         suffix:"%" },
  { key:"deployCap",       label:"Troops Deployment Capacity", suffix:""  },
];

const DAYBREAK_DEFAULTS = Object.fromEntries(DAYBREAK_BUFFS.map(b => [b.key, ""]));

function DaybreakNumberInput({ value, onChange, suffix, isLarge, isInteger }) {
  const inputRef = React.useRef(null);
  const cursorRef = React.useRef(null);

  const handleChange = (e) => {
    const el = e.target;
    const raw = el.value;
    if (isInteger) {
      const digits = raw.replace(/[^\d]/g, "");
      const formatted = digits ? Number(digits).toLocaleString() : "";
      const charsFromEnd = raw.length - el.selectionStart;
      cursorRef.current = Math.max(0, formatted.length - charsFromEnd);
      onChange(formatted);
    } else {
      let clean = raw.replace(/[^\d.]/g, "");
      const parts = clean.split(".");
      if (parts.length > 2) clean = parts[0] + "." + parts.slice(1).join("");
      if (parts.length === 2 && parts[1].length > 1) clean = parts[0] + "." + parts[1].slice(0, 1);
      onChange(clean);
    }
  };

  React.useEffect(() => {
    if (cursorRef.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
      cursorRef.current = null;
    }
  });

  const C = COLORS;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        placeholder="0"
        style={{
          width: isLarge ? 130 : 90,
          textAlign:"right",
          background:C.card,
          border:`1px solid ${C.border}`,
          borderRadius:5,
          color:C.textPri,
          padding:"5px 8px",
          fontSize:12,
          outline:"none",
          fontFamily:"'Space Mono',monospace",
        }}
      />
      {suffix && <span style={{ fontSize:11, color:C.textDim }}>{suffix}</span>}
    </div>
  );
}

function DaybreakIslandPage() {
  const C = COLORS;
  const [buffs, setBuffs] = useLocalStorage("daybreak-buffs", DAYBREAK_DEFAULTS);
  const [prosperityPoints, setProsperityPoints] = useLocalStorage("daybreak-prosperity", "");

  const setField = (key, val) => setBuffs(prev => ({ ...prev, [key]: val }));

  const tdLabel = {
    padding:"10px 14px", fontSize:13, fontWeight:600, color:C.textPri,
    borderBottom:`1px solid ${C.border}`, verticalAlign:"middle",
  };
  const tdVal = {
    padding:"10px 14px", textAlign:"right",
    borderBottom:`1px solid ${C.border}`, verticalAlign:"middle",
  };

  return (
    <div className="fade-in" style={{ maxWidth:580 }}>
      <div style={{
        background:C.card, border:`1px solid ${C.accentDim || C.border}`,
        borderRadius:10, padding:"18px 20px", marginBottom:20,
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:16,
      }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif" }}>
            Prosperity Points
          </div>
          <div style={{ fontSize:11, color:C.textSec, marginTop:3, fontFamily:"'Space Mono',monospace" }}>
            Your island's current prosperity level (0 – 250,000)
          </div>
        </div>
        <DaybreakNumberInput
          value={prosperityPoints}
          onChange={val => setProsperityPoints(val)}
          suffix=""
          isLarge={true}
          isInteger={true}
        />
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden", marginBottom:16 }}>
        <div style={{ padding:"14px 20px 12px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:15, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif" }}>
            Island Buffs
          </div>
          <div style={{ fontSize:11, color:C.textSec, marginTop:3, fontFamily:"'Space Mono',monospace" }}>
            Enter your current Daybreak Island bonus values
          </div>
        </div>
        <table style={{ borderCollapse:"collapse", width:"100%" }}>
          <tbody>
            {DAYBREAK_BUFFS.map((b, i) => (
              <tr key={b.key} style={{ background: i % 2 === 0 ? "transparent" : C.surface }}>
                <td style={tdLabel}>{b.label}</td>
                <td style={tdVal}>
                  <DaybreakNumberInput
                    value={buffs[b.key] ?? ""}
                    onChange={val => setField(b.key, val)}
                    suffix={b.suffix}
                    isLarge={b.key === "deployCap"}
                    isInteger={b.key === "deployCap"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize:10, color:C.textDim, fontFamily:"'Space Mono',monospace",
        textAlign:"center", paddingBottom:8 }}>
        Deployment Capacity bonus is included in the Chief Profile Military calculation
      </div>
    </div>
  );
}

// ─── Character Profile Page ───────────────────────────────────────────────────

// Embassy Reinforcement Cap by level (F30 = index 0, FC1-FC10 = index 1-10)
const EMBASSY_REINFORCE = {
  "F30":840000, "FC1":865000, "FC2":890000, "FC3":915000, "FC4":940000,
  "FC5":965000, "FC6":990000, "FC7":1015000, "FC8":1040000, "FC9":1065000, "FC10":1090000,
};

// Command Center Rally + Deployment Cap by level
const COMMAND_CENTER_STATS = {
  "F30": { rally:840000, deploy:67000  },
  "FC1": { rally:865000, deploy:70500  },
  "FC2": { rally:890000, deploy:74000  },
  "FC3": { rally:915000, deploy:77500  },
  "FC4": { rally:940000, deploy:81000  },
  "FC5": { rally:965000, deploy:84500  },
  "FC6": { rally:990000, deploy:88000  },
  "FC7": { rally:1015000, deploy:91500 },
  "FC8": { rally:1040000, deploy:95000 },
  "FC9": { rally:1065000, deploy:98500 },
  "FC10":{ rally:1090000, deploy:102000},
};

// Fixed power from non-FC buildings (all at max level, never changes)
const NON_FC_BUILDING_POWER = 817958;

// VIP badge colors per level group
const VIP_BADGE_COLOR = (lv) => {
  if (lv === 0)            return { bg:"#4a4a4a", text:"#aaa",    border:"#666" };
  if (lv <= 3)             return { bg:"#1a3a1a", text:"#4caf50", border:"#388e3c" };
  if (lv <= 6)             return { bg:"#1a2a4a", text:"#64b5f6", border:"#1976d2" };
  if (lv <= 9)             return { bg:"#3a1a3a", text:"#ce93d8", border:"#9c27b0" };
  return                          { bg:"#3a2a0a", text:"#ffb74d", border:"#f57c00" };
};

// Read building current level string from cp-buildings, normalized to lookup key
function getBuildingLevel(buildingName) {
  try {
    const raw = localStorage.getItem("cp-buildings");
    if (!raw) return null;
    const buildings = JSON.parse(raw);
    const b = buildings.find(b => b.name === buildingName);
    if (!b?.current) return null;
    // Normalize: "FC8" stays "FC8", "FC8.1" → "FC8", "30.1" / "30.x" → "F30"
    const cur = b.current;
    if (/^\d+\.\d+$/.test(cur)) return "F30"; // e.g. "30.1"
    const fcMatch = cur.match(/^FC(\d+)(?:\.\d+)?$/);
    if (fcMatch) return `FC${fcMatch[1]}`;
    return null;
  } catch { return null; }
}

function CharacterProfilePage({ hgHeroes, inv, rcLevels, profileVersion, cpSpeedBuff: cpSpeedBuffProp, setCpSpeedBuff: setCpSpeedBuffProp }) {
  const C = COLORS;

  // VIP level
  const [vipLevel, setVipLevel] = useLocalStorage("cp-vip-level", 0);

  // Embassy Reinforcement Cap
  const reinforceCap = React.useMemo(() => {
    const embLvl = getBuildingLevel("Embassy");
    return EMBASSY_REINFORCE[embLvl] ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // ── All power sources ──────────────────────────────────────────────────────

  // Hero Gear power — reactive via hgHeroes prop
  const heroGearPower = React.useMemo(() => {
    if (!hgHeroes) return 0;
    let total = 0;
    const gearSlotNames = ["Goggles","Gloves","Belt","Boots"];
    hgHeroes.forEach(hd => {
      if (!hd?.hero) return;
      const troopType = HERO_ROSTER.find(h => h.name === hd.hero)?.type;
      if (!troopType) return;
      gearSlotNames.forEach(slot => {
        const slotIdx = GEAR_SLOTS.indexOf(slot);
        const s = hd.slots?.[slotIdx];
        if (!s) return;
        const gearName = SLOT_TO_GEAR(troopType, slot);
        if (!gearName) return;
        const gs = getGearStats(gearName, s.status || "Legendary", s.gearCurrent ?? 0, s.masteryCurrent ?? 0);
        total += gs?.power ?? 0;
      });
    });
    return Math.round(total);
  }, [hgHeroes]);

  // Hero Power — from Supabase accepted stats
  const [heroPower, setHeroPower] = React.useState(0);
  React.useEffect(() => {
    supabase.from("hero_stats_data")
      .select("stats")
      .eq("is_current", true)
      .then(({ data }) => {
        if (!data) return;
        let total = 0;
        data.forEach(row => {
          const s = row.stats || {};
          total += (s.levelPower || 0) + (s.starPower || 0) + (s.skillPower || 0) + (s.gearStrength || 0);
        });
        setHeroPower(Math.round(total));
      });
  }, []);

  // Chief Gear power — reads from localStorage, refreshes on profileVersion
  const chiefGearPower = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("cg-slots");
      if (!raw) return 0;
      return JSON.parse(raw).reduce((sum, s) => sum + (CHIEF_GEAR_LEVELS[s.current ?? 0]?.[6] ?? 0), 0);
    } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // Chief Charms power — reads from localStorage, refreshes on profileVersion
  const chiefCharmsPower = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("cc-slots");
      if (!raw) return 0;
      return JSON.parse(raw).reduce((sum, s) => {
        const cur = s.current ?? 0;
        return cur === 0 ? sum : sum + (CHIEF_CHARM_LEVELS[cur - 1]?.power ?? 0);
      }, 0);
    } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // Tech power — WA from localStorage + RC from rcLevels prop, refreshes on profileVersion
  const techPower = React.useMemo(() => {
    let total = 0;
    try {
      const raw = localStorage.getItem("wa-levels");
      if (raw) {
        const levels = JSON.parse(raw);
        ["Infantry","Lancer","Marksman"].forEach(troop => {
          WA_RESEARCH.forEach(res => {
            total += waPower(res, levels[troop]?.[res.id]?.cur ?? 0);
          });
        });
      }
    } catch {}
    total += getRCTechPower(rcLevels);
    return Math.round(total);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion, rcLevels]);

  // Deployment + Rally capacity — WA research + Chief Gear + Command Center + RC research
  const { deployCapacity, rallyCapacityTotal } = React.useMemo(() => {
    let deployWA = 0, rallyWA = 0;
    try {
      const raw = localStorage.getItem("wa-levels");
      if (raw) {
        const levels = JSON.parse(raw);
        const fsRes = WA_RESEARCH.find(r => r.id === "flameSquad");
        const htRes = WA_RESEARCH.find(r => r.id === "heliosTraining");
        const flRes = WA_RESEARCH.find(r => r.id === "flameLegion");
        ["Infantry","Lancer","Marksman"].forEach(troop => {
          deployWA += fsRes?.levels[levels[troop]?.flameSquad?.cur ?? 0]?.[2] ?? 0;
          deployWA += htRes?.levels[levels[troop]?.heliosTraining?.cur ?? 0]?.[2] ?? 0;
          rallyWA  += flRes?.levels[levels[troop]?.flameLegion?.cur ?? 0]?.[2] ?? 0;
        });
      }
    } catch {}
    let deployGear = 0;
    try {
      const raw = localStorage.getItem("cg-slots");
      if (raw) JSON.parse(raw).forEach(s => { deployGear += CHIEF_GEAR_LEVELS[s.current ?? 0]?.[9] ?? 0; });
    } catch {}
    const cmdBase = COMMAND_CENTER_STATS[getBuildingLevel("Command")] ?? null;
    // Research Center contributions
    const rcContrib = getRCDeployRally(rcLevels);
    // Romulus expert contributions — Bonus (Commander's Crest) for deploy, Skill 4 (One Heart) for rally
    let romulusExpertDeploy = 0, romulusExpertRally = 0;
    try {
      const ed = localStorage.getItem("experts-data");
      if (ed) {
        const parsed = JSON.parse(ed);
        const rom = parsed["Romulus"] || {};
        const romB   = Number(rom.affinity  ?? 0);
        const romSk4 = Number(rom.sk4Level  ?? 0);
        const ROMULUS_B_DEPLOY  = [0,300,600,1000,1500,200,3000,4000,5500,7000,8500,10000];
        const ROMULUS_SK4_RALLY = [0,5000,10000,15000,20000,25000,30000,35000,40000,45000,50000,55000,60000,65000,70000,75000,80000,85000,90000,95000,100000];
        romulusExpertDeploy = ROMULUS_B_DEPLOY[romB]   ?? 0;
        romulusExpertRally  = ROMULUS_SK4_RALLY[romSk4] ?? 0;
      }
    } catch {}
    let daybreakDeploy = 0;
    try {
      const dbRaw = localStorage.getItem("daybreak-buffs");
      if (dbRaw) daybreakDeploy = Number(String(JSON.parse(dbRaw).deployCap ?? "").replace(/,/g, "")) || 0;
    } catch {}
    return {
      deployCapacity:     Math.round(deployWA + deployGear + (cmdBase?.deploy ?? 0) + rcContrib.deploy + romulusExpertDeploy + daybreakDeploy),
      rallyCapacityTotal: Math.round(rallyWA + (cmdBase?.rally ?? 0) + rcContrib.rally + romulusExpertRally),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion, rcLevels]);

  // Construction Speed — reactive via prop from App.jsx (cloud-synced)
  const constructionSpeed = cpSpeedBuffProp !== undefined ? Number(cpSpeedBuffProp) : 0;

  // Research Speed — reads from localStorage, refreshes on profileVersion
  const researchSpeed = React.useMemo(() => {
    try { return Number(localStorage.getItem("wa-speedbuff") || 0); } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // Troops power — reads from localStorage, refreshes on profileVersion
  const troopsPower = React.useMemo(() => {
    try {
      const troopsRaw = localStorage.getItem("troops-inventory-v2");
      const bldgsRaw  = localStorage.getItem("cp-buildings");
      if (!troopsRaw) return 0;
      const troops = JSON.parse(troopsRaw);
      const bldgs  = bldgsRaw ? JSON.parse(bldgsRaw) : [];
      const getFCNum = name => {
        const b = bldgs.find(b => b.name === name);
        if (!b?.current) return 0;
        const m = b.current.match(/FC(\d+)/i);
        return m ? parseInt(m[1]) : 0;
      };
      const buildingMap = { infantry:"Infantry", lancer:"Lancer", marksman:"Marksman" };
      const POWER_ONLY = {
        infantry: { 0:[[1,3],[2,4],[3,6],[4,9],[5,13],[6,20],[7,28],[8,38],[9,50],[10,66],[11,80]], 1:[[1,3],[2,4],[3,6],[4,10],[5,14],[6,21],[7,30],[8,41],[9,54],[10,71],[11,86]], 2:[[1,3],[2,4],[3,6],[4,10],[5,15],[6,22],[7,32],[8,44],[9,58],[10,76],[11,92]], 3:[[1,3],[2,4],[3,6],[4,11],[5,16],[6,24],[7,34],[8,47],[9,62],[10,83],[11,100]], 4:[[1,3],[2,4],[3,8],[4,12],[5,17],[6,26],[7,37],[8,51],[9,67],[10,88],[11,106]], 5:[[1,4],[2,5],[3,9],[4,13],[5,18],[6,28],[7,40],[8,54],[9,72],[10,94],[11,114]], 6:[[1,4],[2,5],[3,9],[4,14],[5,19],[6,30],[7,43],[8,57],[9,77],[10,99],[11,120]], 7:[[1,4],[2,5],[3,10],[4,15],[5,20],[6,32],[7,46],[8,60],[9,82],[10,104],[11,126]], 8:[[1,5],[2,6],[3,11],[4,16],[5,21],[6,34],[7,49],[8,63],[9,87],[10,110],[11,135]], 9:[[1,5],[2,6],[3,11],[4,16],[5,22],[6,35],[7,51],[8,66],[9,91],[10,115],[11,141]], 10:[[1,5],[2,6],[3,12],[4,17],[5,23],[6,37],[7,54],[8,69],[9,95],[10,121],[11,148]] },
        lancer:   { 0:[[1,3],[2,4],[3,6],[4,9],[5,13],[6,20],[7,28],[8,38],[9,50],[10,66],[11,80]], 1:[[1,3],[2,4],[3,6],[4,10],[5,14],[6,21],[7,30],[8,41],[9,54],[10,71],[11,86]], 2:[[1,3],[2,5],[3,6],[4,10],[5,15],[6,22],[7,32],[8,44],[9,58],[10,76],[11,92]], 3:[[1,3],[2,4],[3,6],[4,11],[5,16],[6,24],[7,34],[8,47],[9,62],[10,83],[11,100]], 4:[[1,3],[2,4],[3,8],[4,12],[5,17],[6,26],[7,37],[8,51],[9,67],[10,88],[11,106]], 5:[[1,3],[2,4],[3,8],[4,12],[5,17],[6,26],[7,37],[8,54],[9,72],[10,94],[11,114]], 6:[[1,4],[2,5],[3,9],[4,14],[5,19],[6,30],[7,43],[8,57],[9,77],[10,99],[11,120]], 7:[[1,4],[2,5],[3,10],[4,15],[5,20],[6,32],[7,46],[8,60],[9,82],[10,104],[11,126]], 8:[[1,5],[2,6],[3,11],[4,16],[5,21],[6,34],[7,49],[8,63],[9,87],[10,110],[11,135]], 9:[[1,5],[2,6],[3,11],[4,16],[5,22],[6,35],[7,51],[8,66],[9,91],[10,115],[11,141]], 10:[[1,5],[2,6],[3,12],[4,17],[5,23],[6,37],[7,54],[8,69],[9,95],[10,121],[11,148]] },
        marksman: { 0:[[1,3],[2,4],[3,6],[4,9],[5,13],[6,20],[7,28],[8,38],[9,50],[10,66],[11,80]], 1:[[1,3],[2,4],[3,6],[4,10],[5,14],[6,21],[7,30],[8,41],[9,54],[10,71],[11,86]], 2:[[1,3],[2,4],[3,6],[4,10],[5,15],[6,22],[7,32],[8,44],[9,58],[10,76],[11,92]], 3:[[1,3],[2,4],[3,6],[4,11],[5,16],[6,24],[7,34],[8,47],[9,62],[10,83],[11,100]], 4:[[1,3],[2,4],[3,8],[4,12],[5,17],[6,26],[7,37],[8,51],[9,67],[10,88],[11,106]], 5:[[1,4],[2,5],[3,9],[4,13],[5,18],[6,28],[7,40],[8,54],[9,72],[10,94],[11,114]], 6:[[1,4],[2,5],[3,9],[4,14],[5,19],[6,30],[7,43],[8,57],[9,77],[10,99],[11,120]], 7:[[1,4],[2,5],[3,10],[4,15],[5,20],[6,32],[7,46],[8,60],[9,82],[10,104],[11,126]], 8:[[1,5],[2,6],[3,11],[4,16],[5,21],[6,34],[7,49],[8,63],[9,87],[10,110],[11,135]], 9:[[1,5],[2,6],[3,11],[4,16],[5,22],[6,35],[7,51],[8,66],[9,91],[10,115],[11,141]], 10:[[1,5],[2,6],[3,12],[4,17],[5,23],[6,37],[7,54],[8,69],[9,95],[10,121],[11,148]] },
      };
      const getPower = (type, tierNum, fc) => {
        const rows = POWER_ONLY[type]?.[Math.min(Math.max(fc,0),10)];
        const r = rows?.find(r => r[0] === tierNum);
        return r ? r[1] : 0;
      };
      let total = 0;
      ["infantry","lancer","marksman"].forEach(id => {
        const fc = getFCNum(buildingMap[id]);
        (troops[id] || []).forEach(row => {
          total += (Number(row.count)||0) * getPower(id, parseInt((row.tier||"T0").replace("T","")), fc);
        });
      });
      return Math.round(total);
    } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // Building power — reads from localStorage, refreshes on profileVersion
  const NON_FC_FIXED = 817958;
  const buildingPower = React.useMemo(() => {
    let fcTotal = 0;
    try {
      const raw = localStorage.getItem("cp-buildings");
      if (raw) {
        JSON.parse(raw).forEach(b => {
          if (BUILDINGS_LIST.includes(b.name) && b.current) {
            fcTotal += getBuildingPower(b.name, b.current, b.currentSub || 0);
          }
        });
      }
    } catch {}
    return fcTotal + NON_FC_FIXED;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // Expert Power — reads experts-data from localStorage, refreshes on profileVersion
  const expertPower = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("experts-data");
      if (!raw) return 0;
      const ed = JSON.parse(raw);
      let total = 0;
      const EXPERTS_LIST = ["Cyrille","Agnes","Romulus","Holger","Fabian","Baldur","Valeria","Ronne","Kathy"];
      EXPERTS_LIST.forEach(name => {
        const d = ed[name] || {};
        const lv  = Number(d.level    ?? 0);
        const aff = Number(d.affinity ?? 0);
        // Level Power
        const lpCfg = EXPERT_LEVEL_POWER[name];
        if (lpCfg && lv > 0) total += Math.round(lpCfg.rate * (lv + lpCfg.offset));
        // Affinity Power
        const affRate = EXPERT_AFFINITY_POWER_RATE[name];
        if (affRate) total += affRate * aff;
        // Talent Power (= affinity level in-game)
        const talRate = EXPERT_TALENT_POWER_RATE[name];
        if (talRate) total += talRate * aff;
        // Skill Power
        const skPwr = EXPERT_SKILL_POWER[name];
        if (skPwr) {
          ["sk1","sk2","sk3","sk4"].forEach(sk => {
            total += (skPwr[sk] ?? 0) * Number(d[`${sk}Level`] ?? 0);
          });
        }
        // Research Power — only available at L100, B11, all skills maxed
        // Cannot calculate without knowing the research power values per expert
        // (Cyrille showed 8,000 at research lv 7; formula TBD)
      });
      return Math.round(total);
    } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // Grand total
  const totalPower = techPower + chiefGearPower + chiefCharmsPower + heroPower + heroGearPower + troopsPower + buildingPower + expertPower;

  // ── Styles ─────────────────────────────────────────────────────────────────
  const sectionHead = (label, sub) => (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:16, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif",
        letterSpacing:"0.3px" }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.textSec, marginTop:3 }}>{sub}</div>}
    </div>
  );

  const fmt = n => Math.round(n).toLocaleString();

  // Buffered number input — holds local string state, commits to parent only on blur
  const BufferedInput = ({ value, onCommit, suffix, width=110 }) => {
    const fmt = v => Number(v) > 0 ? Number(v).toLocaleString() : String(v ?? "");
    const [local, setLocal] = React.useState(fmt(value));
    React.useEffect(() => { setLocal(fmt(value)); }, [value]);
    return (
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <input type="text" inputMode="numeric"
          value={local}
          onChange={e => setLocal(e.target.value)}
          onFocus={e => setLocal(String(Number(String(local).replace(/,/g,"")) || ""))}
          onBlur={e => {
            const v = Number(String(e.target.value).replace(/,/g,"")) || 0;
            setLocal(fmt(v));
            onCommit(v);
          }}
          style={{ width, textAlign:"right", background:C.card,
            border:`1px solid ${C.border}`, borderRadius:5,
            color:C.textPri, padding:"4px 8px", fontSize:12, outline:"none",
            fontFamily:"'Space Mono',monospace" }} />
        {suffix && <span style={{ fontSize:11, color:C.textDim }}>{suffix}</span>}
      </div>
    );
  };

  const Row = ({ label, value, source, isEntry, onEntry, entryVal, accent, dim, suffix="" }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"11px 0", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ flex:1, paddingRight:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color: dim ? C.textSec : C.textPri }}>{label}</div>
        {source && <div style={{ fontSize:11, color:C.textSec, fontFamily:"'Space Mono',monospace",
          marginTop:2, lineHeight:1.4 }}>{source}</div>}
      </div>
      {isEntry ? (
        <BufferedInput value={entryVal} onCommit={onEntry} suffix={suffix} />
      ) : (
        <div style={{ fontSize:13, fontFamily:"'Space Mono',monospace", fontWeight:700,
          color: accent ? C.accent : dim ? C.textSec : C.textPri, whiteSpace:"nowrap" }}>
          {value}{suffix}
        </div>
      )}
    </div>
  );

  const SectionCard = ({ children, style }) => (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10,
      padding:"20px 20px", marginBottom:16, ...style }}>
      {children}
    </div>
  );

  // Total power header card
  const TotalCard = () => {
    const badge = VIP_BADGE_COLOR(vipLevel);
    return (
    <div style={{ background:C.accentBg, border:`1px solid ${C.accentDim}`,
      borderRadius:10, padding:"20px 24px", marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"flex-start",
        justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"2px", textTransform:"uppercase",
            color:C.accent, fontFamily:"'Space Mono',monospace", marginBottom:4 }}>Total Power</div>
          <div style={{ fontSize:32, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif",
            letterSpacing:"-0.5px" }}>{fmt(totalPower)}</div>
          <div style={{ fontSize:11, color:C.textSec, marginTop:4 }}>
            Sum of all tracked power sources
          </div>
        </div>

        {/* VIP Badge */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
          <div style={{
            width:72, height:72, borderRadius:10,
            background:badge.bg, border:`2px solid ${badge.border}`,
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            boxShadow:`0 0 12px ${badge.border}40`,
            cursor:"default", userSelect:"none",
          }}>
            <div style={{ fontSize:9, fontWeight:700, color:badge.text,
              fontFamily:"'Space Mono',monospace", letterSpacing:"2px",
              textTransform:"uppercase", marginBottom:2 }}>VIP</div>
            <div style={{ fontSize:28, fontWeight:900, color:badge.text,
              fontFamily:"Syne,sans-serif", lineHeight:1 }}>
              {vipLevel}
            </div>
          </div>
          <select value={vipLevel}
            onChange={e => setVipLevel(Number(e.target.value))}
            style={{ background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:5, color:C.textSec, fontSize:11, padding:"3px 6px",
              outline:"none", cursor:"pointer", fontFamily:"'Space Mono',monospace",
              width:72 }}>
            {Array.from({length:13},(_,i)=>i).map(lv => (
              <option key={lv} value={lv}>VIP {lv}</option>
            ))}
          </select>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 24px", fontSize:11,
          fontFamily:"'Space Mono',monospace" }}>
          {[
            ["Tech",         techPower],
            ["Chief Gear",   chiefGearPower],
            ["Chief Charms", chiefCharmsPower],
            ["Hero",         heroPower + heroGearPower],
            ["Troops",       troopsPower],
            ["Buildings",    buildingPower],
            ["Experts",      expertPower],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ display:"flex", justifyContent:"space-between", gap:16 }}>
              <span style={{ color:C.textDim }}>{lbl}</span>
              <span style={{ color:C.textSec }}>{fmt(val)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="fade-in" style={{ maxWidth:680, padding:"0 0 40px" }}>

      <TotalCard />

      {/* ── Power Breakdown ─────────────────────────────────────────────── */}
      <SectionCard>
        {sectionHead("Power Breakdown", "Current levels across all tracked categories")}

        <Row label="Tech Power" value={fmt(techPower)}
          source="War Academy (current levels) · Research Center (current levels)" />

        <Row label="Chief Gear Power" value={fmt(chiefGearPower)}
          source="Chief Gear tab · current levels" />

        <Row label="Chief Charms Power" value={fmt(chiefCharmsPower)}
          source="Chief Charms tab · current levels (18 charms)" />

        <Row label="Hero Power" value={fmt(heroPower)}
          source="Heroes tab · level + star + skill + gear strength (submitted stats)" />

        <Row label="Hero Gear Power" value={fmt(heroGearPower)}
          source="Hero Gear Calculator · 4 gear slots × 3 hero slots" />

        <Row label="Pet Power" value="—"
          source="Coming soon" dim />

        <Row label="Expert Power"
          value={expertPower > 0 ? fmt(expertPower) : "—"}
          source="Sum of all expert Level, Affinity, Talent & Skill power (Experts tab) — Research power added manually when unlocked at L100/B11/max skills"
          dim={expertPower === 0} />

        <Row label="Troops Power"
          value={fmt(troopsPower)}
          source="Calculated from Troops tab · count × power per troop at Training Camp FC level" />

        <Row label="Buildings Power"
          value={fmt(buildingPower)}
          source="FC buildings at current level (Construction tab) + fixed non-FC buildings at max level (Hunter's Hut, Sawmill, Coal Mine, Iron Mine, Cookhouse, Clinic, Shelter ×8, Research Center, Storehouse)" />
      </SectionCard>

      {/* ── Military ────────────────────────────────────────────────────── */}
      <SectionCard>
        {sectionHead("Military", "March, deployment and training stats")}

        <Row label="March Queue" value="—"
          source="Research Center (coming soon)" dim />

        <Row label="Deployment Capacity"
          value={deployCapacity > 0 ? fmt(deployCapacity) : "—"}
          source="Command Center base + War Academy (Flame Squad + Helios Training) × 3 troops + Chief Gear + Research Center + Romulus Commander's Crest (Expedition Army, Experts) + Daybreak Island" />

        <Row label="Rally Capacity"
          value={rallyCapacityTotal > 0 ? fmt(rallyCapacityTotal) : "—"}
          source="Command Center base + War Academy Flame Legion × 3 troops + Research Center + Romulus Skill 4 (Experts)"
          dim={rallyCapacityTotal === 0} />

        <Row label="Reinforcement Cap"
          value={reinforceCap != null ? fmt(reinforceCap) : "—"}
          source="Embassy · set building level in Construction tab"
          dim={reinforceCap == null} />

        <Row label="Training Speed" value="—"
          source="Research Center (coming soon)" dim />
      </SectionCard>

      {/* ── Growth ──────────────────────────────────────────────────────── */}
      <SectionCard>
        {sectionHead("Growth", "Construction and research speed — synced with Construction and War Academy tabs")}

        <Row label="Construction Speed"
          isEntry
          entryVal={constructionSpeed}
          onEntry={v => setCpSpeedBuffProp?.(v)}
          source="Synced with Construction tab · Bonus Overview > Growth"
          suffix="%" />

        <Row label="Research Speed"
          isEntry
          entryVal={researchSpeed}
          onEntry={v => {
            try {
              localStorage.setItem("wa-speedbuff", JSON.stringify(v));
              localStorage.setItem("wa-speedbuff__ts", new Date().toISOString());
              scheduleSync("wa-speedbuff", v);
            } catch {}
          }}
          source="Synced with War Academy tab · Bonus Overview > Growth"
          suffix="%" />
      </SectionCard>

    </div>
  );
}

// ─── Troops Page ──────────────────────────────────────────────────────────────

// Standalone formatted count input — must be outside TroopsPage to avoid remount on every render
function TroopCountInput({ value, onChange, color, selStyle }) {
  const [focused, setFocused] = React.useState(false);
  const [local, setLocal] = React.useState(value > 0 ? Number(value).toLocaleString() : "");

  React.useEffect(() => {
    if (!focused) {
      setLocal(value > 0 ? Number(value).toLocaleString() : "");
    }
  }, [value, focused]);

  return (
    <input
      type={focused ? "number" : "text"}
      inputMode="numeric"
      min={0} step={1}
      value={focused ? (value || "") : local}
      placeholder="0"
      onFocus={() => { setFocused(true); }}
      onBlur={e => {
        setFocused(false);
        const v = Math.max(0, parseInt(e.target.value.replace(/,/g, "")) || 0);
        onChange(v);
      }}
      onChange={e => {
        if (focused) onChange(Number(e.target.value) || 0);
      }}
      style={{ ...selStyle, textAlign:"right", fontWeight:700,
        fontFamily:"'Space Mono',monospace", color }}
    />
  );
}
const TROOP_TIERS = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11"];

const TROOP_TYPES = [
  { id:"infantry",  label:"Infantry",  color:"green",  building:"Infantry"  },
  { id:"lancer",    label:"Lancer",    color:"blue",   building:"Lancer"    },
  { id:"marksman",  label:"Marksman",  color:"amber",  building:"Marksman"  },
];

// Troop stats lookup: TROOP_STATS[type][fcLevel][tierIdx] = [tier,power,atk,def,leth,hp,load,name]
// Row format: [troopLevel, power, attack, defense, lethality, health, load, name]
const TROOP_STATS = {
  infantry: {
    0:[[1,3,1,4,1,6,108,"Rookie"],[2,4,2,5,2,7,124,"Trained"],[3,6,3,6,3,8,142,"Senior"],[4,9,4,7,4,9,164,"Vetern"],[5,13,5,8,5,10,188,"Hardy"],[6,20,6,9,6,11,217,"Heroic"],[7,28,7,10,7,12,249,"Brave"],[8,38,8,11,8,13,287,"Elite"],[9,50,9,12,9,14,330,"Supreme"],[10,66,10,13,10,15,379,"Apex"],[11,80,12,15,12,17,400,"Helios"]],
    1:[[1,3,1,4,1,6,108,"Rookie"],[2,4,2,5,2,7,124,"Trained"],[3,6,3,6,3,9,142,"Senior"],[4,10,4,8,4,10,164,"Vetern"],[5,14,6,9,5,11,188,"Hardy"],[6,21,7,10,6,12,217,"Heroic"],[7,30,8,11,7,13,249,"Brave"],[8,41,9,12,8,14,287,"Elite"],[9,54,10,13,9,15,330,"Supreme"],[10,71,11,14,10,16,379,"Apex"],[11,86,13,16,12,18,400,"Helios"]],
    2:[[1,3,1,5,1,7,108,"Rookie"],[2,4,2,6,2,7,124,"Trained"],[3,6,3,7,3,10,142,"Senior"],[4,10,4,9,4,11,164,"Vetern"],[5,15,7,10,6,12,188,"Hardy"],[6,22,8,11,7,13,217,"Heroic"],[7,32,9,13,8,14,249,"Brave"],[8,44,10,14,9,15,287,"Elite"],[9,58,11,15,10,16,330,"Supreme"],[10,76,12,16,11,17,379,"Apex"],[11,92,14,17,13,19,400,"Helios"]],
    3:[[1,3,1,5,1,6,108,"Rookie"],[2,4,2,6,2,7,124,"Trained"],[3,6,3,7,3,11,142,"Senior"],[4,11,4,10,4,12,164,"Vetern"],[5,16,8,11,7,13,188,"Hardy"],[6,24,9,12,8,14,217,"Heroic"],[7,34,10,14,9,15,249,"Brave"],[8,47,11,15,10,16,287,"Elite"],[9,62,12,16,11,17,330,"Supreme"],[10,83,13,17,12,18,379,"Apex"],[11,100,15,18,14,20,400,"Helios"]],
    4:[[1,3,1,5,1,6,108,"Rookie"],[2,4,2,6,2,7,124,"Trained"],[3,8,3,7,3,12,142,"Senior"],[4,12,4,11,4,13,164,"Vetern"],[5,17,8,12,8,14,188,"Hardy"],[6,26,9,13,9,15,217,"Heroic"],[7,37,10,15,10,16,249,"Brave"],[8,51,11,16,11,17,287,"Elite"],[9,67,12,17,12,18,330,"Supreme"],[10,88,13,18,13,19,379,"Apex"],[11,106,15,19,15,21,400,"Helios"]],
    5:[[1,4,1,6,1,6,108,"Rookie"],[2,5,2,7,2,7,124,"Trained"],[3,9,3,8,3,13,142,"Senior"],[4,13,4,12,4,14,164,"Vetern"],[5,18,9,13,8,15,188,"Hardy"],[6,28,10,14,9,16,217,"Heroic"],[7,40,11,17,10,17,249,"Brave"],[8,54,12,18,11,18,287,"Elite"],[9,72,13,19,12,19,330,"Supreme"],[10,94,14,20,13,20,379,"Apex"],[11,114,16,22,15,22,400,"Helios"]],
    6:[[1,4,1,6,1,6,108,"Rookie"],[2,5,2,7,2,7,124,"Trained"],[3,9,3,8,3,14,142,"Senior"],[4,14,4,13,4,15,164,"Vetern"],[5,19,9,14,8,16,188,"Hardy"],[6,30,10,15,9,17,217,"Heroic"],[7,43,11,18,10,18,249,"Brave"],[8,57,12,19,11,19,287,"Elite"],[9,77,13,20,12,20,330,"Supreme"],[10,99,14,21,13,21,379,"Apex"],[11,120,17,23,16,23,400,"Helios"]],
    7:[[1,4,1,7,1,6,108,"Rookie"],[2,5,2,7,2,7,124,"Trained"],[3,10,3,9,3,15,142,"Senior"],[4,15,4,14,4,16,164,"Vetern"],[5,20,10,15,9,17,188,"Hardy"],[6,32,11,16,10,18,217,"Heroic"],[7,46,12,19,11,19,249,"Brave"],[8,60,13,20,12,20,287,"Elite"],[9,82,14,21,13,21,330,"Supreme"],[10,104,15,22,14,22,379,"Apex"],[11,126,17,24,16,24,400,"Helios"]],
    8:[[1,5,1,7,1,6,108,"Rookie"],[2,6,2,8,2,7,124,"Trained"],[3,11,3,9,3,16,142,"Senior"],[4,16,4,15,4,17,164,"Vetern"],[5,21,10,16,9,18,188,"Hardy"],[6,34,11,17,10,19,217,"Heroic"],[7,49,12,20,11,20,249,"Brave"],[8,63,13,21,12,21,287,"Elite"],[9,87,14,22,13,22,330,"Supreme"],[10,110,15,23,15,23,379,"Apex"],[11,135,18,25,17,25,400,"Helios"]],
    9:[[1,5,1,7,1,6,108,"Rookie"],[2,6,2,8,2,7,124,"Trained"],[3,11,3,9,3,16,142,"Senior"],[4,16,4,15,4,17,164,"Vetern"],[5,22,11,16,10,18,188,"Hardy"],[6,35,12,17,11,19,217,"Heroic"],[7,51,13,22,12,21,249,"Brave"],[8,66,14,23,13,22,287,"Elite"],[9,91,15,24,14,23,330,"Supreme"],[10,115,16,25,15,24,379,"Apex"],[11,141,18,27,17,26,400,"Helios"]],
    10:[[1,5,1,7,1,6,108,"Rookie"],[2,6,2,8,2,7,124,"Trained"],[3,12,3,10,3,17,142,"Senior"],[4,17,4,16,4,19,164,"Vetern"],[5,23,12,17,11,20,188,"Hardy"],[6,37,13,19,12,21,217,"Heroic"],[7,54,14,23,13,22,249,"Brave"],[8,69,15,24,14,23,287,"Elite"],[9,95,16,25,15,24,330,"Supreme"],[10,121,18,26,16,25,379,"Apex"],[11,148,19,28,18,27,400,"Helios"]],
  },
  lancer: {
    0:[[1,3,4,2,5,2,108,"Rookie"],[2,4,5,3,6,3,124,"Trained"],[3,6,6,4,7,4,142,"Senior"],[4,9,7,5,8,5,164,"Vetern"],[5,13,8,6,9,6,188,"Hardy"],[6,20,9,7,10,7,217,"Heroic"],[7,28,10,8,11,8,249,"Brave"],[8,38,11,9,12,9,287,"Elite"],[9,50,12,10,13,10,330,"Supreme"],[10,66,13,11,14,11,379,"Apex"],[11,80,15,13,16,13,400,"Helios"]],
    1:[[1,3,4,2,5,2,108,"Rookie"],[2,4,5,3,6,3,124,"Trained"],[3,6,6,4,8,4,142,"Senior"],[4,10,8,5,9,5,164,"Vetern"],[5,14,9,7,10,6,188,"Hardy"],[6,21,10,8,11,7,217,"Heroic"],[7,30,11,9,12,8,249,"Brave"],[8,41,12,10,13,9,287,"Elite"],[9,54,13,11,14,10,330,"Supreme"],[10,71,14,12,15,11,379,"Apex"],[11,86,16,14,17,13,400,"Helios"]],
    2:[[1,3,5,2,5,2,108,"Rookie"],[2,5,6,3,6,3,124,"Trained"],[3,6,7,4,9,4,142,"Senior"],[4,10,9,5,10,5,164,"Vetern"],[5,15,10,8,11,7,188,"Hardy"],[6,22,11,9,12,8,217,"Heroic"],[7,32,13,10,13,9,249,"Brave"],[8,44,14,11,14,10,287,"Elite"],[9,58,15,12,15,11,330,"Supreme"],[10,76,16,13,16,12,379,"Apex"],[11,92,18,15,18,14,400,"Helios"]],
    3:[[1,3,5,2,5,2,108,"Rookie"],[2,4,6,3,6,3,124,"Trained"],[3,6,7,4,10,4,142,"Senior"],[4,11,10,5,11,5,164,"Vetern"],[5,16,11,9,12,8,188,"Hardy"],[6,24,12,10,13,9,217,"Heroic"],[7,34,14,11,14,10,249,"Brave"],[8,47,15,12,15,11,287,"Elite"],[9,62,16,13,16,12,330,"Supreme"],[10,83,17,14,17,13,379,"Apex"],[11,100,19,16,19,15,400,"Helios"]],
    4:[[1,3,5,2,5,2,108,"Rookie"],[2,4,6,3,6,3,124,"Trained"],[3,8,7,4,11,4,142,"Senior"],[4,12,11,5,12,5,164,"Vetern"],[5,17,12,9,13,8,188,"Hardy"],[6,26,13,10,14,9,217,"Heroic"],[7,37,15,11,15,10,249,"Brave"],[8,51,16,12,16,11,287,"Elite"],[9,67,17,13,17,12,330,"Supreme"],[10,88,18,14,18,13,379,"Apex"],[11,106,20,16,20,15,400,"Helios"]],
    5:[[1,3,5,2,5,2,108,"Rookie"],[2,4,6,3,6,3,124,"Trained"],[3,8,7,4,11,4,142,"Senior"],[4,12,11,5,12,5,164,"Vetern"],[5,17,12,9,13,8,188,"Hardy"],[6,26,13,10,14,9,217,"Heroic"],[7,37,15,11,15,10,249,"Brave"],[8,54,18,13,17,12,287,"Elite"],[9,72,19,14,18,13,330,"Supreme"],[10,94,20,15,19,14,379,"Apex"],[11,114,22,17,21,16,400,"Helios"]],
    6:[[1,4,6,2,5,2,108,"Rookie"],[2,5,7,3,6,3,124,"Trained"],[3,9,8,4,13,4,142,"Senior"],[4,14,13,5,14,5,164,"Vetern"],[5,19,14,11,15,9,188,"Hardy"],[6,30,15,11,15,10,217,"Heroic"],[7,43,18,12,17,11,249,"Brave"],[8,57,19,13,18,12,287,"Elite"],[9,77,20,15,19,13,330,"Supreme"],[10,99,21,15,20,14,379,"Apex"],[11,120,22,16,21,15,400,"Helios"]],
    7:[[1,4,6,2,5,2,108,"Rookie"],[2,5,7,3,6,3,124,"Trained"],[3,10,8,4,14,4,142,"Senior"],[4,15,14,5,15,5,164,"Vetern"],[5,20,15,12,16,10,188,"Hardy"],[6,32,16,12,16,11,217,"Heroic"],[7,46,19,13,18,12,249,"Brave"],[8,60,20,14,19,12,287,"Elite"],[9,82,21,16,20,14,330,"Supreme"],[10,104,22,16,21,15,379,"Apex"],[11,126,24,18,23,17,400,"Helios"]],
    8:[[1,5,8,1,6,1,108,"Rookie"],[2,6,9,2,7,2,124,"Trained"],[3,11,15,3,16,3,142,"Senior"],[4,16,16,4,17,4,164,"Vetern"],[5,21,17,11,18,10,188,"Hardy"],[6,34,18,11,19,11,217,"Heroic"],[7,49,21,13,20,12,249,"Brave"],[8,63,22,14,21,13,287,"Elite"],[9,87,23,15,22,14,330,"Supreme"],[10,110,23,17,22,15,379,"Apex"],[11,135,25,19,24,17,400,"Helios"]],
    9:[[1,5,7,2,5,2,108,"Rookie"],[2,6,8,3,6,3,124,"Trained"],[3,11,8,4,15,4,142,"Senior"],[4,16,15,5,16,5,164,"Vetern"],[5,22,16,12,17,11,188,"Hardy"],[6,35,17,12,18,12,217,"Heroic"],[7,51,22,14,19,13,249,"Brave"],[8,66,23,15,21,14,287,"Elite"],[9,91,24,16,22,15,330,"Supreme"],[10,115,25,17,23,16,379,"Apex"],[11,141,27,19,25,18,400,"Helios"]],
    10:[[1,5,7,2,5,2,108,"Rookie"],[2,6,8,3,6,3,124,"Trained"],[3,12,10,4,16,4,142,"Senior"],[4,17,16,5,17,5,164,"Vetern"],[5,23,17,13,19,12,188,"Hardy"],[6,37,19,14,20,13,217,"Heroic"],[7,54,23,15,21,14,249,"Brave"],[8,69,24,16,22,15,287,"Elite"],[9,95,25,17,23,16,330,"Supreme"],[10,121,26,19,24,17,379,"Apex"],[11,148,28,21,26,20,400,"Helios"]],
  },
  marksman: {
    0:[[1,3,5,1,5,1,108,"Rookie"],[2,4,6,2,7,2,124,"Trained"],[3,6,7,3,8,3,142,"Senior"],[4,9,8,4,9,4,164,"Vetern"],[5,13,9,5,10,5,188,"Hardy"],[6,20,10,6,11,6,217,"Heroic"],[7,28,11,7,12,7,249,"Brave"],[8,38,12,8,13,8,287,"Elite"],[9,50,13,9,14,9,330,"Supreme"],[10,66,14,10,15,10,379,"Apex"],[11,80,16,12,17,12,400,"Helios"]],
    1:[[1,3,5,1,6,1,108,"Rookie"],[2,4,6,2,7,2,124,"Trained"],[3,6,8,3,9,3,142,"Senior"],[4,10,9,4,10,4,164,"Vetern"],[5,14,10,6,11,6,188,"Hardy"],[6,21,11,7,12,7,217,"Heroic"],[7,30,12,8,13,8,249,"Brave"],[8,41,13,9,14,9,287,"Elite"],[9,54,14,10,15,10,330,"Supreme"],[10,71,15,11,16,11,379,"Apex"],[11,86,17,13,18,13,400,"Helios"]],
    2:[[1,3,6,1,6,1,108,"Rookie"],[2,4,7,2,7,2,124,"Trained"],[3,6,9,3,10,3,142,"Senior"],[4,10,10,4,11,4,164,"Vetern"],[5,15,11,7,12,7,188,"Hardy"],[6,22,12,8,13,8,217,"Heroic"],[7,32,14,9,14,9,249,"Brave"],[8,44,15,10,15,10,287,"Elite"],[9,58,16,11,16,11,330,"Supreme"],[10,76,17,12,17,12,379,"Apex"],[11,92,19,14,19,14,400,"Helios"]],
    3:[[1,3,6,1,6,1,108,"Rookie"],[2,4,7,2,7,2,124,"Trained"],[3,6,10,3,11,3,142,"Senior"],[4,11,11,4,12,4,164,"Vetern"],[5,16,12,8,13,8,186,"Hardy"],[6,24,13,9,14,9,217,"Heroic"],[7,34,15,10,15,10,249,"Brave"],[8,47,16,11,16,11,287,"Elite"],[9,62,17,12,17,12,330,"Supreme"],[10,83,18,13,18,13,379,"Apex"],[11,100,20,15,20,15,400,"Helios"]],
    4:[[1,3,6,1,6,1,108,"Rookie"],[2,4,7,2,7,2,124,"Trained"],[3,8,11,3,12,3,142,"Senior"],[4,12,12,4,13,4,164,"Vetern"],[5,17,13,9,14,8,188,"Hardy"],[6,26,14,10,15,9,217,"Heroic"],[7,37,16,11,16,10,249,"Brave"],[8,51,17,12,17,11,287,"Elite"],[9,67,18,13,18,12,330,"Supreme"],[10,88,19,14,19,13,379,"Apex"],[11,106,21,16,21,15,400,"Helios"]],
    5:[[1,4,7,1,6,1,108,"Rookie"],[2,5,8,2,7,2,124,"Trained"],[3,9,12,3,13,3,142,"Senior"],[4,13,13,4,14,4,164,"Vetern"],[5,18,14,9,15,9,188,"Hardy"],[6,28,15,10,16,10,217,"Heroic"],[7,40,18,11,17,11,249,"Brave"],[8,54,19,12,18,12,287,"Elite"],[9,72,20,13,19,13,330,"Supreme"],[10,94,21,14,20,14,379,"Apex"],[11,114,23,16,22,16,400,"Helios"]],
    6:[[1,4,7,1,7,1,108,"Rookie"],[2,5,8,2,7,2,124,"Trained"],[3,9,13,3,14,3,142,"Senior"],[4,14,14,4,15,4,164,"Vetern"],[5,19,15,10,16,9,188,"Hardy"],[6,30,16,10,17,10,217,"Heroic"],[7,43,19,12,18,11,249,"Brave"],[8,57,20,12,19,12,287,"Elite"],[9,77,21,14,20,13,330,"Supreme"],[10,99,22,15,21,14,379,"Apex"],[11,120,24,17,23,16,400,"Helios"]],
    7:[[1,4,7,1,6,1,108,"Rookie"],[2,5,8,2,7,2,124,"Trained"],[3,10,14,3,15,3,142,"Senior"],[4,15,15,4,16,4,164,"Vetern"],[5,20,16,10,17,10,188,"Hardy"],[6,32,17,11,18,10,217,"Heroic"],[7,46,20,12,19,11,249,"Brave"],[8,60,21,13,20,12,287,"Elite"],[9,82,22,14,21,14,330,"Supreme"],[10,104,23,15,22,15,379,"Apex"],[11,126,25,18,24,17,400,"Helios"]],
    8:[[1,5,8,1,6,1,108,"Rookie"],[2,6,9,2,7,2,124,"Trained"],[3,11,15,3,16,3,142,"Senior"],[4,16,16,4,17,4,164,"Vetern"],[5,21,17,11,18,10,188,"Hardy"],[6,34,18,11,19,11,217,"Heroic"],[7,49,21,13,20,12,249,"Brave"],[8,63,22,14,21,13,287,"Elite"],[9,87,23,15,22,14,330,"Supreme"],[10,110,24,16,23,15,379,"Apex"],[11,135,26,19,25,18,400,"Helios"]],
    9:[[1,5,8,1,6,1,108,"Rookie"],[2,6,9,2,7,2,124,"Trained"],[3,11,15,3,16,3,142,"Senior"],[4,16,16,4,17,4,164,"Vetern"],[5,22,17,12,18,11,188,"Hardy"],[6,35,18,13,19,12,217,"Heroic"],[7,51,23,14,21,13,249,"Brave"],[8,66,24,15,22,14,287,"Elite"],[9,91,25,16,23,15,330,"Supreme"],[10,115,26,17,24,16,379,"Apex"],[11,141,28,19,26,18,400,"Helios"]],
    10:[[1,5,8,1,6,1,108,"Rookie"],[2,6,10,2,7,2,124,"Trained"],[3,12,16,3,17,3,142,"Senior"],[4,17,17,4,19,4,164,"Vetern"],[5,23,19,13,20,12,188,"Hardy"],[6,37,20,14,21,13,217,"Heroic"],[7,54,24,15,22,14,249,"Brave"],[8,69,25,16,23,15,287,"Elite"],[9,95,26,17,24,16,330,"Supreme"],[10,121,27,19,25,17,379,"Apex"],[11,148,30,21,27,20,400,"Helios"]],
  },
};

// Get FC level number from building current level string (e.g. "FC8", "FC8.2" → 8)
function getBuildingFCLevel(buildingName) {
  try {
    const raw = localStorage.getItem("cp-buildings");
    if (!raw) return 0;
    const buildings = JSON.parse(raw);
    const b = buildings.find(b => b.name === buildingName);
    if (!b || !b.current) return 0;
    const m = b.current.match(/FC(\d+)/i);
    return m ? parseInt(m[1]) : 0;
  } catch { return 0; }
}

// Get troop stats for a given type, tier (T1-T11), and FC level
function getTroopStats(troopId, tierStr, fcLevel) {
  const tierNum = parseInt(tierStr.replace("T",""));
  const fc = Math.min(Math.max(fcLevel, 0), 10);
  const rows = TROOP_STATS[troopId]?.[fc];
  if (!rows) return null;
  return rows.find(r => r[0] === tierNum) || null;
}

function TroopsPage() {
  const C = COLORS;

  const defaultTroops = () => {
    const out = {};
    TROOP_TYPES.forEach(t => { out[t.id] = []; });
    return out;
  };

  const [troops, setTroops] = useLocalStorage("troops-inventory-v2", defaultTroops());
  const [showPromote, setShowPromote] = React.useState(false);

  // Read FC levels from construction tab for each troop type
  const fcLevels = React.useMemo(() => {
    const out = {};
    TROOP_TYPES.forEach(t => { out[t.id] = getBuildingFCLevel(t.building); });
    return out;
  }, []);

  // Promote state
  const [promoteForm, setPromoteForm] = React.useState({
    infantry: { fromTier:"", toTier:"", count:"" },
    lancer:   { fromTier:"", toTier:"", count:"" },
    marksman: { fromTier:"", toTier:"", count:"" },
  });

  const typeColor  = id => C[TROOP_TYPES.find(t=>t.id===id)?.color]      || C.textPri;
  const typeBg     = id => C[TROOP_TYPES.find(t=>t.id===id)?.color+"Bg"]  || C.surface;
  const typeDim    = id => C[TROOP_TYPES.find(t=>t.id===id)?.color+"Dim"] || C.border;

  const sel = {
    background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
    color:C.textPri, padding:"5px 8px", fontSize:12, outline:"none",
  };

  // Totals
  const typeTotal = id => (troops[id]||[]).reduce((s,r) => s + (Number(r.count)||0), 0);

  // Power for a troop type = sum over all tier rows of (count × power per troop)
  const typePower = id => {
    const fc = fcLevels[id] || 0;
    return (troops[id]||[]).reduce((sum, r) => {
      const stats = getTroopStats(id, r.tier, fc);
      return sum + (Number(r.count)||0) * (stats?.[1] || 0);
    }, 0);
  };

  const grandTotal = TROOP_TYPES.reduce((s,t) => s + typeTotal(t.id), 0);
  const grandPower = TROOP_TYPES.reduce((s,t) => s + typePower(t.id), 0);

  // Highest tier row per type (for stats display)
  const highestTierRow = id => {
    const rows = troops[id]||[];
    if (!rows.length) return null;
    return rows.reduce((best, r) => {
      const n = parseInt(r.tier.replace("T",""));
      const bn = parseInt((best?.tier||"T0").replace("T",""));
      return n > bn ? r : best;
    }, null);
  };

  const addTierRow = id => {
    const used = (troops[id]||[]).map(r=>r.tier);
    const available = TROOP_TIERS.filter(t => !used.includes(t));
    if (!available.length) return;
    const tier = available[available.length - 1];
    setTroops(prev => ({ ...prev, [id]: [...(prev[id]||[]), { tier, count:0 }] }));
  };

  const removeTierRow = (id, idx) => {
    setTroops(prev => ({ ...prev, [id]: (prev[id]||[]).filter((_,i) => i !== idx) }));
  };

  const updateRow = (id, idx, field, value) => {
    setTroops(prev => {
      const rows = [...(prev[id]||[])];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...prev, [id]: rows };
    });
  };

  const doPromote = () => {
    setTroops(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      TROOP_TYPES.forEach(t => {
        const f = promoteForm[t.id];
        const qty = Number(String(f.count).replace(/,/g,""));
        if (!f.fromTier || !f.toTier || !qty) return;
        const fromIdx = (next[t.id]||[]).findIndex(r => r.tier === f.fromTier);
        if (fromIdx >= 0) {
          next[t.id][fromIdx].count = Math.max(0, (Number(next[t.id][fromIdx].count)||0) - qty);
          if (next[t.id][fromIdx].count === 0) next[t.id].splice(fromIdx, 1);
        }
        const toIdx = (next[t.id]||[]).findIndex(r => r.tier === f.toTier);
        if (toIdx >= 0) {
          next[t.id][toIdx].count = (Number(next[t.id][toIdx].count)||0) + qty;
        } else {
          next[t.id] = [...(next[t.id]||[]), { tier: f.toTier, count: qty }];
        }
      });
      return next;
    });
    setPromoteForm({ infantry:{fromTier:"",toTier:"",count:""}, lancer:{fromTier:"",toTier:"",count:""}, marksman:{fromTier:"",toTier:"",count:""} });
    setShowPromote(false);
  };

  const StatCell = ({ label, value }) => (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:9, color:C.textDim, fontFamily:"'Space Mono',monospace",
        textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</div>
      <div style={{ fontSize:12, fontWeight:700, color:C.textPri,
        fontFamily:"'Space Mono',monospace" }}>{value}</div>
    </div>
  );

  return (
    <div className="fade-in" style={{ padding:"0 0 40px" }}>

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom:20, padding:"16px 20px", background:C.accentBg,
        borderRadius:10, border:`1px solid ${C.accentDim}` }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
          flexWrap:"wrap", gap:16 }}>

          {/* Total column */}
          <div style={{ minWidth:140 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.5px",
              textTransform:"uppercase", color:C.accent,
              fontFamily:"'Space Mono',monospace" }}>Total Troops</div>
            <div style={{ fontSize:26, fontWeight:800, color:C.textPri,
              fontFamily:"Syne,sans-serif", lineHeight:1.2 }}>
              {grandTotal.toLocaleString()}
            </div>
            <div style={{ fontSize:10, color:C.textDim, fontFamily:"'Space Mono',monospace",
              marginTop:2 }}>Total Power</div>
            <div style={{ fontSize:16, fontWeight:700, color:C.accent,
              fontFamily:"'Space Mono',monospace" }}>
              {grandPower.toLocaleString()}
            </div>
          </div>

          {/* Per-type columns */}
          <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
            {TROOP_TYPES.map(t => (
              <div key={t.id} style={{ textAlign:"center", minWidth:100 }}>
                <div style={{ fontSize:10, color:typeColor(t.id), fontWeight:700,
                  fontFamily:"'Space Mono',monospace",
                  letterSpacing:"0.5px" }}>{t.label.toUpperCase()}</div>
                <div style={{ fontSize:16, fontWeight:700, color:C.textPri,
                  fontFamily:"'Space Mono',monospace" }}>
                  {typeTotal(t.id).toLocaleString()}
                </div>
                <div style={{ fontSize:10, color:C.textDim,
                  fontFamily:"'Space Mono',monospace", marginTop:1 }}>
                  Power: <span style={{ color:typeColor(t.id) }}>
                    {typePower(t.id).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize:9, color:C.textDim,
                  fontFamily:"'Space Mono',monospace" }}>
                  FC{fcLevels[t.id]} stats
                </div>
              </div>
            ))}
          </div>

          {/* Promote button */}
          <button onClick={() => setShowPromote(true)}
            style={{ alignSelf:"flex-start", padding:"9px 18px", borderRadius:8,
              fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif",
              background:C.accentBg, color:C.accent, border:`1px solid ${C.accentDim}` }}>
            ⬆ Promote Troops
          </button>
        </div>
      </div>

      {/* ── Troop Cards (full width, stacked) ──────────────────────────────── */}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {TROOP_TYPES.map(t => {
          const tc   = typeColor(t.id);
          const tbg  = typeBg(t.id);
          const tdim = typeDim(t.id);
          const rows = troops[t.id] || [];
          const usedTiers = rows.map(r => r.tier);
          const fc = fcLevels[t.id];
          const topRow = highestTierRow(t.id);
          const topStats = topRow ? getTroopStats(t.id, topRow.tier, fc) : null;
          // topStats: [tierNum, power, atk, def, leth, hp, load, name]

          return (
            <div key={t.id} style={{ background:C.card, border:`1px solid ${C.border}`,
              borderRadius:12, overflow:"hidden" }}>

              {/* Card header */}
              <div style={{ padding:"14px 20px 12px", borderBottom:`1px solid ${C.border}`,
                background:tbg, display:"flex", alignItems:"center",
                justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:tc,
                    fontFamily:"Syne,sans-serif" }}>{t.label}</div>
                  <div style={{ fontSize:11, color:C.textDim,
                    fontFamily:"'Space Mono',monospace", marginTop:1 }}>
                    {typeTotal(t.id) > 0
                      ? `${typeTotal(t.id).toLocaleString()} troops · Power: ${typePower(t.id).toLocaleString()}`
                      : "No troops logged"}
                    {" · "}FC{fc} Training Camp
                  </div>
                </div>
              </div>

              {/* Card body: tier rows + stats side by side */}
              <div style={{ padding:"16px 20px",
                display:"grid", gridTemplateColumns:"1fr auto", gap:20,
                alignItems:"start" }}>

                {/* Left: tier rows */}
                <div>
                  {/* Column headers */}
                  {rows.length > 0 && (
                    <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 28px",
                      gap:8, marginBottom:6 }}>
                      <div style={{ fontSize:10, color:C.textDim,
                        fontFamily:"'Space Mono',monospace",
                        textTransform:"uppercase" }}>Tier</div>
                      <div style={{ fontSize:10, color:C.textDim,
                        fontFamily:"'Space Mono',monospace",
                        textTransform:"uppercase", textAlign:"right" }}>Count</div>
                      <div />
                    </div>
                  )}

                  {rows.length === 0 && (
                    <div style={{ fontSize:12, color:C.textDim, padding:"8px 0",
                      fontFamily:"'Space Mono',monospace" }}>No tiers added yet</div>
                  )}

                  {rows.map((row, idx) => {
                    const available = TROOP_TIERS.filter(
                      tier => tier === row.tier || !usedTiers.includes(tier)
                    );
                    const rowStats = getTroopStats(t.id, row.tier, fc);
                    const rowPower = (Number(row.count)||0) * (rowStats?.[1] || 0);
                    return (
                      <div key={idx} style={{ marginBottom:8 }}>
                        <div style={{ display:"grid",
                          gridTemplateColumns:"80px 1fr 28px", gap:8,
                          alignItems:"center" }}>
                          <select value={row.tier}
                            onChange={e => updateRow(t.id, idx, "tier", e.target.value)}
                            style={{ ...sel }}>
                            {available.map(tier => (
                              <option key={tier} value={tier}>{tier}</option>
                            ))}
                          </select>
                          <TroopCountInput
                            key={`${t.id}-${idx}`}
                            value={row.count}
                            onChange={v => updateRow(t.id, idx, "count", v)}
                            color={tc}
                            selStyle={sel}
                          />
                          <button onClick={() => removeTierRow(t.id, idx)}
                            style={{ background:"none", border:"none",
                              cursor:"pointer", color:C.textDim,
                              fontSize:16, padding:"2px 4px" }}>×</button>
                        </div>
                        {rowPower > 0 && (
                          <div style={{ fontSize:10, color:C.textDim, marginTop:2,
                            fontFamily:"'Space Mono',monospace", paddingLeft:2 }}>
                            {rowStats?.[7]} · {rowStats?.[1]} power/troop · Total: <span
                              style={{ color:tc }}>{rowPower.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {usedTiers.length < TROOP_TIERS.length && (
                    <button onClick={() => addTierRow(t.id)}
                      style={{ width:"100%", marginTop:4, padding:"7px",
                        borderRadius:6, fontSize:12, fontWeight:700,
                        cursor:"pointer", fontFamily:"Syne,sans-serif", color:tc,
                        background:"transparent", border:`1px dashed ${tdim}` }}>
                      + Add Tier
                    </button>
                  )}
                </div>

                {/* Right: highest tier stats */}
                {topStats && (
                  <div style={{ minWidth:220, background:C.surface,
                    borderRadius:8, border:`1px solid ${C.border}`,
                    padding:"12px 14px" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:tc,
                      fontFamily:"'Space Mono',monospace",
                      textTransform:"uppercase", marginBottom:10,
                      letterSpacing:"0.5px" }}>
                      {topRow.tier} Stats · FC{fc}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                      gap:"8px 4px" }}>
                      <StatCell label="Power"   value={topStats[1]} />
                      <StatCell label="Attack"  value={topStats[2]} />
                      <StatCell label="Defense" value={topStats[3]} />
                      <StatCell label="Leth"    value={topStats[4]} />
                      <StatCell label="Health"  value={topStats[5]} />
                      <StatCell label="Load"    value={topStats[6]} />
                    </div>
                    <div style={{ marginTop:10, fontSize:10, color:C.textDim,
                      fontFamily:"'Space Mono',monospace", textAlign:"center" }}>
                      {topStats[7]} · Speed: 11
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Promote Overlay ─────────────────────────────────────────────────── */}
      {showPromote && createPortal(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)",
          zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center",
          padding:20 }}
          onClick={e => e.target === e.currentTarget && setShowPromote(false)}>
          <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
            style={{ background:C.card, border:`1px solid ${C.borderHi}`,
              borderRadius:14, width:"100%", maxWidth:560, maxHeight:"88vh",
              overflowY:"auto", boxShadow:"0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ padding:"18px 24px 14px", borderBottom:`1px solid ${C.border}`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              position:"sticky", top:0, background:C.card, zIndex:1 }}>
              <div style={{ fontSize:16, fontWeight:800, color:C.textPri }}>
                ⬆ Promote Troops
              </div>
              <button onClick={() => setShowPromote(false)}
                style={{ background:"none", border:"none", color:C.textDim,
                  fontSize:20, cursor:"pointer", padding:"2px 6px" }}>✕</button>
            </div>
            <div style={{ padding:"18px 24px 24px" }}>
              {TROOP_TYPES.map(t => {
                const tc = typeColor(t.id);
                const rows = troops[t.id] || [];
                const f = promoteForm[t.id];
                const fromTierIdx = TROOP_TIERS.indexOf(f.fromTier);
                const toTierOptions = f.fromTier
                  ? TROOP_TIERS.filter((_,i) => i > fromTierIdx)
                  : [];
                return (
                  <div key={t.id} style={{ marginBottom:20, padding:"14px 16px",
                    background:C.surface, borderRadius:10, border:`1px solid ${C.border}` }}>
                    <div style={{ display:"flex", alignItems:"center",
                      justifyContent:"space-between", marginBottom:10 }}>
                      <div style={{ fontSize:14, fontWeight:800, color:tc,
                        fontFamily:"Syne,sans-serif" }}>{t.label}</div>
                      <div style={{ fontSize:11, color:C.textDim,
                        fontFamily:"'Space Mono',monospace" }}>
                        {typeTotal(t.id).toLocaleString()} total
                      </div>
                    </div>
                    {rows.length > 0 ? (
                      <>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
                          {[...rows].sort((a,b) =>
                            TROOP_TIERS.indexOf(b.tier) - TROOP_TIERS.indexOf(a.tier)
                          ).map((row,i) => (
                            <div key={i} style={{ padding:"4px 10px", borderRadius:6,
                              background:C.card, border:`1px solid ${C.border}`,
                              fontSize:11, fontFamily:"'Space Mono',monospace" }}>
                              <span style={{ color:tc, fontWeight:700 }}>{row.tier}</span>
                              <span style={{ color:C.textDim, marginLeft:6 }}>
                                {Number(row.count).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display:"grid",
                          gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                          <div>
                            <div style={{ fontSize:10, color:C.textSec, marginBottom:4,
                              fontFamily:"'Space Mono',monospace" }}>FROM</div>
                            <select value={f.fromTier}
                              onChange={e => setPromoteForm(p => ({
                                ...p, [t.id]: {...p[t.id], fromTier:e.target.value, toTier:""}
                              }))}
                              style={{ ...sel, width:"100%" }}>
                              <option value="">— tier —</option>
                              {rows.map(r => (
                                <option key={r.tier} value={r.tier}>
                                  {r.tier} ({Number(r.count).toLocaleString()})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div style={{ fontSize:10, color:C.textSec, marginBottom:4,
                              fontFamily:"'Space Mono',monospace" }}>TO</div>
                            <select value={f.toTier} disabled={!f.fromTier}
                              onChange={e => setPromoteForm(p => ({
                                ...p, [t.id]: {...p[t.id], toTier:e.target.value}
                              }))}
                              style={{ ...sel, width:"100%",
                                opacity: f.fromTier ? 1 : 0.5 }}>
                              <option value="">— tier —</option>
                              {toTierOptions.map(tier => (
                                <option key={tier} value={tier}>{tier}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div style={{ fontSize:10, color:C.textSec, marginBottom:4,
                              fontFamily:"'Space Mono',monospace" }}>COUNT</div>
                            <input
                              type="text" inputMode="numeric"
                              value={f.count === "" ? "" : (document.activeElement?.dataset?.promoteCount === t.id
                                ? f.count
                                : (Number(f.count) > 0 ? Number(f.count).toLocaleString() : f.count))}
                              placeholder="0"
                              data-promote-count={t.id}
                              onFocus={e => {
                                // strip commas on focus
                                const raw = String(f.count).replace(/,/g,"");
                                setPromoteForm(p => ({ ...p, [t.id]: {...p[t.id], count:raw} }));
                              }}
                              onBlur={e => {
                                const v = parseInt(String(f.count).replace(/,/g,"")) || 0;
                                setPromoteForm(p => ({ ...p, [t.id]: {...p[t.id], count: v > 0 ? v.toLocaleString() : ""} }));
                              }}
                              onChange={e => setPromoteForm(p => ({
                                ...p, [t.id]: {...p[t.id], count: e.target.value}
                              }))}
                              style={{ ...sel, width:"100%", textAlign:"right",
                                fontFamily:"'Space Mono',monospace", color:tc,
                                boxSizing:"border-box" }} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize:11, color:C.amber,
                        fontFamily:"'Space Mono',monospace" }}>
                        Add tiers on the Troops page first
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button onClick={() => setShowPromote(false)}
                  style={{ padding:"9px 18px", borderRadius:7, fontSize:12,
                    fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif",
                    background:"transparent", color:C.textSec,
                    border:`1px solid ${C.border}` }}>Cancel</button>
                <button onClick={doPromote}
                  style={{ padding:"9px 20px", borderRadius:7, fontSize:12,
                    fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif",
                    background:C.accentBg, color:C.accent,
                    border:`1px solid ${C.accentDim}` }}>
                  ⬆ Apply Promotions
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


// ─── Error Boundary ───────────────────────────────────────────────────────────
export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{padding:40,fontFamily:"Space Mono,monospace",color:"#f85149",background:"var(--c-bg, #0a0c10)",minHeight:"100vh"}}>
        <div style={{fontSize:14,marginBottom:8,color:"var(--c-textPri, #e6edf3)"}}>Something went wrong loading the app.</div>
        <div style={{fontSize:12,color:"var(--c-textSec, #8b949e)",marginBottom:16}}>Error: {this.state.error?.message}</div>
        <button onClick={()=>window.location.reload()}
          style={{padding:"8px 16px",background:"#4A9EBF",color:"#071620",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700}}>
          Reload
        </button>
      </div>
    );
    return this.props.children;
  }
}

// ─── Layout / Nav ─────────────────────────────────────────────────────────────
const PAGES = [
  { id:"char-profile",    label:"Chief Profile",    icon:"[P]", section:"Chief"      },
  { id:"inventory",    label:"Inventory",     icon:"[I]", section:"Chief"      },
  { id:"construction", label:"Construction",  icon:"[B]", section:"Chief"      },
  { id:"chief-gear",    label:"Chief Gear",    icon:"[C]", section:"Chief"      },
  { id:"chief-charms",  label:"Chief Charms",  icon:"[K]", section:"Chief"      },
  { id:"experts",       label:"Experts",       icon:"[E]", section:"Chief"      },
  { id:"daybreak-island", label:"Daybreak Island", icon:"[D]", section:"Chief"      },
  { id:"war-academy",  label:"War Academy",   icon:"[W]", section:"Resources"   },
  { id:"research-center", label:"Research", icon:"⚗", section:"Resources" },
  { id:"heroes",        label:"Heroes",        icon:"[H]", section:"Combat"      },
  { id:"hero-gear",     label:"Hero Gear",     icon:"[G]", section:"Combat"      },
  { id:"troops",        label:"Troops",        icon:"[T]", section:"Combat"      },
  { id:"rfc-planner",  label:"RFC Planner",   icon:"[R]", section:"Planning"    },
  { id:"svs-calendar",  label:"SvS Calendar",  icon:"[C]", section:"Planning"    },
];

const PAGE_TITLES = {
  inventory:    { title: "Inventory", sub: "Your current stockpile across all resource types" },
  construction: { title: "Construction", sub: "Interactive upgrade planner — set current & goal levels, track accumulation, project SVS points" },
  "rfc-planner":{ title: "RFC Planner",  sub: "28-day day-by-day refining schedule — plan vs actual, running balances, FC income tracking" },
  heroes:       { title: "Heroes", sub: "Hero roster — levels, skills, and widget tracking" },
  "hero-gear":    { title: "Hero Gear",     sub: "Gear upgrade tracker with material costs and SVS points" },
  "chief-gear":   { title: "Chief Gear",    sub: "Chief gear upgrade planner — track level upgrades, material costs and stat gains" },
  "chief-charms": { title: "Chief Charms",  sub: "Charm upgrade planner — 18 independent charms across 6 gear pieces, material costs and stat gains" },
  experts:      { title: "Expert Planner", sub: "Skill levels, sigil costs, and per-day SVS contributions" },
  "daybreak-island": { title: "Daybreak Island", sub: "Island buff tracker — prosperity points, troop bonuses, deployment capacity and more" },
  "war-academy":{ title: "War Academy", sub: "Research upgrade planner — track shards, steel, time costs and stat gains across all three troop types" },
  "research-center": { title: "Research Center", sub: "Growth, Economy & Battle research trees — track per-level costs, buffs and time across all tiers" },
  "troops":     { title: "Troops", sub: "Troop inventory — track your Infantry, Lancer and Marksman counts by tier" },
  "svs-calendar":{ title: "SvS Calendar", sub: "Rolling 28-week schedule — SvS every 4th week, King of Icefield every 2nd week" },
  "char-profile": { title: "Chief Profile", sub: "Total power summary — tech, gear, heroes, charms, military and growth stats" },
  alliance:     { title: "Alliance Scores", sub: "SvS prep scores and historical results" },
  admin:        { title: "Admin", sub: "Review and approve hero stat submissions" },
};

export default function App() {
  const { theme, setTheme, resetToSystem } = useTheme();
  const { user, loading: authLoading, error: authError, signUp, signIn, signInWithDiscord, signOut,
          changePassword, requestDeleteAccount, confirmDeleteAccount, clearError } = useAuth();

  const {
    characters, activeCharacter, activeCharId,
    loadingChars, charError, clearCharError,
    switchCharacter, addCharacter, removeCharacter, renameCharacter, makeDefault,
  } = useCharacters(user);

  const [page,          setPage]         = useLocalStorage("wos-page", "inventory");
  const [inv,           setInvRaw]       = useLocalStorage("wos-svs-inventory", INITIAL_INVENTORY);
  const [savedPlans,    setSavedPlans]   = useLocalStorage("wos-rfc-saved-plans", {});
  const [planSnapshot,  setPlanSnapshot] = useState(null); // per-character, loaded from Supabase
  // Shared hero state — gen filter and hero stats synced between HeroesPage and HeroGearPage
  const [genFilter,   setGenFilter]  = useLocalStorage("hg-gen-filter", "Gen 9");
  const [heroStats,   setHeroStats]  = useLocalStorage("hg-hero-stats", defaultAllHeroStats());
  const [hgHeroes,    setHgHeroes]   = useLocalStorage("hg-heroes", HERO_SLOTS.map(s => defaultHeroState(s.type)));
  const [heroStatsVersion, setHeroStatsVersion] = useState(0);
  // Research Center — cloud-synced so state persists across devices and tab switches
  const [rcLevels,    setRcLevels]    = useLocalStorage("rc-levels", {});
  const [rcCollapse,  setRcCollapse]  = useLocalStorage("rc-collapse", {});
  // Construction Speed — shared between Construction tab and Chief Profile
  const [cpSpeedBuff, setCpSpeedBuff] = useLocalStorage("cp-speedbuff", 0);
  // Version counter — increments when cloud sync completes, triggers CharacterProfilePage re-read
  const [profileVersion, setProfileVersion] = useState(0);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [notifications,   setNotifications]   = useState([]);
  const [savedAt,       setSavedAt]      = useState(null);
  const [loadedPlanKey, setLoadedPlanKey]= useState(null);
  const [syncing,       setSyncing]      = useState(false);
  const [pendingAdminCount, setPendingAdminCount] = useState(0);
  const [sidebarOpen,    setSidebarOpen]   = useState(false);
  const [profileOpen,    setProfileOpen]   = useState(false);
  const [profileSection, setProfileSection]= useState("account");
  const [savePlanPopup, setSavePlanPopup]= useState({ open:false, defaultName:"", mode:"over" });

  const syncTimer   = useRef(null);
  const prevCharId  = useRef(null);
  const invRef      = useRef(inv);

  // Keep invRef in sync with inv state
  useEffect(() => { invRef.current = inv; }, [inv]);

  // ── Flush pending save immediately before character switch ───────────────────
  const flushSave = useCallback(async (charId) => {
    if (!user || !charId) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = null;
    await charSaveInventory(charId, invRef.current);
  }, [user]);

  // ── Load data whenever activeCharId changes ───────────────────────────────────
  useEffect(() => {
    if (!user || !activeCharId) return;

    (async () => {
      setSyncing(true);
      const [cloudInv, cloudPlans, cloudSnapshot] = await Promise.all([
        charLoadInventory(activeCharId),
        charLoadPlans(activeCharId),
        loadPlanSnapshot(activeCharId),
      ]);

      if (!cloudInv) {
        if (characters.length <= 1) {
          const localHasData = Object.keys(INITIAL_INVENTORY).some(k => {
            const d = INITIAL_INVENTORY[k], c = invRef.current[k];
            return typeof d === "boolean" ? c !== d : c !== 0;
          });
          if (localHasData) await charSaveInventory(activeCharId, invRef.current);
        } else {
          setInvRaw(INITIAL_INVENTORY);
          setSavedPlans({});
        }
      } else {
        setInvRaw(cloudInv);
        if (cloudPlans && Object.keys(cloudPlans).length > 0) setSavedPlans(cloudPlans);
        else setSavedPlans({});
      }
      setPlanSnapshot(cloudSnapshot || null);
      setSyncing(false);
    })();
  }, [user, activeCharId]);

  // ── Reset when user signs out ────────────────────────────────────────────────
  useEffect(() => { if (!user) { invRef.current = INITIAL_INVENTORY; } }, [user]);

  // Update guest flag and sync all data from cloud on login
  useEffect(() => {
    setGuestFlag(!user);
    if (!user?.id) {
      setSyncUserId(null);
      return;
    }
    supabase.from("user_data")
      .select("key, value, updated_at")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        const cloudRows = (!error && data) ? data : [];
        const cloudMap = new Map(cloudRows.map(r => [r.key, r]));

        // Pull cloud → local where cloud is newer
        cloudRows.forEach(row => {
          try {
            const localTs = localStorage.getItem(`${row.key}__ts`) || "0";
            if (row.updated_at > localTs) {
              localStorage.setItem(row.key, row.value);
              localStorage.setItem(`${row.key}__ts`, row.updated_at);
            }
          } catch {}
        });

        // Push local → cloud for keys that exist locally but not in Supabase
        // This handles first-time sync after RLS was fixed
        const allLocalKeys = Object.keys(localStorage).filter(k =>
          !k.endsWith("__ts") && !NO_SYNC_KEYS.has(k) &&
          !k.startsWith("sb-") && k !== "wos-theme"
        );
        allLocalKeys.forEach(key => {
          try {
            if (cloudMap.has(key)) return; // already in cloud, skip
            const localVal = localStorage.getItem(key);
            if (!localVal || localVal === "null") return;
            // Schedule upload with a small delay to avoid hammering Supabase
            scheduleSync(key, JSON.parse(localVal));
          } catch {}
        });

        // Fire event — mounted hooks re-read from localStorage
        setSyncUserId(user.id);
        setTimeout(() => setProfileVersion(v => v + 1), 1500);
        // Load notifications for this user
        fetchNotifications(user.id).then(setNotifications);
        // Load pending count for admin nav dot
        if (user.id === ADMIN_UID) {
          Promise.all([
            supabase.from("issue_reports").select("id", {count:"exact"}).eq("status","submitted"),
            supabase.from("stat_submissions").select("id", {count:"exact"}).eq("status","pending"),
          ]).then(([issues, subs]) => {
            setPendingAdminCount((issues.count || 0) + (subs.count || 0));
          });
        }
      });
  }, [user]);

  // ── Debounced cloud save on inv change ────────────────────────────────────────
  const setInv = useCallback((valOrFn) => {
    setInvRaw(prev => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      if (user && activeCharId) {
        clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => charSaveInventory(activeCharId, next), 1500);
      }
      setSavedAt(new Date().toLocaleTimeString());
      return next;
    });
  }, [user, activeCharId]);

  useEffect(() => { setSavedAt(new Date().toLocaleTimeString()); }, []);

  // ── Plan snapshot: set starting inventory ────────────────────────────────────
  const handleSetSnapshot = useCallback(() => {
    const snapshot = {
      fc:            invRef.current.fireCrystals ?? 0,
      rfc:           invRef.current.refinedFC    ?? 0,
      shards:        invRef.current.shards       ?? 0,
      steel:         invRef.current.steel        ?? 0,
      dailyIntel:    invRef.current.dailyIntel   ?? 0,
      steelHourlyRate: invRef.current.steelHourlyRate ?? 0,
      setAt:         new Date().toISOString(),
    };
    setPlanSnapshot(snapshot);
    if (user && activeCharId) savePlanSnapshot(activeCharId, snapshot);
  }, [user, activeCharId]);

  // ── Update plan: mid-cycle refresh ───────────────────────────────────────────
  // Called by ConstructionPlanner with today's day-index in the RFC planner
  const handleUpdatePlan = useCallback((rfcDayIdx, newFC, newRFC) => {
    // Update snapshot with today's values
    const snapshot = {
      ...(planSnapshot || {}),
      fc:    newFC,
      rfc:   newRFC,
      setAt: new Date().toISOString(),
    };
    setPlanSnapshot(snapshot);
    if (user && activeCharId) savePlanSnapshot(activeCharId, snapshot);

    // Write into RFC planner actuals for today's day
    if (rfcDayIdx >= 0 && rfcDayIdx < 28) {
      try {
        const existing = JSON.parse(localStorage.getItem("rfc-actuals2") || "null") || [];
        const next = existing.map((d, i) =>
          i === rfcDayIdx ? { ...d, rfcUsed: 0, _fcOverride: newFC, _rfcOverride: newRFC } : d
        );
        localStorage.setItem("rfc-actuals2", JSON.stringify(next));
        // Also update live inv so the RFC planner reads the new RFC balance
        setInv(p => ({ ...p, fireCrystals: newFC, refinedFC: newRFC }));
      } catch {}
    }
  }, [user, activeCharId, planSnapshot, setInv]);

  // ── Plan handlers ─────────────────────────────────────────────────────────────
  const handleSavePlan = useCallback((key, plan) => {
    setSavedPlans(prev => {
      const next = { ...prev, [key]: plan };
      if (user && activeCharId) charSavePlan(activeCharId, key, plan);
      return next;
    });
  }, [user, activeCharId]);

  const handleLoadPlan = useCallback((key) => {
    const plan = savedPlans[key];
    if (!plan) return;
    try {
      if (plan.selectedCycle !== undefined) localStorage.setItem("rfc-cycle",   JSON.stringify(plan.selectedCycle));
      if (plan.monRefines    !== undefined) localStorage.setItem("rfc-monref",  JSON.stringify(plan.monRefines));
      if (plan.weekdayMode   !== undefined) localStorage.setItem("rfc-wdmode",  JSON.stringify(plan.weekdayMode));
      if (plan.actuals       !== undefined) localStorage.setItem("rfc-actuals2",JSON.stringify(plan.actuals));
      if (plan.fireCrystals  !== undefined) setInv(p => ({ ...p, fireCrystals: plan.fireCrystals }));
      if (plan.refinedFC     !== undefined) setInv(p => ({ ...p, refinedFC:    plan.refinedFC    }));
    } catch {}
    setLoadedPlanKey(key);
    setPage("rfc-planner");
    setTimeout(() => setPage("rfc-planner"), 10);
  }, [savedPlans, setInv]);

  const handleDeletePlan = useCallback((key) => {
    setSavedPlans(prev => {
      const next = { ...prev };
      delete next[key];
      if (user && activeCharId) charDeletePlan(activeCharId, key);
      return next;
    });
  }, [user, activeCharId]);

  // ── Save popup helpers ────────────────────────────────────────────────────────
  const openSavePopup = useCallback((defaultName, mode, resolve, reject) => {
    setSavePlanPopup({ open: true, defaultName, mode, _resolve: resolve, _reject: reject });
  }, []);

  const handleSavePopupConfirm = useCallback((nickname) => {
    setSavePlanPopup(prev => {
      prev._resolve?.(nickname);
      return { open: false, defaultName: "", mode: "over", _resolve: null, _reject: null };
    });
  }, []);

  const handleSavePopupCancel = useCallback(() => {
    setSavePlanPopup(prev => {
      prev._reject?.();
      return { open: false, defaultName: "", mode: "over", _resolve: null, _reject: null };
    });
  }, []);

  const sections  = [...new Set(PAGES.map(p => p.section))];
  const pageTitle = PAGE_TITLES[page] || { title: "Planner", sub: "" };
  const { title, sub } = pageTitle;
  const planKeys  = Object.keys(savedPlans).sort();
  const userInitial = (user?.user_metadata?.full_name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLE }} />

      {/* Profile Management Modal */}
      {user && (
        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          initialSection={profileSection}
          user={user}
          characters={characters}
          activeCharId={activeCharId}
          addCharacter={addCharacter}
          removeCharacter={removeCharacter}
          renameCharacter={renameCharacter}
          makeDefault={makeDefault}
          switchCharacter={async (id) => { await flushSave(activeCharId); switchCharacter(id); }}
          changePassword={changePassword}
          requestDeleteAccount={requestDeleteAccount}
          confirmDeleteAccount={confirmDeleteAccount}
          charError={charError}
          clearCharError={clearCharError}
          authError={authError}
          clearAuthError={clearError}
          theme={theme}
          setTheme={setTheme}
          resetToSystem={resetToSystem}
          notifications={notifications}
          setNotifications={setNotifications}
        />
      )}

      {/* Report Issue Modal */}
      {reportIssueOpen && (
        <ReportIssueModal
          user={user}
          currentPage={page}
          onClose={() => setReportIssueOpen(false)}
        />
      )}

      {/* Save Plan Popup */}
      <SavePlanPopup
        open={savePlanPopup.open}
        defaultName={savePlanPopup.defaultName}
        onSave={handleSavePopupConfirm}
        onCancel={handleSavePopupCancel}
      />

      <div className="app">
        {/* Mobile overlay — only active when sidebar is open */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
          <div style={{background:"#0D1B2A",borderBottom:"1px solid #1E3A52",position:"relative",flexShrink:0}}>
            {/* Top ice bar */}
            <div style={{height:1,background:"#4A9EBF",width:"100%"}} />
            {/* Corner brackets */}
            <div style={{position:"absolute",top:9,left:9,width:8,height:8,borderTop:"1px solid #4A9EBF",borderLeft:"1px solid #4A9EBF",opacity:0.7}} />
            <div style={{position:"absolute",top:9,right:9,width:8,height:8,borderTop:"1px solid #4A9EBF",borderRight:"1px solid #4A9EBF",opacity:0.7}} />
            <div style={{position:"absolute",bottom:9,left:9,width:8,height:8,borderBottom:"1px solid #4A9EBF",borderLeft:"1px solid #4A9EBF",opacity:0.7}} />
            <div style={{position:"absolute",bottom:9,right:9,width:8,height:8,borderBottom:"1px solid #4A9EBF",borderRight:"1px solid #4A9EBF",opacity:0.7}} />
            {/* Body */}
            <div style={{padding:"14px 16px 16px",textAlign:"center"}}>
              {/* Hex badge */}
              <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                <svg width="36" height="36" viewBox="0 0 36 36" style={{display:"block"}}>
                  <polygon points="18,2 30,9 30,23 18,30 6,23 6,9" fill="#132030" stroke="#4A9EBF" strokeWidth="1.5"/>
                  <line x1="11" y1="16" x2="25" y2="16" stroke="#4A9EBF" strokeWidth="1" opacity="0.6"/>
                  <line x1="18" y1="7" x2="18" y2="22" stroke="#4A9EBF" strokeWidth="0.8" opacity="0.4"/>
                  <circle cx="18" cy="17" r="3" fill="#4A9EBF" opacity="0.9"/>
                </svg>
              </div>
              {/* Rule */}
              <div style={{height:1,background:"#1E3A52",margin:"0 4px 10px"}} />
              {/* TUNDRA */}
              <div style={{fontFamily:"Syne,sans-serif",fontSize:18,fontWeight:800,color:"#E8F4F8",letterSpacing:2,lineHeight:1,marginBottom:4}}>TUNDRA</div>
              {/* COMMAND */}
              <div style={{fontFamily:"Syne,sans-serif",fontSize:10,fontWeight:600,color:"#4A9EBF",letterSpacing:5}}>COMMAND</div>
            </div>
          </div>

          {/* Character switcher — only for logged-in users with characters */}
          {user && characters.length > 0 && (
            <div className="char-switcher">
              <select className="char-select"
                value={activeCharId || ""}
                onChange={async e => {
                  const val = e.target.value;
                  if (val === "__manage__") {
                    setProfileSection("characters");
                    setProfileOpen(true);
                  } else {
                    await flushSave(activeCharId);
                    switchCharacter(val);
                  }
                }}>
                {characters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.alliance ? `[${c.alliance}] ` : ""}{c.name}{c.state_number ? ` · State ${c.state_number}` : ""}
                  </option>
                ))}
                <option disabled>──────────</option>
                <option value="__manage__">⚙ Manage Characters</option>
              </select>
            </div>
          )}

          <nav className="sidebar-nav">
            {sections.map(sec => (
              <div key={sec}>
                <div className="nav-section">{sec}</div>
                {PAGES.filter(p => p.section === sec).map(p => (
                  <div
                    key={p.id}
                    className={clsx("nav-item", page === p.id && !loadedPlanKey && "active")}
                    onClick={() => { setLoadedPlanKey(null); setPage(p.id); setSidebarOpen(false); }}
                  >
                    {p.label}
                    {p.id === "inventory" && <span className="nav-badge">HUB</span>}
                  </div>
                ))}
              </div>
            ))}

            {/* Saved Plans — only for logged-in users */}
            {user && planKeys.length > 0 && (
              <div>
                <div className="nav-section">Saved Plans</div>
                {planKeys.map(key => (
                  <div key={key}
                    className={clsx("nav-item", loadedPlanKey === key && "active")}
                    style={{justifyContent:"space-between", paddingRight:6}}
                    onClick={() => { handleLoadPlan(key); setSidebarOpen(false); }}
                  >
                    <span style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12}}>{key}</span>
                    </span>
                    <span onClick={e => { e.stopPropagation(); handleDeletePlan(key); }}
                      style={{color:COLORS.red,fontSize:13,lineHeight:1,padding:"2px 4px",flexShrink:0,cursor:"pointer",opacity:0.7}}
                      title="Delete plan">✕</span>
                  </div>
                ))}
              </div>
            )}
            {/* Admin nav — only visible to admin UID */}
            {user?.id === ADMIN_UID && (
              <div>
                <div className="nav-section">Admin</div>
                <div
                  className={clsx("nav-item", page === "admin" && "active")}
                  onClick={() => { setPage("admin"); setSidebarOpen(false); setPendingAdminCount(0); }}
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}
                >
                  Submissions
                  {pendingAdminCount > 0 && (
                    <span style={{
                      background:"var(--c-red)", color:"#fff", borderRadius:10,
                      padding:"1px 6px", fontSize:10, fontWeight:800,
                      fontFamily:"Space Mono,monospace", lineHeight:1.4,
                    }}>{pendingAdminCount}</span>
                  )}
                </div>
              </div>
            )}
          </nav>

          {/* Auth panel (sign-in form for guests) */}
          <AuthPanel
            user={user}
            loading={authLoading}
            error={authError}
            signUp={signUp}
            signIn={signIn}
            signInWithDiscord={signInWithDiscord}
            clearError={clearError}
          />

          {/* Profile button — signed-in users */}
          {user && (
            <div className="profile-btn-wrap" onClick={() => { setProfileSection("account"); setProfileOpen(true); }}>
              <div style={{position:"relative",flexShrink:0}}>
                <div className="profile-avatar">{userInitial}</div>
                {notifications.filter(n => !n.read).length > 0 && (
                  <div style={{position:"absolute",top:-3,right:-3,width:10,height:10,
                    background:COLORS.red,borderRadius:"50%",border:`2px solid ${COLORS.bg}`}} />
                )}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,color:COLORS.textSec,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {user.user_metadata?.full_name || user.email}
                </div>
                <div style={{fontSize:10,fontFamily:"Space Mono,monospace",color: syncing ? COLORS.amber : COLORS.green}}>
                  {syncing ? "● Syncing…" : "● Cloud sync"}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); signOut(); }}
                style={{fontSize:10,color:COLORS.textDim,cursor:"pointer",padding:"2px 6px",borderRadius:4,
                  border:`1px solid ${COLORS.border}`,background:"transparent",fontFamily:"Space Mono,monospace",
                  transition:"all 0.15s",flexShrink:0}}
                onMouseEnter={e=>{e.target.style.color=COLORS.red;e.target.style.borderColor=COLORS.redDim;}}
                onMouseLeave={e=>{e.target.style.color=COLORS.textDim;e.target.style.borderColor=COLORS.border;}}>
                Sign out
              </button>
            </div>
          )}

          {/* Theme toggle — always visible */}
          <div style={{display:"flex",alignItems:"center",gap:4,padding:"8px 12px",borderTop:`1px solid ${COLORS.border}`}}>
            <span style={{fontSize:10,color:COLORS.textDim,fontFamily:"Space Mono,monospace",marginRight:4,whiteSpace:"nowrap"}}>Theme</span>
            {[
              { id:"auto",  label:"Auto" },
              { id:"dark",  label:"🌙"   },
              { id:"light", label:"☀️"   },
            ].map(opt => {
              const isActive = opt.id === "auto"
                ? !localStorage.getItem("wos-theme")
                : theme === opt.id && localStorage.getItem("wos-theme") === opt.id;
              return (
                <button key={opt.id}
                  onClick={() => opt.id === "auto" ? resetToSystem() : setTheme(opt.id)}
                  style={{
                    flex:1, padding:"4px 0", border:`1px solid ${isActive ? COLORS.accent : COLORS.border}`,
                    borderRadius:5, background: isActive ? COLORS.accentBg : "transparent",
                    color: isActive ? COLORS.accent : COLORS.textDim,
                    fontSize:11, cursor:"pointer", fontFamily:"Space Mono,monospace",
                    transition:"all 0.15s",
                  }}>
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* ── Sidebar Footer ─────────────────────────────── */}
          <div className="sidebar-footer">

            {/* Buy Me a Coffee */}
            <div style={{marginBottom:12,display:"flex",justifyContent:"center"}}>
              <a href="https://www.buymeacoffee.com/davidwos" target="_blank" rel="noreferrer"
                style={{display:"inline-flex",alignItems:"center",gap:8,padding:"7px 14px",
                  borderRadius:8,background:"#FFDD00",color:"#000",fontWeight:700,
                  fontSize:12,textDecoration:"none",fontFamily:"Inter,Syne,sans-serif",
                  border:"1px solid #000",whiteSpace:"nowrap",transition:"opacity 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                <span style={{fontSize:16}}>☕</span> Buy me a coffee
              </a>
            </div>

            {/* Support prompt */}
            <div style={{textAlign:"center",marginBottom:10,fontSize:10,lineHeight:1.5,color:COLORS.textSec}}>
              If you'd like to support this project,<br/>
              my Player ID is{" "}
              <span style={{fontFamily:"Space Mono,monospace",color:COLORS.textPri,fontWeight:700,
                letterSpacing:"0.5px"}}>423094419</span>.
            </div>

            {/* Divider */}
            <div style={{borderTop:`1px solid ${COLORS.border}`,margin:"10px 0"}}/>

            {/* Copyright */}
            <div style={{textAlign:"center",marginBottom:6,fontSize:10,color:COLORS.textDim,
              fontFamily:"Space Mono,monospace",letterSpacing:"0.3px"}}>
              © {new Date().getFullYear()} The Tundra Command — All rights reserved.
            </div>

            {/* Disclaimer */}
            <div style={{textAlign:"center",fontSize:9,color:COLORS.textDim,lineHeight:1.5}}>
              Fan-made resource. Not affiliated with, endorsed by, or linked to Century Games
              or the developers of Whiteout Survival. All game-related assets, imagery, and
              trademarks are the sole copyright of their respective owners.
            </div>

          </div>
        </aside>

        <main className="main">
          <div className="page-header">
            <div className="page-header-row">
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {/* Hamburger — mobile only */}
                <div className="hamburger" onClick={() => setSidebarOpen(s => !s)}>
                  <span/><span/><span/>
                </div>
                <div>
                  <div className="page-title">
                    {title.split(" ").map((w,i) => i===0
                      ? <span key={i}>{w} </span>
                      : <span key={i} style={{color:COLORS.accent}}>{w} </span>)}
                  </div>
                  <div className="page-sub">
                    {loadedPlanKey ? `Editing saved plan: ${loadedPlanKey}` : sub}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {user && activeCharacter && (
                  <div style={{fontSize:11,fontFamily:"Space Mono,monospace",color:"var(--c-textPri)"}}>
                    {activeCharacter.alliance ? `[${activeCharacter.alliance}] ` : ""}
                    {activeCharacter.name}
                    {activeCharacter.state_number ? ` · State ${activeCharacter.state_number}` : ""}
                  </div>
                )}
                {user && (
                  <button onClick={() => setReportIssueOpen(true)}
                    style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap",
                      background:"transparent",color:COLORS.red,
                      border:`1px solid ${COLORS.redDim}`,transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=COLORS.redBg;}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                    🚩 Report Issue
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Incomplete profile notification */}
          {user && activeCharacter && (!activeCharacter.state_number || !activeCharacter.alliance) && (
            <div style={{
              padding:"10px 20px",
              background:COLORS.amberBg,
              borderBottom:`1px solid ${COLORS.amber}40`,
              display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:14}}>⚠️</span>
                <span style={{fontSize:12,color:COLORS.amber,fontWeight:600}}>
                  Your character profile is incomplete —
                  {!activeCharacter.state_number && !activeCharacter.alliance
                    ? " State and Alliance are not set."
                    : !activeCharacter.state_number
                    ? " State number is not set."
                    : " Alliance tag is not set."}
                  {" "}Please update your character to help others identify you.
                </span>
              </div>
              <button
                onClick={() => setProfileOpen(true)}
                style={{
                  padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",
                  fontFamily:"Syne,sans-serif",border:`1px solid ${COLORS.amber}`,
                  background:"transparent",color:COLORS.amber,whiteSpace:"nowrap",flexShrink:0,
                }}>
                Update Profile
              </button>
            </div>
          )}

          <div className="page-body">
            {page === "inventory"    && <InventoryPage    inv={inv} setInv={setInv} />}
            {page === "construction" && <ConstructionPlanner inv={inv} setInv={setInv}
                planSnapshot={planSnapshot}
                onSetSnapshot={handleSetSnapshot}
                onUpdatePlan={handleUpdatePlan}
                cpSpeedBuff={cpSpeedBuff} setCpSpeedBuff={setCpSpeedBuff} />}
            {page === "rfc-planner"  && <RFCPlanner inv={inv} setInv={setInv}
                savedPlans={user ? savedPlans : {}}
                onSavePlan={user ? handleSavePlan : ()=>{}}
                onLoadPlan={handleLoadPlan}
                openSavePopup={user ? openSavePopup : null}
                currentUser={user} />}
            {page === "heroes"      && <HeroesPage    genFilter={genFilter} setGenFilter={setGenFilter} heroStats={heroStats} setHeroStats={setHeroStats} currentUser={user} activeCharacter={activeCharacter} hgHeroes={hgHeroes} heroStatsVersion={heroStatsVersion} />}
            {page === "admin"       && user?.id === ADMIN_UID && <AdminPage onStatsUpdated={() => setHeroStatsVersion(v => v + 1)} />}
            {page === "hero-gear"    && <HeroGearPage    inv={inv} genFilter={genFilter} setGenFilter={setGenFilter} heroStats={heroStats} setHeroStats={setHeroStats} hgHeroes={hgHeroes} setHgHeroes={setHgHeroes} />}
            {page === "troops"       && <TroopsPage />}
            {page === "chief-gear"   && <ChiefGearPage   inv={inv} />}
            {page === "chief-charms" && <ChiefCharmsPage inv={inv} />}
            {page === "experts"      && <ExpertsPage      inv={inv} setInv={setInv} />}
            {page === "daybreak-island" && <DaybreakIslandPage />}
            {page === "war-academy"  && <WarAcademyPage   inv={inv} setInv={setInv} />}
            {page === "research-center" && <ResearchCenterPage inv={inv} rcLevels={rcLevels} setRcLevels={setRcLevels} rcCollapse={rcCollapse} setRcCollapse={setRcCollapse} />}
            {page === "svs-calendar" && <SvSCalendar />}
            {page === "char-profile" && <CharacterProfilePage hgHeroes={hgHeroes} inv={inv}
                rcLevels={rcLevels} profileVersion={profileVersion}
                cpSpeedBuff={cpSpeedBuff} setCpSpeedBuff={setCpSpeedBuff} />}
          </div>
        </main>
      </div>
    </>
  );
}
