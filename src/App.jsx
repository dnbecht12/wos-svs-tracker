import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ConstructionPlanner from "./ConstructionPlanner.jsx";
import RFCPlanner from "./RFCPlanner.jsx";
import SvSCalendar from "./SvSCalendar.jsx";
import { useAuth } from "./useAuth.js";
import { useCharacters, charLoadInventory, charSaveInventory, charLoadPlans, charSavePlan, charDeletePlan } from "./useCharacters.js";

// ─── Theme & Design System ────────────────────────────────────────────────────
const COLORS = {
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
};

const css = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (vals[i] ?? ""), "");

// ─── Local Storage Hook ───────────────────────────────────────────────────────
function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; }
    catch { return initial; }
  });
  const set = useCallback(v => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]); // key never changes — no stale closure over val
  return [val, set];
}

// ─── Initial Data — blank slate for new users ────────────────────────────────
const INITIAL_INVENTORY = {
  fireCrystals:    0,
  refinedFC:       0,
  // Raw materials
  meat:            0,
  wood:            0,
  coal:            0,
  iron:            0,
  // Hero gear
  mithril:         0,
  stones:          0,
  mythicGear:      0,       // Consumable Mythic Gear
  mythicGenShards: 0,       // Mythic General Shards
  // War Academy
  shards:          0,
  steel:           0,
  dailyIntel:      0,
  weeklyPack:      false,
  labyrinthWeekly: 0,
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
  // Skill settings
  agnesSkillLevel: 1,
  zinmanSkillLevel:1,
  zinmanBonus:     0,
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

// ─── Hero Gear Data ───────────────────────────────────────────────────────────

const HERO_ROSTER = [
  { name:"Jeronimo",   type:"Infantry", gen:"Gen 1" },
  { name:"Natalia",    type:"Infantry", gen:"Gen 1" },
  { name:"Flint",      type:"Infantry", gen:"Gen 2" },
  { name:"Logan",      type:"Infantry", gen:"Gen 3" },
  { name:"Ahmose",     type:"Infantry", gen:"Gen 4" },
  { name:"Hector",     type:"Infantry", gen:"Gen 5" },
  { name:"Wu Ming",    type:"Infantry", gen:"Gen 6" },
  { name:"Edith",      type:"Infantry", gen:"Gen 7" },
  { name:"Gatot",      type:"Infantry", gen:"Gen 8" },
  { name:"Magnus",     type:"Infantry", gen:"Gen 9" },
  { name:"Sergey",     type:"Infantry", gen:"Base"  },
  { name:"Eugene",     type:"Infantry", gen:"Base"  },
  { name:"Smith",      type:"Infantry", gen:"Base"  },
  { name:"Molly",      type:"Lancer",   gen:"Gen 1" },
  { name:"Philly",     type:"Lancer",   gen:"Gen 2" },
  { name:"Mia",        type:"Lancer",   gen:"Gen 3" },
  { name:"Reina",      type:"Lancer",   gen:"Gen 4" },
  { name:"Norah",      type:"Lancer",   gen:"Gen 5" },
  { name:"Renee",      type:"Lancer",   gen:"Gen 6" },
  { name:"Gordon",     type:"Lancer",   gen:"Gen 7" },
  { name:"Sonya",      type:"Lancer",   gen:"Gen 8" },
  { name:"Fred",       type:"Lancer",   gen:"Gen 9" },
  { name:"Jessie",     type:"Lancer",   gen:"Base"  },
  { name:"Ling Shuang",type:"Lancer",   gen:"Base"  },
  { name:"Walis Bokan",type:"Lancer",   gen:"Base"  },
  { name:"Patrick",    type:"Lancer",   gen:"Base"  },
  { name:"Charlie",    type:"Lancer",   gen:"Base"  },
  { name:"Zinman",     type:"Marksman", gen:"Gen 1" },
  { name:"Alonso",     type:"Marksman", gen:"Gen 2" },
  { name:"Greg",       type:"Marksman", gen:"Gen 3" },
  { name:"Lynn",       type:"Marksman", gen:"Gen 4" },
  { name:"Gwen",       type:"Marksman", gen:"Gen 5" },
  { name:"Wayne",      type:"Marksman", gen:"Gen 6" },
  { name:"Bradley",    type:"Marksman", gen:"Gen 7" },
  { name:"Hendrik",    type:"Marksman", gen:"Gen 8" },
  { name:"Xura",       type:"Marksman", gen:"Gen 9" },
  { name:"Bahiti",     type:"Marksman", gen:"Base"  },
  { name:"Jasser",     type:"Marksman", gen:"Base"  },
  { name:"Seo-yoon",   type:"Marksman", gen:"Base"  },
  { name:"Gina",       type:"Marksman", gen:"Base"  },
  { name:"Cloris",     type:"Marksman", gen:"Base"  },
];

// Generation order for cumulative filtering (Base = lowest, Gen 9 = highest)
const GEN_ORDER = ["Base","Gen 1","Gen 2","Gen 3","Gen 4","Gen 5","Gen 6","Gen 7","Gen 8","Gen 9"];

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

// ─── HeroGearPage ─────────────────────────────────────────────────────────────

function HeroGearPage({ inv }) {
  const [genFilter, setGenFilter]   = useLocalStorage("hg-gen-filter", "Gen 9");
  const [heroData,  setHeroData]    = useLocalStorage("hg-heroes",
    HERO_SLOTS.map(s => defaultHeroState(s.type))
  );

  // Update a specific hero slot's hero selection
  const setHero = (slotIdx, heroName) => {
    setHeroData(prev => prev.map((h, i) =>
      i === slotIdx ? { ...h, hero: heroName } : h
    ));
  };

  // Update a gear slot field with goal-floor enforcement
  const setSlotField = (heroIdx, slotIdx, field, value) => {
    setHeroData(prev => prev.map((h, hi) => {
      if (hi !== heroIdx) return h;
      return {
        ...h,
        slots: h.slots.map((s, si) => {
          if (si !== slotIdx) return s;
          const isWidget   = si === 4;
          const isLegendary = s.status === "Legendary";
          const locked = isWidget || isLegendary; // goals cannot go below current

          let updated = { ...s, [field]: value };

          // If setting gearCurrent, auto-bump gearGoal up if needed (locked slots)
          if (field === "gearCurrent" && locked) {
            if ((updated.gearGoal ?? 0) < value) updated.gearGoal = value;
          }
          // If setting masteryCurrent (non-widget, legendary), auto-bump masteryGoal
          if (field === "masteryCurrent" && isLegendary && !isWidget) {
            if ((updated.masteryGoal ?? 0) < value) updated.masteryGoal = value;
          }
          // If setting widgetCurrent, auto-bump widgetGoal
          if (field === "widgetCurrent" && isWidget) {
            if ((updated.widgetGoal ?? 0) < value) updated.widgetGoal = value;
          }
          // Prevent goal from being set below current for locked slots
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
  const filteredHeroes = (type) => {
    const maxGenIdx = GEN_ORDER.indexOf(genFilter);
    return HERO_ROSTER.filter(h =>
      h.type === type && GEN_ORDER.indexOf(h.gen) <= maxGenIdx
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
                const heroes  = filteredHeroes(slot.type);
                // ensure selected hero is still valid after gen filter change
                const heroVal = heroes.find(h => h.name === hd.hero) ? hd.hero : (heroes[0]?.name ?? "");

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
                    <tr key={`${slot.slotId}-${gearSlot}`}
                        style={{background: slotIdx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"}}>

                      {/* Type — only on first row of each hero */}
                      {slotIdx === 0 && (
                        <td rowSpan={5} style={{...tdStyle,verticalAlign:"middle",fontWeight:700,color:typeColor,width:110,whiteSpace:"nowrap"}}>
                          {slot.label}
                        </td>
                      )}

                      {/* Hero dropdown — only on first row */}
                      {slotIdx === 0 && (
                        <td rowSpan={5} style={{...tdStyle,verticalAlign:"middle",minWidth:130}}>
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
                          <select value={s.widgetCurrent ?? 0}
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
                            {widgetOpts.filter(v => v >= (s.widgetCurrent ?? 0)).map(v =>
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
  body { background: ${COLORS.bg}; color: ${COLORS.textPri}; font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: ${COLORS.surface}; }
  ::-webkit-scrollbar-thumb { background: ${COLORS.borderHi}; border-radius: 3px; }
  input[type=number] { -moz-appearance: textfield; }
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }

  .app { display: flex; min-height: 100vh; }

  /* Sidebar */
  .sidebar { width: 220px; min-width: 220px; background: ${COLORS.surface}; border-right: 1px solid ${COLORS.border}; display: flex; flex-direction: column; padding: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .sidebar-logo { padding: 20px 20px 16px; border-bottom: 1px solid ${COLORS.border}; }
  .sidebar-logo .wos { font-family: 'Space Mono', monospace; font-size: 11px; color: ${COLORS.accent}; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 2px; }
  .sidebar-logo h1 { font-size: 15px; font-weight: 800; color: ${COLORS.textPri}; line-height: 1.2; }
  .sidebar-logo h1 span { color: ${COLORS.accent}; }
  .sidebar-nav { padding: 12px 8px; flex: 1; }
  .nav-section { font-size: 10px; font-weight: 700; color: ${COLORS.textDim}; letter-spacing: 2px; text-transform: uppercase; padding: 12px 12px 6px; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; color: ${COLORS.textSec}; transition: all 0.15s; border: 1px solid transparent; margin-bottom: 1px; }
  .nav-item:hover { color: ${COLORS.textPri}; background: ${COLORS.card}; }
  .nav-item.active { color: ${COLORS.accent}; background: ${COLORS.accentBg}; border-color: ${COLORS.accentDim}; }
  .nav-item .nav-icon { font-size: 15px; width: 18px; text-align: center; font-family: 'Space Mono', monospace; }
  .nav-badge { margin-left: auto; font-size: 10px; font-family: 'Space Mono', monospace; background: ${COLORS.accentBg}; color: ${COLORS.accent}; border: 1px solid ${COLORS.accentDim}; padding: 1px 6px; border-radius: 3px; }
  .sidebar-footer { padding: 16px 20px; border-top: 1px solid ${COLORS.border}; font-size: 11px; color: ${COLORS.textDim}; font-family: 'Space Mono', monospace; }

  /* Main content */
  .main { flex: 1; overflow-x: hidden; }
  .page-header { padding: 28px 32px 20px; border-bottom: 1px solid ${COLORS.border}; background: ${COLORS.surface}; position: sticky; top: 0; z-index: 10; }
  .page-header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .page-title { font-size: 22px; font-weight: 800; color: ${COLORS.textPri}; }
  .page-title span { color: ${COLORS.accent}; }
  .page-sub { font-size: 13px; color: ${COLORS.textSec}; margin-top: 4px; }
  .last-saved { font-size: 11px; font-family: 'Space Mono', monospace; color: ${COLORS.textDim}; }
  .page-body { padding: 28px 32px; }

  /* Cards */
  .card { background: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 10px; }
  .card-header { padding: 16px 20px; border-bottom: 1px solid ${COLORS.border}; display: flex; align-items: center; justify-content: space-between; }
  .card-title { font-size: 13px; font-weight: 700; color: ${COLORS.textPri}; letter-spacing: 0.5px; text-transform: uppercase; }
  .card-sub { font-size: 12px; color: ${COLORS.textSec}; margin-top: 2px; }
  .card-body { padding: 20px; }

  /* Stat grid */
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .stat-card { background: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 14px 16px; transition: border-color 0.15s; }
  .stat-card:hover { border-color: ${COLORS.borderHi}; }
  .stat-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: ${COLORS.textSec}; margin-bottom: 8px; }
  .stat-value { font-size: 24px; font-weight: 800; font-family: 'Space Mono', monospace; color: ${COLORS.textPri}; line-height: 1; }
  .stat-value.positive { color: ${COLORS.green}; }
  .stat-value.negative { color: ${COLORS.red}; }
  .stat-value.accent { color: ${COLORS.accent}; }
  .stat-sub { font-size: 11px; color: ${COLORS.textSec}; margin-top: 5px; font-family: 'Space Mono', monospace; }

  /* Resource input row */
  .res-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
  .res-item { display: flex; align-items: center; gap: 10px; background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 10px 14px; transition: border-color 0.15s; }
  .res-item:focus-within { border-color: ${COLORS.accent}; }
  .res-icon { font-size: 18px; width: 24px; text-align: center; flex-shrink: 0; font-family: 'Space Mono', monospace; font-size: 13px; color: ${COLORS.textDim}; }
  .res-label { font-size: 12px; font-weight: 600; color: ${COLORS.textSec}; flex: 1; min-width: 0; }
  .res-input { width: 90px; background: transparent; border: none; outline: none; font-family: 'Space Mono', monospace; font-size: 14px; font-weight: 700; color: ${COLORS.textPri}; text-align: right; }
  .res-input::placeholder { color: ${COLORS.textDim}; }

  /* Section divider */
  .section-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${COLORS.textDim}; margin-bottom: 12px; margin-top: 24px; display: flex; align-items: center; gap: 8px; }
  .section-label::after { content: ''; flex: 1; height: 1px; background: ${COLORS.border}; }

  /* Construction table */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: ${COLORS.textDim}; border-bottom: 1px solid ${COLORS.border}; white-space: nowrap; }
  td { padding: 11px 12px; border-bottom: 1px solid ${COLORS.border}; color: ${COLORS.textSec}; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,0.02); }
  td.mono { font-family: 'Space Mono', monospace; font-size: 12px; }
  td.pri { color: ${COLORS.textPri}; font-weight: 600; }
  td.green { color: ${COLORS.green}; font-family: 'Space Mono', monospace; }
  td.red { color: ${COLORS.red}; font-family: 'Space Mono', monospace; }
  td.amber { color: ${COLORS.amber}; font-family: 'Space Mono', monospace; }
  td.accent { color: ${COLORS.accent}; font-family: 'Space Mono', monospace; }

  /* Badge */
  .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; font-family: 'Space Mono', monospace; }
  .badge-green { background: ${COLORS.greenBg}; color: ${COLORS.green}; border: 1px solid ${COLORS.greenDim}; }
  .badge-red { background: ${COLORS.redBg}; color: ${COLORS.red}; border: 1px solid ${COLORS.redDim}; }
  .badge-amber { background: ${COLORS.amberBg}; color: ${COLORS.amber}; }
  .badge-blue { background: ${COLORS.blueBg}; color: ${COLORS.blue}; border: 1px solid ${COLORS.blueDim}; }
  .badge-accent { background: ${COLORS.accentBg}; color: ${COLORS.accent}; border: 1px solid ${COLORS.accentDim}; }

  /* Progress bar */
  .progress-wrap { background: ${COLORS.border}; border-radius: 4px; height: 6px; overflow: hidden; }
  .progress-bar { height: 100%; border-radius: 4px; transition: width 0.3s ease; }

  /* Toggle */
  .toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; gap: 8px; font-size: 13px; color: ${COLORS.textSec}; }
  .toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .toggle-track { width: 36px; height: 20px; background: ${COLORS.border}; border-radius: 10px; transition: background 0.2s; position: relative; flex-shrink: 0; }
  .toggle input:checked ~ .toggle-track { background: ${COLORS.accent}; }
  .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: transform 0.2s; }
  .toggle input:checked ~ .toggle-track .toggle-thumb { transform: translateX(16px); }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; border: 1px solid; font-family: 'Syne', sans-serif; }
  .btn-accent { background: ${COLORS.accent}; color: #0a0c10; border-color: ${COLORS.accent}; }
  .btn-accent:hover { background: #f07d2e; border-color: #f07d2e; }
  .btn-ghost { background: transparent; color: ${COLORS.textSec}; border-color: ${COLORS.border}; }
  .btn-ghost:hover { color: ${COLORS.textPri}; border-color: ${COLORS.borderHi}; background: ${COLORS.surface}; }

  /* Expert cards */
  .expert-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .expert-card { background: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 10px; overflow: hidden; transition: border-color 0.15s; }
  .expert-card:hover { border-color: ${COLORS.borderHi}; }
  .expert-head { padding: 14px 16px; border-bottom: 1px solid ${COLORS.border}; display: flex; align-items: center; gap: 12px; }
  .expert-avatar { width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; font-family: 'Space Mono', monospace; background: ${COLORS.accentBg}; color: ${COLORS.accent}; border: 1px solid ${COLORS.accentDim}; flex-shrink: 0; }
  .expert-name { font-size: 15px; font-weight: 700; color: ${COLORS.textPri}; }
  .expert-bonus { font-size: 11px; color: ${COLORS.textSec}; margin-top: 2px; }
  .expert-body { padding: 12px 16px; }
  .expert-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 12px; color: ${COLORS.textSec}; border-bottom: 1px solid ${COLORS.border}; }
  .expert-row:last-child { border-bottom: none; }
  .expert-val { font-family: 'Space Mono', monospace; font-size: 12px; color: ${COLORS.textPri}; font-weight: 700; }

  /* SVS schedule */
  .svs-row { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid ${COLORS.border}; }
  .svs-row:last-child { border-bottom: none; }
  .svs-day { width: 90px; font-size: 13px; font-weight: 700; color: ${COLORS.textPri}; flex-shrink: 0; }
  .svs-bar-wrap { flex: 1; }
  .svs-pts { font-family: 'Space Mono', monospace; font-size: 13px; color: ${COLORS.accent}; width: 90px; text-align: right; flex-shrink: 0; }

  /* Responsive */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .page-body { padding: 16px; }
    .page-header { padding: 16px; }
    .stat-grid { grid-template-columns: repeat(2, 1fr); }
  }

  /* Animations */
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn 0.25s ease forwards; }

  /* Auth panel */
  .auth-panel { padding: 14px 12px; border-top: 1px solid ${COLORS.border}; }
  .auth-user-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; background: ${COLORS.card}; border: 1px solid ${COLORS.border}; margin-bottom: 8px; }
  .auth-avatar { width: 28px; height: 28px; border-radius: 50%; background: ${COLORS.accentBg}; border: 1px solid ${COLORS.accentDim}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: ${COLORS.accent}; flex-shrink: 0; font-family: 'Space Mono', monospace; }
  .auth-email { font-size: 11px; color: ${COLORS.textSec}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .auth-signout { font-size: 10px; color: ${COLORS.textDim}; cursor: pointer; padding: 2px 6px; border-radius: 4px; border: 1px solid ${COLORS.border}; background: transparent; font-family: 'Space Mono', monospace; transition: all 0.15s; }
  .auth-signout:hover { color: ${COLORS.red}; border-color: ${COLORS.redDim}; }
  .auth-sync-badge { display: flex; align-items: center; gap: 5px; font-size: 10px; color: ${COLORS.green}; font-family: 'Space Mono', monospace; padding: 2px 0; margin-bottom: 4px; }
  .auth-sync-dot { width: 6px; height: 6px; border-radius: 50%; background: ${COLORS.green}; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .auth-form { display: flex; flex-direction: column; gap: 7px; }
  .auth-inp { background: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 6px; padding: 7px 10px; font-family: 'Space Mono', monospace; font-size: 12px; color: ${COLORS.textPri}; outline: none; width: 100%; transition: border-color 0.15s; }
  .auth-inp:focus { border-color: ${COLORS.accent}; }
  .auth-inp::placeholder { color: ${COLORS.textDim}; font-size: 11px; }
  .auth-btn { padding: 8px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Syne', sans-serif; border: none; transition: all 0.15s; width: 100%; }
  .auth-btn-primary { background: ${COLORS.accent}; color: #0a0c10; }
  .auth-btn-primary:hover { opacity: 0.9; }
  .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-btn-ghost { background: transparent; color: ${COLORS.textDim}; border: 1px solid ${COLORS.border}; font-size: 11px; padding: 5px; }
  .auth-btn-ghost:hover { color: ${COLORS.textSec}; border-color: ${COLORS.borderHi}; }
  .auth-error { font-size: 10px; color: ${COLORS.red}; font-family: 'Space Mono', monospace; padding: 5px 8px; background: ${COLORS.redBg}; border-radius: 4px; border: 1px solid ${COLORS.redDim}; line-height: 1.4; }
  .auth-toggle { font-size: 11px; color: ${COLORS.textDim}; text-align: center; }
  .auth-toggle span { color: ${COLORS.accent}; text-decoration: underline; cursor: pointer; }
  .auth-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: ${COLORS.textDim}; margin-bottom: 8px; font-family: 'Space Mono', monospace; }

  /* Character switcher */
  .char-switcher { padding: 10px 10px 0; }
  .char-select { width: 100%; background: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 7px; color: ${COLORS.textPri}; font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; padding: 8px 10px; cursor: pointer; outline: none; transition: border-color 0.15s; }
  .char-select:focus { border-color: ${COLORS.accent}; }
  .char-select option { background: ${COLORS.card}; }

  /* Modal overlay */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: ${COLORS.card}; border: 1px solid ${COLORS.borderHi}; border-radius: 14px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,0.6); }
  .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid ${COLORS.border}; display: flex; align-items: center; justify-content: space-between; }
  .modal-title { font-size: 15px; font-weight: 800; color: ${COLORS.textPri}; }
  .modal-close { background: none; border: none; color: ${COLORS.textDim}; cursor: pointer; font-size: 18px; line-height: 1; padding: 4px; }
  .modal-close:hover { color: ${COLORS.textPri}; }
  .modal-body { padding: 20px 24px; }
  .modal-section { margin-bottom: 24px; }
  .modal-section:last-child { margin-bottom: 0; }
  .modal-section-title { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: ${COLORS.textDim}; margin-bottom: 12px; font-family: 'Space Mono', monospace; }
  .modal-inp { background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 7px; padding: 8px 12px; font-family: 'Space Mono', monospace; font-size: 12px; color: ${COLORS.textPri}; outline: none; width: 100%; transition: border-color 0.15s; box-sizing: border-box; }
  .modal-inp:focus { border-color: ${COLORS.accent}; }
  .modal-inp::placeholder { color: ${COLORS.textDim}; }
  .modal-btn { padding: 9px 16px; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Syne', sans-serif; border: none; transition: all 0.15s; }
  .modal-btn-primary { background: ${COLORS.accent}; color: #0a0c10; }
  .modal-btn-primary:hover { opacity: 0.88; }
  .modal-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
  .modal-btn-ghost { background: transparent; color: ${COLORS.textSec}; border: 1px solid ${COLORS.border}; }
  .modal-btn-ghost:hover { border-color: ${COLORS.borderHi}; color: ${COLORS.textPri}; }
  .modal-btn-danger { background: ${COLORS.redBg}; color: ${COLORS.red}; border: 1px solid ${COLORS.redDim}; }
  .modal-btn-danger:hover { background: ${COLORS.red}; color: #fff; }
  .modal-error { font-size: 11px; color: ${COLORS.red}; font-family: 'Space Mono', monospace; padding: 7px 10px; background: ${COLORS.redBg}; border-radius: 5px; border: 1px solid ${COLORS.redDim}; margin-top: 8px; }
  .modal-success { font-size: 11px; color: ${COLORS.green}; font-family: 'Space Mono', monospace; padding: 7px 10px; background: ${COLORS.greenBg}; border-radius: 5px; border: 1px solid ${COLORS.greenDim}; margin-top: 8px; }
  .char-list-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 8px; margin-bottom: 8px; }
  .char-list-item.is-active { border-color: ${COLORS.accentDim}; background: ${COLORS.accentBg}; }
  .char-avatar-sm { width: 30px; height: 30px; border-radius: 50%; background: ${COLORS.card}; border: 1px solid ${COLORS.border}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: ${COLORS.accent}; flex-shrink: 0; font-family: 'Space Mono', monospace; }
  .char-name-text { font-size: 13px; font-weight: 700; color: ${COLORS.textPri}; }
  .char-state-text { font-size: 10px; color: ${COLORS.textDim}; font-family: 'Space Mono', monospace; }
  .profile-btn-wrap { display: flex; align-items: center; gap: 8px; padding: 12px 12px; cursor: pointer; border-top: 1px solid ${COLORS.border}; transition: background 0.15s; }
  .profile-btn-wrap:hover { background: rgba(255,255,255,0.03); }
  .profile-avatar { width: 28px; height: 28px; border-radius: 50%; background: ${COLORS.accentBg}; border: 1px solid ${COLORS.accentDim}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: ${COLORS.accent}; flex-shrink: 0; font-family: 'Space Mono', monospace; }
`;

// ─── Profile Management Modal ─────────────────────────────────────────────────

function ProfileModal({ open, onClose, initialSection="account",
  user, characters, activeCharId,
  addCharacter, removeCharacter, renameCharacter, makeDefault, switchCharacter,
  changePassword, requestDeleteAccount, confirmDeleteAccount,
  charError, clearCharError, authError, clearAuthError,
}) {
  const [section, setSection]       = useState(initialSection);
  const [msg, setMsg]               = useState("");
  const [msgType, setMsgType]       = useState("success"); // "success"|"error"
  // New character form
  const [newName,  setNewName]      = useState("");
  const [newState, setNewState]     = useState("");
  // Edit character
  const [editId,   setEditId]       = useState(null);
  const [editName, setEditName]     = useState("");
  const [editState,setEditState]    = useState("");
  // Delete account
  const [deleteStep, setDeleteStep] = useState(0); // 0=idle,1=email sent,2=otp entry
  const [otp, setOtp]               = useState("");
  const [busy, setBusy]             = useState(false);

  useEffect(() => { if (open) setSection(initialSection); }, [open, initialSection]);
  useEffect(() => { clearCharError?.(); clearAuthError?.(); setMsg(""); }, [section]);

  const flash = (text, type="success") => { setMsg(text); setMsgType(type); setTimeout(()=>setMsg(""),4000); };

  if (!open) return null;

  const C = COLORS;

  const handleAddChar = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    const c = await addCharacter(newName.trim(), newState ? parseInt(newState) : null);
    setBusy(false);
    if (c) { setNewName(""); setNewState(""); flash(`Character "${c.name}" added!`); }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setBusy(true);
    await renameCharacter(editId, editName.trim(), editState ? parseInt(editState) : null);
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
                          <div style={{display:"flex",gap:6,marginTop:2}}>
                            <button className="modal-btn modal-btn-primary" onClick={handleSaveEdit} disabled={busy}>Save</button>
                            <button className="modal-btn modal-btn-ghost" onClick={()=>setEditId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="char-name-text">{c.name}</div>
                          <div className="char-state-text">{c.state_number ? `State ${c.state_number}` : "No state set"}</div>
                        </>
                      )}
                    </div>
                    {editId !== c.id && (
                      <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                        {c.is_default && <span style={{fontSize:9,fontWeight:700,letterSpacing:1,background:C.accentBg,color:C.accent,border:`1px solid ${C.accentDim}`,padding:"2px 6px",borderRadius:3}}>DEFAULT</span>}
                        <div style={{display:"flex",gap:4}}>
                          <button className="modal-btn modal-btn-ghost" style={{padding:"3px 8px",fontSize:10}}
                            onClick={()=>{ setEditId(c.id); setEditName(c.name); setEditState(c.state_number||""); }}>Edit</button>
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

function ResInput({ label, icon, field, value, onChange, color }) {
  return (
    <div className="res-item" style={color ? { borderColor: color + "40" } : {}}>
      <div className="res-icon">{icon}</div>
      <div className="res-label">{label}</div>
      <input
        className="res-input"
        type="number"
        value={value}
        onChange={e => onChange(field, Number(e.target.value))}
        min={0}
        style={color ? { color } : {}}
      />
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

  return (
    <div className="fade-in">

      {/* 1. Construction Resources */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Construction Resources</div>
            <div className="card-sub">Fire Crystals &amp; Refined FC — your core building currency</div>
          </div>
        </div>
        <div className="card-body">
          <div className="res-grid">
            <ResInput label="Fire Crystals" icon="FC" field="fireCrystals" value={inv.fireCrystals} onChange={update} color={COLORS.accent} />
            <ResInput label="Refined FC" icon="RF" field="refinedFC" value={inv.refinedFC} onChange={update} color={COLORS.accent} />
            <ResInput label="Agnes Skill Level" icon="AG" field="agnesSkillLevel" value={inv.agnesSkillLevel} onChange={update} />
            <ResInput label="Zinman Skill Level" icon="ZN" field="zinmanSkillLevel" value={inv.zinmanSkillLevel} onChange={update} />
          </div>
        </div>
      </div>

      {/* 2. Raw Materials */}
      <SectionLabel>Raw Materials</SectionLabel>
      <div className="card">
        <div className="card-body">
          <div className="res-grid">
            <ResInput label="Meat"  icon="MT" field="meat" value={inv.meat ?? 0} onChange={update} color={COLORS.green} />
            <ResInput label="Wood"  icon="WD" field="wood" value={inv.wood ?? 0} onChange={update} color={COLORS.green} />
            <ResInput label="Coal"  icon="CL" field="coal" value={inv.coal ?? 0} onChange={update} color={COLORS.green} />
            <ResInput label="Iron"  icon="IR" field="iron" value={inv.iron ?? 0} onChange={update} color={COLORS.green} />
          </div>
        </div>
      </div>

      {/* 3. War Academy */}
      <SectionLabel>War Academy</SectionLabel>
      <div className="card">
        <div className="card-body">
          <div className="res-grid">
            <ResInput label="Shards" icon="SH" field="shards" value={inv.shards} onChange={update} color={COLORS.green} />
            <ResInput label="Steel" icon="SL" field="steel" value={inv.steel} onChange={update} color={COLORS.green} />
            <ResInput label="Daily Intel" icon="IN" field="dailyIntel" value={inv.dailyIntel} onChange={update} />
            <ResInput label="Labyrinth (weekly)" icon="LB" field="labyrinthWeekly" value={inv.labyrinthWeekly} onChange={update} />
          </div>
          <div style={{ marginTop: 16 }}>
            <label className="toggle">
              <input type="checkbox" checked={inv.weeklyPack} onChange={e => update("weeklyPack", e.target.checked)} />
              <div className="toggle-track"><div className="toggle-thumb" /></div>
              Weekly pack active (adds shards)
            </label>
          </div>
        </div>
      </div>

      {/* 4. Hero Level & Gear Materials */}
      <SectionLabel>Hero Level &amp; Gear Materials</SectionLabel>
      <div className="card">
        <div className="card-body">
          <div className="res-grid">
            <ResInput label="Stones"                  icon="ST" field="stones"          value={inv.stones}                    onChange={update} color={COLORS.blue} />
            <ResInput label="Mithril"                 icon="MI" field="mithril"         value={inv.mithril}                   onChange={update} color={COLORS.blue} />
            <ResInput label="Consumable Mythic Gear"  icon="MG" field="mythicGear"      value={inv.mythicGear}                onChange={update} color={COLORS.blue} />
            <ResInput label="Mythic General Shards"   icon="MS" field="mythicGenShards" value={inv.mythicGenShards ?? 0}     onChange={update} color={COLORS.blue} />
          </div>
        </div>
      </div>

      {/* 5. Expert Resources */}
      <SectionLabel>Expert Resources</SectionLabel>
      <div className="card">
        <div className="card-body">
          <div className="res-grid">
            <ResInput label="Books of Knowledge" icon="BK" field="books"          value={inv.books}                onChange={update} color={COLORS.amber} />
            <ResInput label="General Sigils"     icon="GS" field="generalSigils"  value={inv.generalSigils}        onChange={update} color={COLORS.amber} />
            <ResInput label="Cyrille Sigils"     icon="CY" field="cyrilleSigils"  value={inv.cyrilleSigils  ?? 0}  onChange={update} color={COLORS.amber} />
            <ResInput label="Agnes Sigils"       icon="AN" field="agnesSigils"    value={inv.agnesSigils    ?? 0}  onChange={update} color={COLORS.amber} />
            <ResInput label="Romulus Sigils"     icon="RO" field="romulusSigils"  value={inv.romulusSigils  ?? 0}  onChange={update} color={COLORS.amber} />
            <ResInput label="Holger Sigils"      icon="HO" field="holgerSigils"   value={inv.holgerSigils   ?? 0}  onChange={update} color={COLORS.amber} />
            <ResInput label="Fabian Sigils"      icon="FA" field="fabianSigils"   value={inv.fabianSigils   ?? 0}  onChange={update} color={COLORS.amber} />
            <ResInput label="Baldur Sigils"      icon="BA" field="baldurSigils"   value={inv.baldurSigils   ?? 0}  onChange={update} color={COLORS.amber} />
            <ResInput label="Valeria Sigils"     icon="VA" field="valeriaSigils"  value={inv.valeriaSigils  ?? 0}  onChange={update} color={COLORS.amber} />
            <ResInput label="Ronne Sigils"       icon="RN" field="ronneSigils"    value={inv.ronneSigils    ?? 0}  onChange={update} color={COLORS.amber} />
          </div>
        </div>
      </div>

      {/* 6. Chief Gear Materials */}
      <SectionLabel>Chief Gear Materials</SectionLabel>
      <div className="card">
        <div className="card-body">
          <div className="res-grid">
            <ResInput label="Plans"  icon="PL" field="chiefPlans"  value={inv.chiefPlans}  onChange={update} />
            <ResInput label="Polish" icon="PO" field="chiefPolish" value={inv.chiefPolish} onChange={update} />
            <ResInput label="Alloy"  icon="AL" field="chiefAlloy"  value={inv.chiefAlloy}  onChange={update} />
            <ResInput label="Amber"  icon="AM" field="chiefAmber"  value={inv.chiefAmber}  onChange={update} />
          </div>
        </div>
      </div>

      {/* 7. Chief Charm Materials */}
      <SectionLabel>Chief Charm Materials</SectionLabel>
      <div className="card">
        <div className="card-body">
          <div className="res-grid">
            <ResInput label="Designs" icon="DS" field="charmDesigns" value={inv.charmDesigns} onChange={update} />
            <ResInput label="Guides"  icon="GD" field="charmGuides"  value={inv.charmGuides}  onChange={update} />
            <ResInput label="Secrets" icon="SC" field="charmSecrets" value={inv.charmSecrets} onChange={update} />
          </div>
        </div>
      </div>
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
  const dailyShards = inv.dailyIntel + (inv.weeklyPack ? 14 : 0) + Math.round(inv.labyrinthWeekly / 7);
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



// ─── Layout / Nav ─────────────────────────────────────────────────────────────
const PAGES = [
  { id:"inventory",    label:"Inventory",     icon:"[I]", section:"Resources"   },
  { id:"construction", label:"Construction",  icon:"[B]", section:"Resources"   },
  { id:"rfc-planner",  label:"RFC Planner",   icon:"[R]", section:"Resources"   },
  { id:"hero-gear",    label:"Hero Gear",     icon:"[H]", section:"Combat"      },
  { id:"experts",      label:"Experts",       icon:"[E]", section:"Combat"      },
  { id:"war-academy",  label:"War Academy",   icon:"[W]", section:"Combat"      },
  { id:"svs-calendar", label:"SvS Calendar",  icon:"[C]", section:"Planning"    },
];

const PAGE_TITLES = {
  inventory:    { title: "Inventory", sub: "Your current stockpile across all resource types" },
  construction: { title: "Construction", sub: "Interactive upgrade planner — set current & goal levels, track accumulation, project SVS points" },
  "rfc-planner":{ title: "RFC Planner",  sub: "28-day day-by-day refining schedule — plan vs actual, running balances, FC income tracking" },
  "hero-gear":  { title: "Hero Gear", sub: "Gear upgrade tracker with material costs and SVS points" },
  experts:      { title: "Expert Planner", sub: "Skill levels, sigil costs, and per-day SVS contributions" },
  "war-academy":{ title: "War Academy", sub: "Infantry, Marksman & Lancer squad upgrade tracker" },
  "svs-calendar":{ title: "SvS Calendar", sub: "Rolling 28-week schedule — SvS every 4th week, King of Icefield every 2nd week" },
  alliance:     { title: "Alliance Scores", sub: "SvS prep scores and historical results" },};

export default function App() {
  const { user, loading: authLoading, error: authError, signUp, signIn, signInWithDiscord, signOut,
          changePassword, requestDeleteAccount, confirmDeleteAccount, clearError } = useAuth();

  const {
    characters, activeCharacter, activeCharId,
    loadingChars, charError, clearCharError,
    switchCharacter, addCharacter, removeCharacter, renameCharacter, makeDefault,
  } = useCharacters(user);

  const [page,          setPage]         = useState("inventory");
  const [inv,           setInvRaw]       = useLocalStorage("wos-svs-inventory", INITIAL_INVENTORY);
  const [savedPlans,    setSavedPlans]   = useLocalStorage("wos-rfc-saved-plans", {});
  const [savedAt,       setSavedAt]      = useState(null);
  const [loadedPlanKey, setLoadedPlanKey]= useState(null);
  const [syncing,       setSyncing]      = useState(false);
  const [profileOpen,   setProfileOpen]  = useState(false);
  const [profileSection,setProfileSection]=useState("account");
  const [savePlanPopup, setSavePlanPopup]= useState({ open:false, defaultName:"", mode:"over" });

  const syncTimer  = useRef(null);
  const prevCharId = useRef(null);

  // ── Load data when active character changes ──────────────────────────────────
  useEffect(() => {
    if (!user || !activeCharId) return;
    if (activeCharId === prevCharId.current) return;
    prevCharId.current = activeCharId;

    (async () => {
      setSyncing(true);
      const [cloudInv, cloudPlans] = await Promise.all([
        charLoadInventory(activeCharId),
        charLoadPlans(activeCharId),
      ]);

      const isNewChar = !cloudInv;
      if (isNewChar) {
        // Brand-new character — seed with local data if it's the first character
        if (characters.length <= 1) {
          const localHasData = Object.keys(INITIAL_INVENTORY).some(k => {
            const d = INITIAL_INVENTORY[k], c = inv[k];
            return typeof d === "boolean" ? c !== d : c !== 0;
          });
          if (localHasData) await charSaveInventory(activeCharId, inv);
        } else {
          // New additional character — reset to blank
          setInvRaw(INITIAL_INVENTORY);
          setSavedPlans({});
        }
      } else {
        if (cloudInv) setInvRaw(cloudInv);
        if (cloudPlans && Object.keys(cloudPlans).length > 0) setSavedPlans(cloudPlans);
        else setSavedPlans({});
      }
      setSyncing(false);
    })();
  }, [user, activeCharId]);

  // ── Reset when user signs out ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { prevCharId.current = null; }
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
          switchCharacter={(id) => { switchCharacter(id); prevCharId.current = null; }}
          changePassword={changePassword}
          requestDeleteAccount={requestDeleteAccount}
          confirmDeleteAccount={confirmDeleteAccount}
          charError={charError}
          clearCharError={clearCharError}
          authError={authError}
          clearAuthError={clearError}
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
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="wos">WoS · SvS</div>
            <h1>Planning<br /><span>Tracker</span></h1>
          </div>

          {/* Character switcher — only for logged-in users with characters */}
          {user && characters.length > 0 && (
            <div className="char-switcher">
              <select className="char-select"
                value={activeCharId || ""}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "__manage__") {
                    setProfileSection("characters");
                    setProfileOpen(true);
                  } else {
                    switchCharacter(val);
                    prevCharId.current = null;
                  }
                }}>
                {characters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.state_number ? ` · State ${c.state_number}` : ""}
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
                    onClick={() => { setLoadedPlanKey(null); setPage(p.id); }}
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
                    onClick={() => handleLoadPlan(key)}
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
                <div style={{fontSize:10,color:COLORS.textDim,fontFamily:"Space Mono,monospace"}}>
                  {syncing ? "Syncing…" : "● Cloud sync"}
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
        </aside>

        <main className="main">
          <div className="page-header">
            <div className="page-header-row">
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
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {user && activeCharacter && (
                  <div style={{fontSize:11,fontFamily:"Space Mono,monospace",color:COLORS.textDim}}>
                    {activeCharacter.name}{activeCharacter.state_number ? ` · State ${activeCharacter.state_number}` : ""}
                  </div>
                )}
                {savedAt && <div className="last-saved">saved {savedAt}</div>}
              </div>
            </div>
          </div>

          <div className="page-body">
            {page === "inventory"    && <InventoryPage    inv={inv} setInv={setInv} />}
            {page === "construction" && <ConstructionPlanner inv={inv} setInv={setInv} />}
            {page === "rfc-planner"  && <RFCPlanner inv={inv} setInv={setInv}
                savedPlans={user ? savedPlans : {}}
                onSavePlan={user ? handleSavePlan : ()=>{}}
                onLoadPlan={handleLoadPlan}
                openSavePopup={user ? openSavePopup : null} />}
            {page === "hero-gear"    && <HeroGearPage     inv={inv} />}
            {page === "experts"      && <ExpertsPage      inv={inv} />}
            {page === "war-academy"  && <WarAcademyPage   inv={inv} />}
            {page === "svs-calendar" && <SvSCalendar />}
          </div>
        </main>
      </div>
    </>
  );
}
