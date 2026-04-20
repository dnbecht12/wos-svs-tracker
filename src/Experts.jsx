import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocalStorage } from "./useLocalStorage.js";

// ─── COLORS (CSS variable references — theme applied by App.jsx on :root) ─────
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

// ─── Expert Data & Components ─────────────────────────────────────────────────
// fmt, fmtFull, clsx defined in the utility block below (from original App.jsx)
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
    Valeria: [0,1000,1840,1940,2030,2120,2210,2400,2580,2760,2950,3130,3320,3500,3680,3870,4050,4240,4420,4600,4790,4970,5160,5340,5520,5710,5890,6080,6260,6440,6720,7000,7270,7550,7820,8100,8380,8650,8930,9200,9570,9940,10310,10680,11040,11410,11780,12150,12520,12880,13340,13800,14260,14720,15180,15640,16100,16560,17020,17480,17940,18400,18860,19320,19780,20240,20700,21160,21620,22080,22540,23000,23460,23920,24380,24840,25300,25760,26220,26680,27140,27600,28060,28520,28980,29440,29900,30360,30820,31280,31740,32200,32660,33120,33580,34040,34500,34960,35420,35880,36340],
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

    const resProg   = Number(d.researchProgress ?? 0);
    const resPower   = (curLv >= 100 && curB >= 11) ? RESEARCH_POWER(resProg) : 0;
    const total = (levelPower ?? 0) + (affinityPower ?? 0) + (talentPower ?? 0) + skillPower + resPower;
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
        {resPower > 0 && (
          <PRow label="Research Power" value={resPower} />
        )}
        {(levelApprox || !skillKnown || (curLv===100 && curB===11)) && (
          <div style={{ fontSize:9, color:C.textDim, fontFamily:"'Space Mono',monospace",
            paddingTop:4, lineHeight:1.5 }}>
            {levelApprox && "~ Level power is approximate. "}
            {!skillKnown && "Skill power formula pending in-game data. "}
            {resPower === 0 && curLv===100 && curB===11 && "Research Power available — set class & progress in Research section above."}
          </div>
        )}
      </div>
    );
  };

  const ExpertDrawer = React.memo(({ expert, getExpert, getExpertTotals, setExpert, updateSigils, inv }) => {
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
              <select value={goalLv} onChange={e => {
                  const newGoal = Number(e.target.value);
                  const update = { goalLevel: newGoal };
                  // Auto-populate Bonus Level goal when goal ends in *1 (≥ 11)
                  // Rule: to reach L(N×10+1) you must first have Bonus Level N+1
                  if (newGoal >= 11 && newGoal % 10 === 1) {
                    const minBonus = Math.floor(newGoal / 10) + 1;
                    if (minBonus > (Number(d.goalAffinity ?? 0))) {
                      update.goalAffinity = minBonus;
                    }
                  }
                  setExpert(expert.name, update);
                }}
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
                🔶 {totals.levelSigils.toLocaleString()} Affinity XP
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
              🔶 {totals.affinitySigils.toLocaleString()} Expert Sigils · Bonus: {BONUS_VALUES[expert.name]?.[curB]} → {BONUS_VALUES[expert.name]?.[goalB]}
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

        {/* ── Research (unlocks at L100 + B11 + all skills maxed) ── */}
        {(() => {
          const allSkillsMaxed = expert.skills.every((sk, i) => {
            const skKey = `sk${i+1}`;
            const max = getSkillMax(expert, skKey);
            return max !== null && Number(d[`${skKey}Level`] ?? 0) >= max;
          });
          const researchUnlocked = curLv >= 100 && curB >= 11 && allSkillsMaxed;
          if (!researchUnlocked) return null;

          const resClass = d.researchClass || "Proficient";
          const resProg  = Number(d.researchProgress ?? 0);

          // Compute path stat bonuses earned so far
          const pathCycle = RESEARCH_PATH_STATS[resClass];
          const pathBonuses = {};
          for (let m = 20; m <= resProg; m += 20) {
            const stat = pathCycle[((m / 20) - 1) % 3];
            pathBonuses[stat] = (pathBonuses[stat] || 0) + 0.006;
          }

          const selStyle = {
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.textPri, padding: "5px 8px", fontSize: 12,
            fontFamily: "'Space Mono',monospace", cursor: "pointer",
          };

          return (
            <div style={{ padding:"12px 0 0", borderTop:`1px solid ${C.border}`, marginTop:4 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.textPri, marginBottom:10 }}>
                🔬 Research
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10 }}>
                {/* Class */}
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase",
                    letterSpacing:"0.5px", fontFamily:"'Space Mono',monospace" }}>Class</span>
                  <select value={resClass}
                    onChange={e => setExpert(expert.name, { researchClass: e.target.value })}
                    style={selStyle}>
                    <option value="Proficient">Proficient</option>
                    <option value="Expert">Expert</option>
                    <option value="Ultimate">Ultimate</option>
                  </select>
                </div>
                {/* Progress */}
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase",
                    letterSpacing:"0.5px", fontFamily:"'Space Mono',monospace" }}>Progress</span>
                  <select value={resProg}
                    onChange={e => setExpert(expert.name, { researchProgress: Number(e.target.value) })}
                    style={selStyle}>
                    {Array.from({length:201},(_,i)=>i).map(i => (
                      <option key={i} value={i}>{i}{i===200?" ★":""}</option>
                    ))}
                  </select>
                </div>
                {/* Power badge */}
                {resProg > 0 && (
                  <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                    <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase",
                      letterSpacing:"0.5px", fontFamily:"'Space Mono',monospace" }}>Power</span>
                    <div style={{ padding:"5px 10px", borderRadius:6,
                      background: C.accentBg || C.surface, border:`1px solid ${C.accentDim || C.border}`,
                      fontSize:13, fontWeight:800, color:C.accent,
                      fontFamily:"'Space Mono',monospace" }}>
                      {RESEARCH_POWER(resProg).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats summary */}
              {resProg > 0 && (
                <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:7,
                  padding:"8px 10px", fontSize:11, fontFamily:"'Space Mono',monospace" }}>
                  <div style={{ color:C.textDim, marginBottom:4, fontSize:10 }}>
                    Accumulated bonuses at progress {resProg}:
                  </div>
                  <div style={{ color:C.green }}>
                    +{(resProg * 0.01).toFixed(2)}% Troops' Attack (base)
                  </div>
                  {Object.entries(pathBonuses).map(([stat, val]) => (
                    <div key={stat} style={{ color:C.blue }}>
                      +{(val * 100).toFixed(2)}% Troops' {stat} (path)
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

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
  });

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
              {isOpen && <ExpertDrawer expert={expert} getExpert={getExpert} getExpertTotals={getExpertTotals} setExpert={setExpert} updateSigils={updateSigils} inv={inv} />}
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
  Valeria:  144000,  // screenshot ✅ (1,152,000 ÷ 8 tiers)
  Ronne:    null,
  Kathy:    108000,  // screenshot ✅ (108,000 per tier)
};

// Talent Power per bonus level: power = rate × talent_level
const EXPERT_TALENT_POWER_RATE = {
  Cyrille:  36000,
  Agnes:    36000,
  Romulus:  236000,
  Holger:   58000,
  Fabian:   86000,
  Baldur:   43000,
  Valeria:  143000,  // spreadsheet ✅
  Ronne:    58000,   // spreadsheet ✅
  Kathy:    72000,   // screenshot ✅ (72,000 per talent level)
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
  Valeria:  { rate: 20700, offset: 0  },   // screenshot ✅ (20,700×80=1,656,000)
  Ronne:    null,
  Kathy:    { rate: 13500, offset: 12 },   // screenshot ✅ (13,500×(lv+12); L1=175,500)
};

// Research Power formula: n*1000 + floor(n/20)*60000  (verified all 200 data points)
// Path stats every 20 levels: +0.60% to cycling stat per class
const RESEARCH_POWER = n => n * 1000 + Math.floor(n / 20) * 60000;
const RESEARCH_PATH_STATS = {
  Proficient: ["Defense","Lethality","Health"],   // cycle starts at milestone 1 (level 20)
  Expert:     ["Lethality","Health","Defense"],
  Ultimate:   ["Health","Defense","Lethality"],
};

// Skill Power per skill per level — all verified against in-game screenshots
const EXPERT_SKILL_POWER = {
  Cyrille:  { sk1: 3000,   sk2: 13000,  sk3: 20000,  sk4: 7000   }, // spreadsheet ✅
  Agnes:    { sk1: 20000,  sk2: 16000,  sk3: 7000,   sk4: 7000   }, // spreadsheet ✅ (maxed=285k)
  Romulus:  { sk1: 18000,  sk2: 108000, sk3: 135000, sk4: 150000 }, // spreadsheet ✅
  Holger:   { sk1: 42000,  sk2: 18000,  sk3: 18000,  sk4: 42000  }, // spreadsheet ✅ (maxed=1.2M)
  Fabian:   { sk1: 18000,  sk2: 37000,  sk3: 52000,  sk4: 83000  }, // spreadsheet ✅ (2,099,000)
  Baldur:   { sk1: 18000,  sk2: 18000,  sk3: 18000,  sk4: 35000  }, // spreadsheet ✅ (714,000)
  Valeria:  { sk1: 30000,  sk2: 30000,  sk3: 156000, sk4: 156000 }, // spreadsheet ✅
  Ronne:    { sk1: 18000,  sk2: 18000,  sk3: 42000,  sk4: 98000  }, // spreadsheet ✅
  Kathy:    { sk1: 18000,  sk2: 18000,  sk3: 70000,  sk4: 98000  }, // screenshot ✅ (all 4 skills confirmed)
};

function ExpertStatsSummary({ expertData }) {
  const C = COLORS;
  const [collapsed, setCollapsed] = React.useState(false);
  const getD = (name) => expertData[name] || {};
  const pct = v => `${(v * 100).toFixed(2)}%`;

  // ── Always-on totals (sum all non-event experts) ──────────────────────────
  const STAT_ORDER = ["Troops' Attack", "Troops' Defense", "Troops' Lethality", "Troops' Health"];
  const totals = Object.fromEntries(STAT_ORDER.map(s => [s, 0]));

  const add = (stat, val) => { if (totals[stat] !== undefined) totals[stat] += (val ?? 0); };

  const cyrLv  = Number(getD("Cyrille").level  ?? 0);
  const agnLv  = Number(getD("Agnes").level    ?? 0);
  const holLv  = Number(getD("Holger").level   ?? 0);
  const balLv  = Number(getD("Baldur").level   ?? 0);
  const kathyLv= Number(getD("Kathy").level    ?? 0);
  const dRom   = getD("Romulus");
  const romLv  = Number(dRom.level   ?? 0);
  const romSk2 = Number(dRom.sk2Level ?? 0);
  const romSk3 = Number(dRom.sk3Level ?? 0);

  // Cyrille — Troops' Attack
  add("Troops' Attack",    EXPERT_LEVEL_STATS.Cyrille?.[cyrLv]  ?? 0);
  // Agnes — Troops' Defense
  add("Troops' Defense",   EXPERT_LEVEL_STATS.Agnes?.[agnLv]    ?? 0);
  // Holger — Troops' Attack & Defense
  add("Troops' Attack",    EXPERT_LEVEL_STATS.Holger?.[holLv]   ?? 0);
  add("Troops' Defense",   EXPERT_LEVEL_STATS.Holger?.[holLv]   ?? 0);
  // Baldur — Troops' Attack & Defense
  add("Troops' Attack",    EXPERT_LEVEL_STATS.Baldur?.[balLv]   ?? 0);
  add("Troops' Defense",   EXPERT_LEVEL_STATS.Baldur?.[balLv]   ?? 0);
  // Kathy — Troops' Lethality & Health
  add("Troops' Lethality", EXPERT_LEVEL_STATS.Kathy?.[kathyLv]  ?? 0);
  add("Troops' Health",    EXPERT_LEVEL_STATS.Kathy?.[kathyLv]  ?? 0);
  // Romulus level — Troops' Lethality & Health
  add("Troops' Lethality", EXPERT_LEVEL_STATS.Romulus?.[romLv]  ?? 0);
  add("Troops' Health",    EXPERT_LEVEL_STATS.Romulus?.[romLv]  ?? 0);
  // Romulus sk2 — Troops' Attack & Defense (always-on)
  add("Troops' Attack",    ROMULUS_SK2_STAT?.[romSk2] ?? 0);
  add("Troops' Defense",   ROMULUS_SK2_STAT?.[romSk2] ?? 0);
  // Romulus sk3 — Troops' Lethality & Health (always-on)
  add("Troops' Lethality", ROMULUS_SK3_STAT?.[romSk3] ?? 0);
  add("Troops' Health",    ROMULUS_SK3_STAT?.[romSk3] ?? 0);

  // ── Event-specific buffs (called out separately) ──────────────────────────
  const fabLv   = Number(getD("Fabian").level  ?? 0);
  const valLv   = Number(getD("Valeria").level ?? 0);
  const ronneLv = Number(getD("Ronne").level   ?? 0);

  const fabVal   = EXPERT_LEVEL_STATS.Fabian?.[fabLv]   ?? 0;
  const valVal   = EXPERT_LEVEL_STATS.Valeria?.[valLv]  ?? 0;
  const ronneVal = EXPERT_LEVEL_STATS.Ronne?.[ronneLv]  ?? 0;

  const eventBuffs = [
    fabLv > 0 && {
      expert:"Fabian", event:"Foundry / Hellfire",
      stats: [
        { stat:"Troops' Lethality", value: fabVal },
        { stat:"Troops' Health",    value: fabVal },
      ],
    },
    valLv > 0 && {
      expert:"Valeria", event:"SvS Battle Phase",
      stats: [
        { stat:"Troops' Lethality", value: valVal },
        { stat:"Troops' Health",    value: valVal },
      ],
    },
    ronneLv > 0 && {
      expert:"Ronne", event:"Raids",
      stats: [
        { stat:"Troops' Attack",  value: ronneVal },
        { stat:"Troops' Defense", value: ronneVal },
      ],
    },
  ].filter(Boolean);

  const romulusDeploy = ROMULUS_BONUS_DEPLOY[Number(dRom.affinity  ?? 0)] ?? 0;
  const romulusRally  = ROMULUS_SK4_RALLY[Number(dRom.sk4Level ?? 0)] ?? 0;

  const expertEventColors = {
    Fabian:"#D4A017", Valeria:"#E3731A", Ronne:"#2980B9",
  };

  const anyData = STAT_ORDER.some(s => totals[s] > 0) || eventBuffs.length > 0
    || romulusDeploy > 0 || romulusRally > 0;

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
            Summed buffs from all experts · event-specific buffs shown separately
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {collapsed && STAT_ORDER.filter(s => totals[s] > 0).map(s => (
            <span key={s} style={{ fontSize:10, padding:"2px 8px", borderRadius:8,
              background:C.green+"22", color:C.green, border:`1px solid ${C.green}44`,
              fontFamily:"'Space Mono',monospace" }}>
              {s.replace("Troops' ","")} +{pct(totals[s])}
            </span>
          ))}
          <span style={{ color:C.textDim, fontSize:14 }}>{collapsed ? "▼" : "▲"}</span>
        </div>
      </div>

      {!collapsed && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`,
          borderTop:"none", borderRadius:"0 0 10px 10px", overflow:"hidden" }}>

          {!anyData ? (
            <div style={{ padding:"20px 16px", textAlign:"center", color:C.textDim,
              fontSize:12, fontFamily:"'Space Mono',monospace" }}>
              Set expert levels above to see stat contributions
            </div>
          ) : (
            <>
              {/* ── Always-on totals ── */}
              <div style={{ padding:"14px 16px" }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.textDim,
                  textTransform:"uppercase", letterSpacing:"1.5px",
                  fontFamily:"'Space Mono',monospace", marginBottom:10 }}>
                  Always-On Buffs (All Sources Combined)
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                  {STAT_ORDER.map(s => (
                    <div key={s} style={{ display:"flex", flexDirection:"column",
                      padding:"8px 14px", borderRadius:8,
                      background: totals[s] > 0 ? C.green+"15" : C.surface,
                      border:`1px solid ${totals[s] > 0 ? C.green+"44" : C.border}` }}>
                      <span style={{ fontSize:10, color:C.textDim,
                        fontFamily:"'Space Mono',monospace" }}>{s}</span>
                      <span style={{ fontSize:18, fontWeight:800, fontFamily:"Syne,sans-serif",
                        color: totals[s] > 0 ? C.green : C.textDim }}>
                        {totals[s] > 0 ? `+${pct(totals[s])}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Event-specific buffs ── */}
              {eventBuffs.length > 0 && (
                <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.textDim,
                    textTransform:"uppercase", letterSpacing:"1.5px",
                    fontFamily:"'Space Mono',monospace", marginBottom:10 }}>
                    Event-Specific Buffs
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {eventBuffs.map((eb, i) => (
                      <div key={i} style={{ padding:"10px 14px", borderRadius:8,
                        background:C.surface, border:`1px solid ${C.border}`,
                        display:"flex", alignItems:"center", flexWrap:"wrap", gap:12 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:140 }}>
                          <span style={{ fontSize:12, fontWeight:700,
                            color: expertEventColors[eb.expert] ?? C.textPri }}>
                            {eb.expert}
                          </span>
                          <span style={{ fontSize:10, padding:"1px 7px", borderRadius:10,
                            background: expertEventColors[eb.expert]+"22",
                            color: expertEventColors[eb.expert] ?? C.textDim,
                            border:`1px solid ${expertEventColors[eb.expert]}44`,
                            fontFamily:"'Space Mono',monospace", fontWeight:700 }}>
                            {eb.event}
                          </span>
                        </div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          {eb.stats.map((st, j) => (
                            <div key={j} style={{ fontSize:12, fontFamily:"'Space Mono',monospace",
                              color:C.amber }}>
                              {st.stat}: <span style={{ fontWeight:700 }}>+{pct(st.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Romulus capacity bonuses ── */}
              {(romulusDeploy > 0 || romulusRally > 0) && (
                <div style={{ padding:"10px 16px", borderTop:`1px solid ${C.border}`,
                  display:"flex", gap:16, flexWrap:"wrap" }}>
                  {romulusDeploy > 0 && (
                    <span style={{ fontSize:11, color:C.blue,
                      fontFamily:"'Space Mono',monospace" }}>
                      🔵 Romulus Deploy Cap Bonus: +{romulusDeploy.toLocaleString()} → Chief Profile
                    </span>
                  )}
                  {romulusRally > 0 && (
                    <span style={{ fontSize:11, color:C.blue,
                      fontFamily:"'Space Mono',monospace" }}>
                      🔵 Romulus Sk4 Rally: +{romulusRally.toLocaleString()} → Chief Profile
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

// ─── Exports ──────────────────────────────────────────────────────────────────
export default ExpertsPage;
export {
  EXPERT_AFFINITY_POWER_RATE,
  EXPERT_TALENT_POWER_RATE,
  EXPERT_LEVEL_POWER,
  EXPERT_SKILL_POWER,
  RESEARCH_POWER,
  ROMULUS_SK4_RALLY,
  ROMULUS_BONUS_DEPLOY,
};
