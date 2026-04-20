import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocalStorage } from "./useLocalStorage.js";
import { supabase } from "./supabase.js";
import { GEAR_DB, EMPOWERMENT, GEAR_TYPE, HERO_GEAR_SET, SLOT_TO_GEAR, getGearStats, getUnlockedEmpowerments } from "./GearData.js";

// ─── COLORS ───────────────────────────────────────────────────────────────────
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
// Expert data, components, and power constants — see ./Experts.jsx

// ─── Formatting helpers (also used in Experts.jsx independently) ─────────────
const fmt = n => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(1)+"K";
  return Math.round(n).toLocaleString();
};
const fmtFull = n => Math.round(n).toLocaleString();
const clsx = (...args) => args.filter(Boolean).join(" ");

// ─── StatCard (local copy — also in App.jsx) ─────────────────────────────────
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

// ─── Exports ──────────────────────────────────────────────────────────────────
export { HeroesPage, HeroGearPage, HERO_ROSTER, HERO_SLOTS, GEAR_SLOTS,
         defaultAllHeroStats, defaultHeroState };
