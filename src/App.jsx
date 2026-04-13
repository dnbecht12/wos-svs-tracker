import React, { useState, useEffect, useCallback, useRef, useMemo, Component } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./supabase.js";

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

// Fetch current hero_stats_data row for matching hero/level/stars/widget
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
    const { data: newRow } = await supabase.from("hero_stats_data")
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
import ConstructionPlanner from "./ConstructionPlanner.jsx";
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
    accent:    "#e36b1a",
    accentDim: "#7d3a0d",
    accentBg:  "#1a1008",
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
    textSec:   "#8b949e",
    textDim:   "#484f58",
    hover:     "rgba(255,255,255,0.04)",
    btnText:   "#0a0c10",
  },
  light: {
    bg:        "#f4f5f7",
    surface:   "#ffffff",
    card:      "#ffffff",
    border:    "#d0d7de",
    borderHi:  "#afb8c1",
    accent:    "#c85a0f",
    accentDim: "#e36b1a",
    accentBg:  "#fdf0e8",
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
// Determine guest status synchronously before any component mounts.
// Supabase persists the session in localStorage — if it exists, user is logged in.
let _isGuest = (() => {
  try {
    const keys = Object.keys(localStorage);
    const hasSession = keys.some(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
    return !hasSession;
  } catch { return true; }
})();
function setGuestFlag(isGuest) { _isGuest = isGuest; }

function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const store = _isGuest ? sessionStorage : localStorage;
      const s = store.getItem(key);
      return s ? JSON.parse(s) : initial;
    } catch { return initial; }
  });
  const set = useCallback(v => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      try {
        const store = _isGuest ? sessionStorage : localStorage;
        store.setItem(key, JSON.stringify(next));
      } catch {}
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
  { name:"Walis Bokan",type:"Lancer",   gen:"Base",  quality:"SR"  },
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
  "Walis Bokan":{stars:4.2, level:80, widget:0,  levelPower:149280,  starPower:488320,  skillPower:67680,  gearStrength:null,   heroAtk:1449,  heroDef:1812,  heroHp:14496,  escorts:10, troopCap:13470, escortHp:4832,  escortDef:604,  escortAtk:483,  infAtk:1.0977, infDef:1.0977, infLeth:0,     infHp:0},
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
"Walis Bokan":{"expS1":{"name":"Earthshake","desc":"Walis Bokan lets out an intimidating war cry, reducing Attack by [1% / 2% / 3% / 4% / 5%] for all enemy troops for 2s."},"expS2":{"name":"Echoing Boost","desc":"Beyond intimidating enemies, Walis Bokan's war cry invigorates allies. Upon casting Earthshake, increases his and nearby friendly troops' Attack by [15% / 20% / 25% / 30% / 35%] for 2s."},"expS3":{"name":"Jungle-Born Agility","desc":"Years of fighting in the jungles and mountains grant Walis Bokan swift agility, increasing his Attack Speed by [10% / 15% / 20% / 25% / 30%]."},"expdS1":{"name":"Tactical Deception","desc":"With Walis Bokan's expert guerrilla tactics, all enemy troops' damage dealt is reduced by [4% / 8% / 12% / 16% / 20%]."},"expdS2":{"name":"","desc":""},"expdS3":{"name":"Huntsman's Gift","desc":"Walis Bokan passes on the islander's hunting techniques to the soldiers, increasing Hunting (Wilderness) March Speed by [20% / 40% / 60% / 80% / 100%]."}},
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
      status:       "Legendary", // Gear Status (slots 1-4 only)
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

function HeroProfileModal({ hero, stats, onUpdate, onClose, currentUser, activeCharacter, hgHeroes }) {
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
  const heroLevel  = (stats && stats.level)  ?? 0;
  const heroStars  = (stats && stats.stars)  ?? 0;
  const heroWidget = (stats && stats.widget) ?? 0;
  useEffect(() => {
    if (!hero) return;
    setDbRef(null);
    setDbRefLoading(true);
    const widget = isSSRHero(hero.name) ? heroWidget : null;
    const q = supabase.from("hero_stats_data")
      .select("*")
      .eq("hero_name", hero.name)
      .eq("level", heroLevel)
      .eq("stars", heroStars)
      .eq("is_current", true);
    if (widget === null) q.is("widget", null);
    else q.eq("widget", widget);
    q.maybeSingle().then(({ data, error }) => {
      setDbRef(data || null);
      setDbRefLoading(false);
    });
  }, [hero?.name, heroLevel, heroStars, heroWidget]);

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
        <button onClick={() => setShowSubmit(true)}
          style={{marginTop:8,padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,
            cursor:"pointer",fontFamily:"Syne,sans-serif",border:`1px solid ${C.amber}`,
            background:"transparent",color:C.amber,
            display: subBlocked ? "none" : "inline-block"}}>
          📤 Submit My Stats
        </button>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    const statsPayload = {};
    Object.entries(submitForm).forEach(([k,v]) => { if (v !== "") statsPayload[k] = parseFloat(v) || 0; });
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
    if (ok) { setSubmitDone(true); setShowSubmit(false); setBaseStatsConfirmed(false); }
  };

  const NumField = ({ label, field }) => {
    const [local, setLocal] = React.useState(submitForm[field] ?? "");
    const inputRef = React.useRef(null);
    React.useEffect(() => { setLocal(submitForm[field] ?? ""); }, [field]);
    return (
      <div onMouseDown={e => { e.stopPropagation(); inputRef.current?.focus(); }}>
        <div style={{fontSize:11,color:C.textSec,marginBottom:3}}>{label}</div>
        <input ref={inputRef} type="number" min={0} step="any"
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={e => setSubmitForm(p => ({...p,[field]:e.target.value}))}
          onFocus={e => e.target.select()}
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
        boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>

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
                    width:"100%",maxWidth:380,maxHeight:"85vh",overflowY:"auto",padding:"20px 18px"}}>
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
                    width:"100%",maxWidth:620,maxHeight:"85vh",overflowY:"auto",padding:"18px 16px"}}>
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
            <div style={{marginTop:16,padding:"16px 18px",background:C.surface,
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
                color:C.textDim,marginBottom:8,fontFamily:"'Space Mono',monospace"}}>Widget Stats</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                <NumField label="Hero Attack"    field="wgtHeroAtk" />
                <NumField label="Hero Defense"   field="wgtHeroDef" />
                <NumField label="Hero Health"    field="wgtHeroHp" />
                <NumField label="Escort Attack"  field="wgtEscortAtk" />
                <NumField label="Escort Defense" field="wgtEscortDef" />
                <NumField label="Escort Health"  field="wgtEscortHp" />
                <NumField label="Troop Lethality" field="wgtTroopLeth" />
                <NumField label="Troop Health"   field="wgtTroopHp" />
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
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                <NumField label={`${hero.type} Attack`}    field="infAtk" />
                <NumField label={`${hero.type} Defense`}   field="infDef" />
                <NumField label={`${hero.type} Lethality`} field="infLeth" />
                <NumField label={`${hero.type} Health`}    field="infHp" />
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
                  <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:14,
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

// ─── Admin Page ──────────────────────────────────────────────────────────────

function AdminPage() {
  const C = COLORS;
  const [submissions,   setSubmissions]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [note,          setNote]          = useState({});
  const [busy,          setBusy]          = useState({});
  const [validating,    setValidating]    = useState(null); // {sub, existing, diffs}
  const [reviewedOpen,  setReviewedOpen]  = useState(false);

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

  useEffect(() => { load(); }, []);

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
    "infAtk","infDef","infLeth","infHp"];

  const statLabel = k => ({
    levelPower:"Level Power", starPower:"Star Power", skillPower:"Skill Power",
    gearStrength:"Gear Strength", escorts:"Escorts", troopCap:"Troop Cap",
    heroAtk:"Hero Atk", heroDef:"Hero Def", heroHp:"Hero HP",
    escortHp:"Escort HP", escortDef:"Escort Def", escortAtk:"Escort Atk",
    infAtk:"Troop Atk%", infDef:"Troop Def%", infLeth:"Troop Leth%", infHp:"Troop HP%",
  }[k] || k);

  const statusColor = s => s==="accepted" ? C.green : s==="rejected" ? C.red : C.amber;

  return (
    <div className="fade-in" style={{maxWidth:900}}>
      <div className="page-title">Admin <span style={{color:C.accent}}>Panel</span></div>
      <div className="page-sub" style={{marginBottom:20}}>Hero stat submissions pending review</div>

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
          return (
            <div style={{background:C.card,
              border:"1px solid " + (isPending ? C.amber+"60" : sub.status==="accepted" ? C.green+"30" : C.red+"30"),
              borderRadius:12,padding:"18px 20px",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:12}}>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:C.textPri}}>{sub.hero_name}</div>
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
                  statKeys.filter(k => stats[k] != null).map(k => (
                    <div key={k} style={{background:C.surface,borderRadius:6,padding:"6px 10px",fontSize:11}}>
                      <span style={{color:C.textDim,fontFamily:"Space Mono,monospace"}}>{statLabel(k)}</span>
                      <span style={{color:C.textPri,fontWeight:700,fontFamily:"Space Mono,monospace",float:"right"}}>{stats[k]}</span>
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
                {reviewedOpen && reviewed.map(sub => <SubCard key={sub.id} sub={sub} showActions={false} />)}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

function HeroesPage({ genFilter, setGenFilter, heroStats, setHeroStats, currentUser, activeCharacter, hgHeroes }) {
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

  const updateStat = (heroName, field, value) => {
    setHeroStats(prev => ({
      ...prev,
      [heroName]: { ...(prev[heroName] || defaultHeroStats()), [field]: value },
    }));
  };

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
  const HeroRow = ({ hero, isFav }) => {
    const stats = heroStats[hero.name] || defaultHeroStats();
    const isFavorited = favorites.includes(hero.name);
    return (
      <tr key={hero.name} style={{background: isFav ? `rgba(227,107,26,0.04)` : "transparent"}}>
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
          <select value={stats.widget} onChange={e => updateStat(hero.name,"widget",Number(e.target.value))} style={sel}>
            {widgetOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
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
                {favHeroes.map(hero => <HeroRow key={hero.name} hero={hero} isFav={true} />)}
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
              {sorted.map(hero => <HeroRow key={hero.name} hero={hero} isFav={false} />)}
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

          // If setting gearCurrent, auto-bump gearGoal up if needed (locked slots)
          if (field === "gearCurrent" && locked) {
            if ((updated.gearGoal ?? 0) < value) updated.gearGoal = value;
          }
          // If setting masteryCurrent (non-widget, legendary), auto-bump masteryGoal
          if (field === "masteryCurrent" && isLegendary && !isWidget) {
            if ((updated.masteryGoal ?? 0) < value) updated.masteryGoal = value;
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
          // If switching from Mythic to Legendary, enforce floor immediately
          if (field === "status" && value === "Legendary") {
            if ((updated.gearGoal ?? 0) < (updated.gearCurrent ?? 0))
              updated.gearGoal = updated.gearCurrent ?? 0;
            if ((updated.masteryGoal ?? 0) < (updated.masteryCurrent ?? 0))
              updated.masteryGoal = updated.masteryCurrent ?? 0;
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
                <th style={{...thStyle,textAlign:"center"}} colSpan={2}>Goal</th>
                <th style={{...thStyle,textAlign:"right"}}>Stones</th>
                <th style={{...thStyle,textAlign:"right"}}>Mithril</th>
                <th style={{...thStyle,textAlign:"right"}}>Mythic Needed</th>
                <th style={{...thStyle,textAlign:"right"}}>SVS PTS</th>
              </tr>
              <tr>
                <th style={{...thStyle,paddingTop:2,paddingBottom:6}} colSpan={4}/>
                <th style={{...thStyle,paddingTop:2,paddingBottom:6,textAlign:"center",color:C.textDim,fontSize:9}}>Gear Lvl</th>
                <th style={{...thStyle,paddingTop:2,paddingBottom:6,textAlign:"center",color:C.textDim,fontSize:9}}>Mastery Lvl</th>
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
                      const widgetChanged  = isWidget && (heroStatsForSlot.widget ?? 0) !== (s.widgetGoal ?? 0);
                      if (!gearChanged && !masteryChanged && !widgetChanged) return null;

                      // Calculate current and goal stats using GearData lookup
                      const gearName = !isWidget ? SLOT_TO_GEAR(slot.type, gearSlot) : null;
                      const tier = s.status || "Legendary";
                      const curLv  = s.gearCurrent  ?? 0;
                      const goalLv = s.gearGoal      ?? 0;
                      const curM   = s.masteryCurrent ?? 0;
                      const goalM  = s.masteryGoal    ?? 0;

                      const STAT_LABELS = ["Gear Pwr", GEAR_TYPE[gearName]==="ATK" ? "Hero Atk" : "Hero Def", "Hero HP", GEAR_TYPE[gearName]==="ATK" ? "Esc Atk" : "Esc Def", "Esc HP", GEAR_TYPE[gearName]==="ATK" ? "Trp Leth" : "Trp HP", "Trp Mast"];
                      const tdStat = {padding:"4px 8px",fontSize:10,fontFamily:"'Space Mono',monospace",borderRight:`1px solid ${C.border}`,textAlign:"center"};

                      const curStats  = gearName ? getGearStats(gearName, tier, curLv,  curM)  : null;
                      const goalStats = gearName ? getGearStats(gearName, tier, goalLv, goalM) : null;

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
  .sidebar-logo { padding: 28px 20px 16px; border-bottom: 1px solid var(--c-border); }
  .sidebar-logo .wos { font-family: 'Space Mono', monospace; font-size: 11px; color: var(--c-accent); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 2px; }
  .sidebar-logo h1 { font-size: 15px; font-weight: 800; color: var(--c-textPri); line-height: 1.2; }
  .sidebar-logo h1 span { color: var(--c-accent); }
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
  .btn-accent:hover { background: #f07d2e; border-color: #f07d2e; }
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

  const tabs = [
    { id:"characters", label:"Characters" },
    { id:"account",    label:"Account"    },
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
                transition:"all 0.15s",marginBottom:-1}}>
              {t.label}
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
                <div className="modal-section-title">My Submissions</div>
                {subsLoading && <div style={{fontSize:12,color:C.textDim,fontFamily:"Space Mono,monospace"}}>Loading…</div>}
                {!subsLoading && mySubs.length === 0 && (
                  <div style={{fontSize:12,color:C.textDim,fontFamily:"Space Mono,monospace"}}>No submissions yet.</div>
                )}
                {!subsLoading && mySubs.length > 0 && (() => {
                  const pending  = mySubs.filter(s => !s.status || s.status === "pending" || s.status === "rejected");
                  const approved = mySubs.filter(s => s.status === "accepted");

                  const SubCard = ({ sub, readOnly }) => {
                    const status = sub.status || "pending";
                    const statusColor = status === "accepted" ? C.green : status === "rejected" ? C.red : C.amber;
                    const statusBg    = status === "accepted" ? C.greenBg : status === "rejected" ? C.redBg : C.amberBg;
                    return (
                      <div style={{background:C.surface,border:`1px solid ${C.border}`,
                        borderRadius:8,padding:"10px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:13,fontWeight:700,color:C.textPri}}>{sub.hero_name}</span>
                          <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,
                            background:statusBg,color:statusColor,border:`1px solid ${statusColor}40`,
                            fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>
                            {status}
                          </span>
                        </div>
                        <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace"}}>
                          Stars: {sub.stars} · Level: {sub.level} · Widget: {sub.widget ?? "N/A"}
                        </div>
                        <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace"}}>
                          Submitted: {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "—"}
                        </div>
                        {status === "rejected" && sub.admin_note && (
                          <div style={{marginTop:6,fontSize:11,color:C.red,
                            background:C.redBg,borderRadius:5,padding:"5px 8px",fontFamily:"Space Mono,monospace"}}>
                            Note: {sub.admin_note}
                          </div>
                        )}
                        {readOnly && (
                          <div style={{marginTop:5,fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace",fontStyle:"italic"}}>
                            View only — approved stats cannot be edited.
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div style={{display:"flex",flexDirection:"column",gap:16}}>
                      {pending.length > 0 && (
                        <div>
                          <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
                            color:C.textSec,fontFamily:"Space Mono,monospace",marginBottom:8}}>
                            Pending / Rejected
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:8}}>
                            {pending.map(sub => <SubCard key={sub.id} sub={sub} readOnly={false} />)}
                          </div>
                        </div>
                      )}
                      {approved.length > 0 && (
                        <div>
                          <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
                            color:C.green,fontFamily:"Space Mono,monospace",marginBottom:8}}>
                            Approved
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:8}}>
                            {approved.map(sub => <SubCard key={sub.id} sub={sub} readOnly={true} />)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
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

// Speed-up input: Days / Hours / Minutes with total display
// Uses local state to buffer keystrokes — only commits to parent on blur
function SpeedupInput({ label, icon, dField, hField, mField, dVal, hVal, mVal, onChange, color, tabIndexBase }) {
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

  const numStyle = {
    background:"var(--c-card)",border:"1px solid var(--c-border)",borderRadius:5,
    padding:"5px 8px",fontSize:13,color:color||"var(--c-textPri)",outline:"none",
    fontFamily:"Space Mono,monospace",width:64,textAlign:"right",fontWeight:700,
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
      <input type="number" min={0} style={numStyle} tabIndex={tabIndexBase}
        value={localD}
        onChange={e=>setLocalD(Math.max(0,parseInt(e.target.value)||0))}
        onBlur={()=>onChange(dField,localD)}
        onFocus={e=>e.target.select()} />
      <span style={sepStyle}>d</span>
      <input type="number" min={0} max={23} style={numStyle} tabIndex={tabIndexBase+1}
        value={localH}
        onChange={e=>setLocalH(Math.max(0,parseInt(e.target.value)||0))}
        onBlur={()=>onChange(hField,localH)}
        onFocus={e=>e.target.select()} />
      <span style={sepStyle}>h</span>
      <input type="number" min={0} max={59} style={numStyle} tabIndex={tabIndexBase+2}
        value={localM}
        onChange={e=>setLocalM(Math.max(0,parseInt(e.target.value)||0))}
        onBlur={()=>onChange(mField,localM)}
        onFocus={e=>e.target.select()} />
      <span style={sepStyle}>m</span>
      <span style={{fontSize:12,fontFamily:"Space Mono,monospace",marginLeft:8,minWidth:70,flexShrink:0,
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
          <div style={{fontSize:9,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--c-textSec)",fontFamily:"Space Mono,monospace",marginBottom:2}}>Speed-ups (Days · Hours · Minutes)</div>
          <SpeedupInput label="General"        icon="GN" dField="speedGenD"      hField="speedGenH"      mField="speedGenM"      dVal={inv.speedGenD}      hVal={inv.speedGenH}      mVal={inv.speedGenM}      onChange={update} color={COLORS.blue}   tabIndexBase={33} />
          <SpeedupInput label="Troop Training" icon="TR" dField="speedTroopD"    hField="speedTroopH"    mField="speedTroopM"    dVal={inv.speedTroopD}    hVal={inv.speedTroopH}    mVal={inv.speedTroopM}    onChange={update} color={COLORS.green}  tabIndexBase={36} />
          <SpeedupInput label="Construction"   icon="CN" dField="speedConstD"    hField="speedConstH"    mField="speedConstM"    dVal={inv.speedConstD}    hVal={inv.speedConstH}    mVal={inv.speedConstM}    onChange={update} color={COLORS.accent} tabIndexBase={39} />
          <SpeedupInput label="Research"       icon="RS" dField="speedResearchD" hField="speedResearchH" mField="speedResearchM" dVal={inv.speedResearchD} hVal={inv.speedResearchH} mVal={inv.speedResearchM} onChange={update} color={COLORS.amber}  tabIndexBase={42} />
          <SpeedupInput label="Learning"       icon="LN" dField="speedLearningD" hField="speedLearningH" mField="speedLearningM" dVal={inv.speedLearningD} hVal={inv.speedLearningH} mVal={inv.speedLearningM} onChange={update} color={COLORS.blue}   tabIndexBase={45} />
          <SpeedupInput label="Healing"        icon="HL" dField="speedHealingD"  hField="speedHealingH"  mField="speedHealingM"  dVal={inv.speedHealingD}  hVal={inv.speedHealingH}  mVal={inv.speedHealingM}  onChange={update} color={COLORS.green}  tabIndexBase={48} />
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

function ExpertsPage({ inv }) {
  return (
    <div className="fade-in">
      <div className="stat-grid">
        <StatCard label="General Sigils" value={inv.generalSigils} sub="available" color="accent" />
        <StatCard label="Books" value={inv.books} sub="available" color="accent" />
        <StatCard label="SVS pts (experts)" value={25700} sub="Tue+Wed total" />
        <StatCard label="Valeria bonus" value="18%" sub="point skill" />
      </div>
      <div className="expert-grid">
        {EXPERTS.map(e => (
          <div className="expert-card" key={e.name}>
            <div className="expert-head">
              <div className="expert-avatar">{e.name.slice(0,2).toUpperCase()}</div>
              <div>
                <div className="expert-name">{e.name}</div>
                <div className="expert-bonus">{e.bonus}</div>
              </div>
              <div style={{marginLeft:"auto"}}>
                <span className={`badge ${e.level >= 90 ? "badge-green" : e.level > 0 ? "badge-blue" : "badge-accent"}`}>
                  Lv {e.level}
                </span>
              </div>
            </div>
            <div className="expert-body">
              <div className="expert-row">
                <span>Current sigils</span>
                <span className="expert-val">{e.sigils}</span>
              </div>
              <div className="expert-row">
                <span>Books needed</span>
                <span className="expert-val" style={{color: e.booksNeeded > inv.books ? COLORS.red : COLORS.green}}>
                  {e.booksNeeded > 0 ? fmtFull(e.booksNeeded) : "MAX"}
                </span>
              </div>
              <div className="expert-row">
                <span>Sigils needed</span>
                <span className="expert-val" style={{color: e.sigilsNeeded > inv.generalSigils ? COLORS.red : COLORS.green}}>
                  {e.sigilsNeeded > 0 ? fmtFull(e.sigilsNeeded) : "MAX"}
                </span>
              </div>
              <div className="expert-row">
                <span>SVS day</span>
                <span className="expert-val" style={{color: e.sigilsNeeded > 0 ? COLORS.amber : COLORS.textDim}}>
                  {e.sigilsNeeded > 0 ? "Tue/Wed" : "—"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WarAcademyPage({ inv }) {
  const waSkills = [
    { id:1,  name:"Flame Squad",       desc:"Deployment Cap",              inf:[5,5],  mks:[5,5],  lan:[5,5]  },
    { id:2,  name:"Lethality",         desc:"",                             inf:[8,8],  mks:[8,8],  lan:[8,8]  },
    { id:3,  name:"Health",            desc:"",                             inf:[8,8],  mks:[8,8],  lan:[8,8]  },
    { id:4,  name:"Flame Legion",      desc:"Rally Cap",                    inf:[12,12],mks:[12,12],lan:[12,12] },
    { id:5,  name:"Attack",            desc:"",                             inf:[12,12],mks:[12,12],lan:[12,12] },
    { id:6,  name:"Defense",           desc:"",                             inf:[12,12],mks:[12,12],lan:[12,12] },
    { id:7,  name:"Helios",            desc:"",                             inf:[1,1],  mks:[1,1],  lan:[1,1]  },
    { id:8,  name:"Helios Training",   desc:"Training Cost + Deployment",   inf:[6,6],  mks:[5,6],  lan:[5,6]  },
    { id:9,  name:"Helios Healing",    desc:"Healing Cost + Attack",        inf:[7,7],  mks:[7,7],  lan:[5,5]  },
    { id:10, name:"Helios First Aid",  desc:"Healing Time + Defense",       inf:[7,7],  mks:[7,7],  lan:[7,7]  },
  ];

  // Shards needed for Helios Training upgrade
  const shardsNeeded = 918;
  const shardsBalance = inv.shards - shardsNeeded;
  // daily shards accumulation
  const dailyShards = inv.dailyIntel ?? 0;
  const daysToGoal = shardsBalance < 0 ? Math.ceil(Math.abs(shardsBalance) / dailyShards) : 0;

  return (
    <div className="fade-in">
      <div className="stat-grid">
        <StatCard label="Shards" value={inv.shards} sub={`+${Math.round(dailyShards)}/day`} color="accent" />
        <StatCard label="Steel" value={inv.steel} sub="current inventory" />
        <StatCard label="Shards needed" value={shardsNeeded} sub="all pending upgrades" />
        <StatCard label="Shards balance" value={shardsBalance} sub={daysToGoal > 0 ? `${daysToGoal} days to goal` : "sufficient"} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16, marginBottom:24 }}>
        {["Infantry","Marksman","Lancer"].map((troop, ti) => {
          const key = ["inf","mks","lan"][ti];
          return (
            <div className="card" key={troop}>
              <div className="card-header">
                <div className="card-title">{troop}</div>
                <span className="badge badge-blue">{troop.slice(0,3).toUpperCase()}</span>
              </div>
              <div className="card-body" style={{padding:0}}>
                <table style={{width:"100%"}}>
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th style={{textAlign:"center"}}>Cur</th>
                      <th style={{textAlign:"center"}}>Goal</th>
                      <th style={{textAlign:"center"}}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waSkills.map(s => {
                      const [cur, goal] = s[key];
                      const done = cur >= goal;
                      return (
                        <tr key={s.id}>
                          <td className="pri" style={{fontSize:12}}>{s.name}</td>
                          <td className="mono" style={{textAlign:"center"}}>{cur}</td>
                          <td className="mono" style={{textAlign:"center"}}>{goal}</td>
                          <td style={{textAlign:"center"}}>
                            {done
                              ? <span className="badge badge-green" style={{fontSize:10}}>DONE</span>
                              : <span className="badge badge-amber" style={{fontSize:10}}>PENDING</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



// ─── Chief Gear Data ─────────────────────────────────────────────────────────
// [step, label, plans, polish, alloy, amber, power, atkDef, deploy]
// power/atkDef = null means TBD
const CHIEF_GEAR_LEVELS = [
  [1,  "UC1★",   0,   40,  3800,  0,       null,   null,  0],
  [2,  "R",       0,   70,  7000,  0,       null,   null,  0],
  [3,  "R1★",    0,   95,  9700,  0,       null,   null,  0],
  [4,  "R2★",   45,    0,     0,  0,       null,   null,  0],
  [5,  "R3★",   50,    0,     0,  0,       null,   null,  0],
  [6,  "E",      60,    0,     0,  0,     816000,  0.34,   0],
  [7,  "E1★",   70,    0,     0,  0,       null,   null,  0],
  [8,  "E2★",   40,   65,  6500,  0,       null,   null,  0],
  [9,  "E3★",   50,   80,  8000,  0,       null,   null,  0],
  [10, "ET1",    60,   95, 10000,  0,    1093440, 0.4556,  0],
  [11, "ET1 1★",70,  110, 11000,  0,    1162800, 0.4845,  0],
  [12, "ET1 2★",85,  130, 13000,  0,    1232160, 0.5134,  0],
  [13, "ET1 3★",100, 160, 15000,  0,    1301520, 0.5423,  0],
  [14, "M",      40,  220, 22000,  0,       null,   null,  0],
  [15, "M1★",   40,  230, 23000,  0,       null,   null,  0],
  [16, "M2★",   45,  250, 25000,  0,       null,   null,  0],
  [17, "M3★",   45,  260, 26000,  0,    1546320, 0.6443,  0],
  [18, "MT1",    45,  280, 28000,  0,    1607520, 0.6698,  0],
  [19, "MT1 1★",55,  300, 30000,  0,    1668720, 0.6953,  0],
  [20, "MT1 2★",55,  320, 32000,  0,    1729920, 0.7208,  0],
  [21, "MT1 3★",55,  340, 35000,  0,    1791120, 0.7463,  0],
  [22, "MT2",    55,  390, 38000,  0,    1852320, 0.7718,  0],
  [23, "MT2 1★",75,  430, 43000,  0,    1913520, 0.7973,  0],
  [24, "MT2 2★",80,  460, 45000,  0,    1974720, 0.8228,  0],
  [25, "MT2 3★",85,  500, 48000,  0,    2035920, 0.8483,  0],
  [26, "L",      85,  530, 50000, 10,    2142000, 0.8925, 40],
  [27, "L+1",    90,  560, 52000, 10,    2244000, 0.935,  80],
  [28, "L+2",    95,  590, 54000, 10,    2346000, 0.9775,120],
  [29, "L+3",   100,  620, 56000, 10,    2448000, 1.02,  160],
  [30, "LT1",   110,  670, 59000, 15,    2550000, 1.0625,290],
  [31, "LT1+1", 115,  700, 61000, 15,    2652000, 1.105, 330],
  [32, "LT1+2", 120,  730, 63000, 15,    2754000, 1.1475,370],
  [33, "LT1+3", 125,  760, 65000, 15,    2856000, 1.19,  410],
  [34, "LT2",   135,  810, 68000, 20,    2958000, 1.2325,540],
  [35, "LT2+1", 140,  840, 70000, 20,    3060000, 1.275, 580],
  [36, "LT2+2", 145,  870, 72000, 20,    3162000, 1.3175,620],
  [37, "LT2+3", 150,  900, 74000, 20,    3264000, 1.36,  660],
  [38, "LT3",   160,  950, 77000, 25,    3366000, 1.4025,790],
  [39, "LT3+1", 165,  990, 80000, 25,    3468000, 1.445, 830],
  [40, "LT3+2", 170, 1030, 83000, 25,    3570000, 1.4875,870],
  [41, "LT3+3", 180, 1070, 86000, 25,    3672000, 1.53,  910],
  [42, "LT4",   180, 1070, 86000, 25,    3876000, 1.615,1050],
  [43, "LT4+1", 180, 1070, 86000, 25,    4080000, 1.70, 1100],
  [44, "LT4+2", 180, 1070, 86000, 25,    4284000, 1.785,1150],
  [45, "LT4+3", 180, 1070, 86000, 25,    4488000, 1.87, 1200],
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

// ─── Chief Gear Pieces ───────────────────────────────────────────────────────
const CHIEF_GEAR_PIECES = [
  { name:"Cap",    troop:"Lancer"   },
  { name:"Watch",  troop:"Lancer"   },
  { name:"Coat",   troop:"Infantry" },
  { name:"Pants",  troop:"Infantry" },
  { name:"Belt",   troop:"Marksman" },
  { name:"Weapon", troop:"Marksman" },
];

function defaultChiefGearSlots() {
  return CHIEF_GEAR_PIECES.map(p => ({ piece: p.name, current: 0, goal: 0 }));
}

// ─── Chief Gear Page ─────────────────────────────────────────────────────────
function ChiefGearPage({ inv }) {
  const C = COLORS;
  const sel = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
    color:C.textPri, padding:"4px 6px", fontSize:11, outline:"none" };
  const [slots, setSlots] = useLocalStorage("cg-slots", defaultChiefGearSlots());

  const setSlotField = (idx, field, val) => {
    setSlots(prev => prev.map((s,i) => {
      if (i !== idx) return s;
      const updated = { ...s, [field]: val };
      if (field === "current" && val > updated.goal) updated.goal = val;
      if (field === "goal" && val < updated.current) updated.goal = updated.current;
      return updated;
    }));
  };

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
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
          <thead>
            <tr>
              <th style={thS}>Troop</th>
              <th style={thS}>Piece</th>
              <th style={thS}>Current</th>
              <th style={thS}>Goal</th>
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

              const fmtStat = (val, suffix="") => val == null ? "TBD" : `${val}${suffix}`;

              // Deployment buff: only show if either current or goal is Legendary
              const showDeploy = isLegendaryGearLevel(curRow[1]) || isLegendaryGearLevel(goalRow[1]);

              return (
                <React.Fragment key={piece.name}>
                  <tr style={{ background: idx%2===0 ? "transparent" : C.surface }}>
                    <td style={{ ...tdS, fontWeight:700, color: typeColor(piece.troop), width:90 }}>
                      {showTroop ? piece.troop : ""}
                    </td>
                    <td style={{ ...tdS, fontWeight:600 }}>{piece.name}</td>
                    <td style={{ ...tdS, width:120 }}>
                      <select value={s.current} onChange={e => setSlotField(idx,"current",Number(e.target.value))} style={sel}>
                        {CHIEF_GEAR_LEVELS.map((r,i) => <option key={i} value={i}>{r[1]}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdS, width:120 }}>
                      <select value={s.goal} onChange={e => setSlotField(idx,"goal",Number(e.target.value))} style={sel}>
                        {CHIEF_GEAR_LEVELS.map((r,i) => (
                          <option key={i} value={i} disabled={i < s.current}>{r[1]}</option>
                        ))}
                      </select>
                    </td>
                    <td style={tdMono}>{changed ? cost.plans.toLocaleString() : "—"}</td>
                    <td style={tdMono}>{changed ? cost.polish.toLocaleString() : "—"}</td>
                    <td style={tdMono}>{changed ? cost.alloy.toLocaleString() : "—"}</td>
                    <td style={tdMono}>{changed ? cost.amber.toLocaleString() : "—"}</td>
                    <td style={tdMono}>{curRow[6] != null ? curRow[6].toLocaleString() : "TBD"}</td>
                    <td style={tdMono}>{goalRow[6] != null ? goalRow[6].toLocaleString() : "TBD"}</td>
                    <td style={tdMono}>{showDeploy ? (goalRow[8] > 0 ? `+${goalRow[8].toLocaleString()}` : "—") : "—"}</td>
                  </tr>

                  {/* Stat sub-row */}
                  {changed && (() => {
                    const LABELS = ["Power","Troop Atk","Troop Def","Deploy Buff"];
                    const getVals = row => [
                      row[6],
                      row[7],
                      row[7], // same as atk
                      showDeploy ? row[8] : null,
                    ];
                    const curVals  = getVals(curRow);
                    const goalVals = getVals(goalRow);
                    const chgVals  = curVals.map((v,i) => (v!=null && goalVals[i]!=null) ? goalVals[i]-v : null);
                    const fmtV = (v, i) => {
                      if (v == null) return "TBD";
                      if (i === 0) return v.toLocaleString();
                      if (i === 3) return v === 0 ? "—" : `+${v}`;
                      return `${v.toFixed(4)}%`;
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
                                        {row.isChange && v!=null && v>0 ? "+" : ""}{fmtV(v,i)}
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
const CHIEF_CHARM_LEVELS = (() => {
  const raw = [
    ["Lv. 1",    5,   5,  0,  205700, 9.00],
    ["Lv. 2",   40,  15,  0,   82300,12.00],
    ["Lv. 3",   60,  40,  0,   82000,16.00],
    ["Lv. 4",   80, 100,  0,   82000,19.00],
    ["Lv. 4.1", 25,  50,  0,   31000,20.50],
    ["Lv. 4.2", 25,  50,  0,   31000,22.00],
    ["Lv. 4.3", 25,  50,  0,   31000,23.50],
    ["Lv. 5",   25,  50,  0,   31000,25.00],
    ["Lv. 5.1", 30,  75,  0,   31000,26.25],
    ["Lv. 5.2", 30,  75,  0,   31000,27.50],
    ["Lv. 5.3", 30,  75,  0,   31000,28.75],
    ["Lv. 6",   30,  75,  0,   31000,30.00],
    ["Lv. 6.1", 35, 100,  0,   31000,31.25],
    ["Lv. 6.2", 35, 100,  0,   31000,32.50],
    ["Lv. 6.3", 35, 100,  0,   31000,33.75],
    ["Lv. 7",   35, 100,  0,   31000,35.00],
    ["Lv. 7.1", 50, 100,  0,   31000,36.25],
    ["Lv. 7.2", 50, 100,  0,   31000,37.50],
    ["Lv. 7.3", 50, 100,  0,   31000,38.75],
    ["Lv. 8",   50, 100,  0,   31000,40.00],
    ["Lv. 8.1", 75, 100,  0,   31000,41.25],
    ["Lv. 8.2", 75, 100,  0,   31000,42.50],
    ["Lv. 8.3", 75, 100,  0,   31000,43.75],
    ["Lv. 9",   75, 100,  0,   31000,45.00],
    ["Lv. 9.1",105, 105,  0,   31000,46.25],
    ["Lv. 9.2",105, 105,  0,   31000,47.50],
    ["Lv. 9.3",105, 105,  0,   31000,48.75],
    ["Lv. 10", 105, 105,  0,   31000,50.00],
    ["Lv. 10.1",112, 84,  0,   24800,51.00],
    ["Lv. 10.2",112, 84,  0,   24800,52.00],
    ["Lv. 10.3",112, 84,  0,   24800,53.00],
    ["Lv. 10.4",112, 84,  0,   24800,54.00],
    ["Lv. 11", 112,  84,  0,   24800,55.00],
    ["Lv. 11.1",116, 90,  3,   24800,56.80],
    ["Lv. 11.2",116, 90,  3,   24800,58.60],
    ["Lv. 11.3",116, 90,  3,   24800,60.40],
    ["Lv. 11.4",116, 90,  3,   24800,62.20],
    ["Lv. 12", 116,  90,  3,   24800,64.00],
    ["Lv. 12.1",116, 90,  6,   24800,65.80],
    ["Lv. 12.2",116, 90,  6,   24800,67.60],
    ["Lv. 12.3",116, 90,  6,   24800,69.40],
    ["Lv. 12.4",116, 90,  6,   24800,71.20],
    ["Lv. 13", 116,  90,  6,   24800,73.00],
    ["Lv. 13.1",120,100,  9,   24800,74.80],
    ["Lv. 13.2",120,100,  9,   24800,76.60],
    ["Lv. 13.3",120,100,  9,   24800,78.40],
    ["Lv. 13.4",120,100,  9,   24800,80.20],
    ["Lv. 14", 120, 100,  9,   24800,82.00],
    ["Lv. 14.1",120,100, 14,   24800,83.80],
    ["Lv. 14.2",120,100, 14,   24800,85.60],
    ["Lv. 14.3",120,100, 14,   24800,87.40],
    ["Lv. 14.4",120,100, 14,   24800,89.20],
    ["Lv. 15", 120, 100, 14,   24800,91.00],
    ["Lv. 15.1",130,110, 20,   24800,92.80],
    ["Lv. 15.2",130,110, 20,   24800,94.60],
    ["Lv. 15.3",130,110, 20,   24800,96.40],
    ["Lv. 15.4",130,110, 20,   24800,98.20],
    ["Lv. 16", 130, 110, 20,   24800,100.00],
  ];
  // Build cumulative power
  let cum = 0;
  return raw.map(([lbl, g, d, s, gain, stat]) => {
    cum += gain;
    return { label:lbl, guides:g, designs:d, secrets:s, power:cum, stat };
  });
})();

// Chief Charm pieces: 6 gear pieces × 3 charms each = 18 total
const CHIEF_CHARM_PIECES = [
  { gear:"Cap",    troop:"Lancer",   charms:["Cap Charm 1","Cap Charm 2","Cap Charm 3"] },
  { gear:"Watch",  troop:"Lancer",   charms:["Watch Charm 1","Watch Charm 2","Watch Charm 3"] },
  { gear:"Coat",   troop:"Infantry", charms:["Coat Charm 1","Coat Charm 2","Coat Charm 3"] },
  { gear:"Pants",  troop:"Infantry", charms:["Pants Charm 1","Pants Charm 2","Pants Charm 3"] },
  { gear:"Belt",   troop:"Marksman", charms:["Belt Charm 1","Belt Charm 2","Belt Charm 3"] },
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
function ChiefCharmsPage({ inv }) {
  const C = COLORS;
  const sel = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
    color:C.textPri, padding:"4px 6px", fontSize:11, outline:"none" };
  const [slots, setSlots] = useLocalStorage("cc-slots", defaultCharmSlots());

  const setSlotField = (idx, field, val) => {
    setSlots(prev => prev.map((s,i) => {
      if (i !== idx) return s;
      const updated = { ...s, [field]: val };
      if (field === "current" && val > updated.goal) updated.goal = val;
      if (field === "goal" && val < updated.current) updated.goal = updated.current;
      return updated;
    }));
  };

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

  // Level dropdown options — only show levels up to current major level + sub-levels
  const levelOpts = CHIEF_CHARM_LEVELS.map((r,i) => ({ label:r.label, idx:i }));

  // Charm index within its gear group (0,1,2)
  let charmIdxInGroup = 0;
  let lastGear = "";

  return (
    <div style={{ padding:"0 0 40px" }}>
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

              const curPow  = s.current > 0 ? CHIEF_CHARM_LEVELS[s.current-1].power : 0;
              const goalPow = s.goal    > 0 ? CHIEF_CHARM_LEVELS[s.goal-1].power    : 0;
              const curStat  = s.current > 0 ? CHIEF_CHARM_LEVELS[s.current-1].stat : 0;
              const goalStat = s.goal    > 0 ? CHIEF_CHARM_LEVELS[s.goal-1].stat    : 0;

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
                    <td style={{ ...tdS, width:120 }}>
                      <select value={s.current}
                        onChange={e => setSlotField(idx,"current",Number(e.target.value))}
                        style={sel}>
                        <option value={0}>— None —</option>
                        {levelOpts.map(o => (
                          <option key={o.idx} value={o.idx+1}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...tdS, width:120 }}>
                      <select value={s.goal}
                        onChange={e => setSlotField(idx,"goal",Number(e.target.value))}
                        style={sel}>
                        <option value={0}>— None —</option>
                        {levelOpts.map(o => (
                          <option key={o.idx} value={o.idx+1}
                            disabled={o.idx+1 < s.current}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={tdMono}>{changed ? cost.guides.toLocaleString()  : "—"}</td>
                    <td style={tdMono}>{changed ? cost.designs.toLocaleString() : "—"}</td>
                    <td style={tdMono}>{changed ? cost.secrets.toLocaleString() : "—"}</td>
                    <td style={tdMono}>{curPow  > 0 ? curPow.toLocaleString()  : "—"}</td>
                    <td style={tdMono}>{goalPow > 0 ? goalPow.toLocaleString() : "—"}</td>
                    <td style={tdMono}>{goalStat > 0 ? `${goalStat.toFixed(2)}%` : "—"}</td>
                    <td style={tdMono}>{goalStat > 0 ? `${goalStat.toFixed(2)}%` : "—"}</td>
                  </tr>

                  {/* Stat sub-row */}
                  {changed && (() => {
                    const LABELS = ["Power","Lethality","Health"];
                    const curVals  = [curPow,  curStat,  curStat];
                    const goalVals = [goalPow, goalStat, goalStat];
                    const chgVals  = curVals.map((v,i) => goalVals[i] - v);
                    const fmtV = (v, i) => i===0 ? v.toLocaleString() : `${v.toFixed(2)}%`;
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
          style={{padding:"8px 16px",background:"#e36b1a",color:"#0a0c10",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700}}>
          Reload
        </button>
      </div>
    );
    return this.props.children;
  }
}

// ─── Layout / Nav ─────────────────────────────────────────────────────────────
const PAGES = [
  { id:"inventory",    label:"Inventory",     icon:"[I]", section:"Resources"   },
  { id:"construction", label:"Construction",  icon:"[B]", section:"Resources"   },
  { id:"rfc-planner",  label:"RFC Planner",   icon:"[R]", section:"Resources"   },
  { id:"heroes",        label:"Heroes",        icon:"[H]", section:"Combat"      },
  { id:"hero-gear",     label:"Hero Gear",     icon:"[G]", section:"Combat"      },
  { id:"chief-gear",    label:"Chief Gear",    icon:"[C]", section:"Combat"      },
  { id:"chief-charms",  label:"Chief Charms",  icon:"[K]", section:"Combat"      },
  { id:"experts",       label:"Experts",       icon:"[E]", section:"Combat"      },
  { id:"war-academy",   label:"War Academy",   icon:"[W]", section:"Combat"      },
  { id:"svs-calendar", label:"SvS Calendar",  icon:"[C]", section:"Planning"    },
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
  "war-academy":{ title: "War Academy", sub: "Infantry, Marksman & Lancer squad upgrade tracker" },
  "svs-calendar":{ title: "SvS Calendar", sub: "Rolling 28-week schedule — SvS every 4th week, King of Icefield every 2nd week" },
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
  const [savedAt,       setSavedAt]      = useState(null);
  const [loadedPlanKey, setLoadedPlanKey]= useState(null);
  const [syncing,       setSyncing]      = useState(false);
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

  // Update guest flag whenever auth state changes
  useEffect(() => { setGuestFlag(!user); }, [user]);

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
          <div className="sidebar-logo">
            <div className="wos">WoS · SvS</div>
            <h1>Planning<br /><span>Tracker</span></h1>
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
                    <span className="nav-icon">{p.icon}</span>
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
                      <span className="nav-icon" style={{flexShrink:0}}>[P]</span>
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
                  onClick={() => { setPage("admin"); setSidebarOpen(false); }}
                >
                  <span className="nav-icon">⚙</span>
                  Submissions
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
              <div className="profile-avatar">{userInitial}</div>
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
                onUpdatePlan={handleUpdatePlan} />}
            {page === "rfc-planner"  && <RFCPlanner inv={inv} setInv={setInv}
                savedPlans={user ? savedPlans : {}}
                onSavePlan={user ? handleSavePlan : ()=>{}}
                onLoadPlan={handleLoadPlan}
                openSavePopup={user ? openSavePopup : null}
                currentUser={user} />}
            {page === "heroes"      && <HeroesPage    genFilter={genFilter} setGenFilter={setGenFilter} heroStats={heroStats} setHeroStats={setHeroStats} currentUser={user} activeCharacter={activeCharacter} hgHeroes={hgHeroes} />}
            {page === "admin"       && user?.id === ADMIN_UID && <AdminPage />}
            {page === "hero-gear"    && <HeroGearPage    inv={inv} genFilter={genFilter} setGenFilter={setGenFilter} heroStats={heroStats} setHeroStats={setHeroStats} hgHeroes={hgHeroes} setHgHeroes={setHgHeroes} />}
            {page === "chief-gear"   && <ChiefGearPage   inv={inv} />}
            {page === "chief-charms" && <ChiefCharmsPage inv={inv} />}
            {page === "experts"      && <ExpertsPage      inv={inv} />}
            {page === "war-academy"  && <WarAcademyPage   inv={inv} />}
            {page === "svs-calendar" && <SvSCalendar />}
          </div>
        </main>
      </div>
    </>
  );
}
