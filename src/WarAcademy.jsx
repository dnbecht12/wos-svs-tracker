import React from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { useTierContext, GuestBanner } from "./TierContext.jsx";
import { todayUTC } from "./svsCalendar.js";

// ─── COLORS ──────────────────────────────────────────────────────────────────
const COLORS = {
  bg:"var(--c-bg)", surface:"var(--c-surface)", card:"var(--c-card)",
  border:"var(--c-border)", borderHi:"var(--c-borderHi)",
  textPri:"var(--c-textPri)", textSec:"var(--c-textSec)", textDim:"var(--c-textDim)",
  accent:"var(--c-accent)", accentBg:"var(--c-accentBg)", accentDim:"var(--c-accentDim)",
  green:"var(--c-green)", greenBg:"var(--c-greenBg)", greenDim:"var(--c-greenDim)",
  blue:"var(--c-blue)", blueBg:"var(--c-blueBg)", blueDim:"var(--c-blueDim)",
  amber:"var(--c-amber)", amberBg:"var(--c-amberBg)", amberDim:"var(--c-amberDim)",
  red:"var(--c-red)", redBg:"var(--c-redBg)", redDim:"var(--c-redDim)",
};

// ─── Formatting helpers ───────────────────────────────────────────────────────
const fmt = n => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(1)+"K";
  return Math.round(n).toLocaleString();
};

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
function WarAcademyPage({ inv, setInv, onCompleteSvs }) {
  const C = COLORS;
  const { isGuest } = useTierContext();

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

  // Bust localStorage-reading useMemos when character switches
  const [charSwitchCount, setCharSwitchCount] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setCharSwitchCount(n => n + 1);
    window.addEventListener("wos-char-ready", handler);
    return () => window.removeEventListener("wos-char-ready", handler);
  }, []);

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
  }, [charSwitchCount]);

  // ── SvS date calculation (Tuesday = SvS Day 2) ────────────────────────────
  const [dailyEarnShards, setDailyEarnShards] = useLocalStorage("wa-dailyshards", null);
  const effectiveDailyShards = dailyEarnShards !== null ? dailyEarnShards : (inv.dailyIntel ?? 0);
  const daysToSvSTuesday = React.useMemo(() => {
    const today = todayUTC();
    // Find next Tuesday (day 2 = Tue, UTC: 0=Sun, 2=Tue)
    const day = today.getUTCDay();
    const daysUntilTue = day <= 2 ? 2 - day : 9 - day;
    return daysUntilTue === 0 ? 7 : daysUntilTue; // if today is Tuesday, next Tuesday
  }, []);

  // ── Inventory (reads directly from inv, writes back via setInv for full sync) ─
  const curShards = inv.shards ?? 0;
  const curSteel  = (inv.steel ?? 0) * (inv.steelUnit === "B" ? 1_000_000_000 : 1_000_000);
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

  // Collapse maxed rows per troop type — persisted so hide state survives navigation
  const [collapseMaxed, setCollapseMaxed] = useLocalStorage("wa-collapse", {
    Infantry: false, Lancer: false, Marksman: false
  });
  const toggleCollapse = troop => setCollapseMaxed(p => ({ ...p, [troop]: !p[troop] }));

  // Active troop tab
  const [troopTab, setTroopTab] = React.useState("Infantry");

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

      {isGuest && (
        <GuestBanner message="Progress resets between sessions as a guest. Sign up to save your War Academy levels and track upgrade costs." />
      )}

      {/* Complete Upgrades button */}
      {onCompleteSvs && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={onCompleteSvs} style={{
              padding:"8px 16px", borderRadius:7, cursor:"pointer",
              border:"1px solid var(--c-accentDim)",
              background:"rgba(227,107,26,0.12)",
              color:"var(--c-accent)", fontSize:12, fontWeight:700,
              fontFamily:"Syne,sans-serif", display:"flex", alignItems:"center", gap:6,
            }}>⚔️ Complete Upgrades</button>
            <span className="info-tip" data-tip="Reviews all fields where Goal ≠ Current for this tab. Lets you adjust what you actually achieved, then pushes those values to Current and deducts materials from inventory." style={{fontSize:14,color:"var(--c-textDim)",cursor:"default",userSelect:"none",lineHeight:1}}>ⓘ</span>
          </div>
        </div>
      )}

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

      {/* ── Troop type tabs ─────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {["Infantry","Lancer","Marksman"].map(t => {
          const tc = typeColor(t);
          const active = troopTab === t;
          return (
            <button key={t} onClick={() => setTroopTab(t)}
              style={{ padding:"7px 18px", borderRadius:7, fontSize:12, fontWeight:700,
                cursor:"pointer", fontFamily:"Syne,sans-serif", transition:"all 0.15s",
                background: active ? tc + "22" : C_.surface,
                color:      active ? tc        : C_.textSec,
                border:     `1px solid ${active ? tc + "66" : C_.border}` }}>
              {t}
            </button>
          );
        })}
      </div>

      {/* ── Selected troop table ─────────────────────────────────────────── */}
      {renderTroopTable(troopTab)}

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

// ─── Exports ──────────────────────────────────────────────────────────────────
export default WarAcademyPage;
export { WA_RESEARCH, waPower };
