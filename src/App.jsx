import React, { useState, useEffect, useCallback, useRef, useMemo, Component } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./supabase.js";
import {
  useLocalStorage, setGuestFlag, setSyncUserId, setSyncCharId, scheduleSync, _isGuest,
} from "./useLocalStorage.js";
import WarAcademyPage, { WA_RESEARCH, waPower } from "./WarAcademy.jsx";
import DaybreakIslandPage from "./DaybreakIsland.jsx";
import { ChiefGearPage, ChiefCharmsPage, CHIEF_GEAR_LEVELS, CHIEF_CHARM_LEVELS } from "./ChiefEquipment.jsx";
import TroopsPage from "./TroopsPage.jsx";
import CharacterProfilePage, { getBuildingLevel } from "./CharacterProfile.jsx";
import ExpertsPage, {
  EXPERT_AFFINITY_POWER_RATE, EXPERT_TALENT_POWER_RATE, EXPERT_LEVEL_POWER,
  EXPERT_SKILL_POWER, RESEARCH_POWER, ROMULUS_SK4_RALLY, ROMULUS_BONUS_DEPLOY,
} from "./Experts.jsx";
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
import { HeroesPage, HeroGearPage, HERO_ROSTER, HERO_SLOTS, GEAR_SLOTS,
         defaultAllHeroStats, defaultHeroState, ReportIssueModal, AdminPage }
  from "./Heroes.jsx";

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
// useLocalStorage, scheduleSync, setGuestFlag, setSyncUserId — imported from ./useLocalStorage.js

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

// Hero data, HeroesPage, HeroGearPage, AdminPage — see ./Heroes.jsx

// ─── Shared utilities (were previously defined inside the hero block) ─────────
const fmt = n => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(1)+"K";
  return Math.round(n).toLocaleString();
};
const fmtFull = n => Math.round(n).toLocaleString();
const clsx = (...args) => args.filter(Boolean).join(" ");
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
                              onClick={async ()=>{ await handleSwitchCharacter(c.id); onClose(); }}>Switch</button>
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

// War Academy data & page — see ./WarAcademy.jsx
// Chief Gear & Chief Charms — see ./ChiefEquipment.jsx
// Character Profile page — see ./CharacterProfile.jsx
// Troops page — see ./TroopsPage.jsx
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

  // ── Switch character: flush, update charId, clear local cache, re-fetch ────────
  const handleSwitchCharacter = useCallback(async (newCharId) => {
    if (!newCharId || newCharId === activeCharId) return;
    await flushSave(activeCharId);
    setSyncCharId(newCharId);
    // Clear localStorage cache so stale data doesn't bleed into the new character
    const SYNC_KEYS = [
      "wa-levels","wa-speedbuff","wa-buffs","wa-dailyshards",
      "rc-levels","rc-collapse","cp-speedbuff","cp-vip-level",
      "experts-data","cg-slots","cc-slots","troops-inventory-v2",
      "daybreak-buffs","daybreak-prosperity","hg-heroes","hg-hero-stats",
      "cp-buildings","cp-buffs","cp-cycle","cp-dailyfc","cp-agnes",
    ];
    SYNC_KEYS.forEach(k => {
      try { localStorage.removeItem(k); localStorage.removeItem(`${k}__ts`); } catch {}
    });
    // Switch active character (triggers the activeCharId useEffect for inventory)
    switchCharacter(newCharId);
    // Re-fetch this character's user_data from Supabase
    if (user?.id) {
      const { data } = await supabase.from("user_data")
        .select("key, value, updated_at")
        .eq("user_id", user.id)
        .eq("char_id", newCharId);
      (data || []).forEach(row => {
        try {
          localStorage.setItem(row.key, row.value);
          localStorage.setItem(`${row.key}__ts`, row.updated_at);
        } catch {}
      });
      // Signal all useLocalStorage hooks to re-read
      window.dispatchEvent(new CustomEvent("wos-user-ready", { detail: { id: user.id } }));
    }
  }, [user, activeCharId, flushSave, switchCharacter]);

  // ── Load data whenever activeCharId changes ───────────────────────────────────────
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
    // Set char ID first so scheduleSync includes it from the start
    const charIdForSync = activeCharId;
    setSyncCharId(charIdForSync);

    supabase.from("user_data")
      .select("key, value, updated_at")
      .eq("user_id", user.id)
      .eq("char_id", charIdForSync)
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
        const allLocalKeys = Object.keys(localStorage).filter(k =>
          !k.endsWith("__ts") && !NO_SYNC_KEYS.has(k) &&
          !k.startsWith("sb-") && k !== "wos-theme"
        );
        allLocalKeys.forEach(key => {
          try {
            if (cloudMap.has(key)) return;
            const localVal = localStorage.getItem(key);
            if (!localVal || localVal === "null") return;
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
        const existing = _isGuest ? [] : (JSON.parse(localStorage.getItem("rfc-actuals2") || "null") || []);
        const next = existing.map((d, i) =>
          i === rfcDayIdx ? { ...d, rfcUsed: 0, _fcOverride: newFC, _rfcOverride: newRFC } : d
        );
        if (!_isGuest) localStorage.setItem("rfc-actuals2", JSON.stringify(next));
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
      if (!_isGuest) {
        if (plan.selectedCycle !== undefined) localStorage.setItem("rfc-cycle",   JSON.stringify(plan.selectedCycle));
        if (plan.monRefines    !== undefined) localStorage.setItem("rfc-monref",  JSON.stringify(plan.monRefines));
        if (plan.weekdayMode   !== undefined) localStorage.setItem("rfc-wdmode",  JSON.stringify(plan.weekdayMode));
        if (plan.actuals       !== undefined) localStorage.setItem("rfc-actuals2",JSON.stringify(plan.actuals));
      }
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
          switchCharacter={handleSwitchCharacter}
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
                    await handleSwitchCharacter(val);
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
                cpSpeedBuff={cpSpeedBuff} setCpSpeedBuff={setCpSpeedBuff}
                activeCharId={activeCharId} />}
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
