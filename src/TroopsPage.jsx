import React, { useState, useEffect, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage.js";

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

// ─── Export ───────────────────────────────────────────────────────────────────
export default TroopsPage;
