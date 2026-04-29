import React, { useState } from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { useTierContext, GuestBanner } from "./TierContext.jsx";

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

// ─── Formatting helpers ───────────────────────────────────────────────────────
const fmt = n => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(1)+"K";
  return Math.round(n).toLocaleString();
};

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
function ChiefGearPage({ inv, onCompleteSvs }) {
  const C = COLORS;
  const { isGuest, isPro } = useTierContext();
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

      {isGuest && (
        <GuestBanner message="Track and progress saving requires a free account. Sign up to save your levels and sync across devices." />
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
                    <td style={tdMono}>{showDeploy ? (goalRow[9] > 0 ? `+${goalRow[9].toLocaleString()}` : "—") : "—"}</td>
                  </tr>
                  {changed && isPro && (
                    <tr style={{ background: idx%2===0 ? "rgba(56,139,253,0.04)" : "rgba(56,139,253,0.06)" }}>
                      <td colSpan={9} style={{ padding:"2px 10px 8px 32px" }}>
                        <table style={{ borderCollapse:"collapse", fontSize:10, minWidth:320 }}>
                          <thead>
                            <tr>
                              {["Stat","Current","Change","Goal"].map(h => (
                                <th key={h} style={{ padding:"1px 8px", textAlign:h==="Stat"?"left":"right",
                                  color:C.textDim, fontSize:9, fontWeight:700, letterSpacing:"0.8px" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label:"Power",              cur:curRow[6], goal:goalRow[6], pct:false },
                              { label:`${piece.troop} ATK%`, cur:curRow[7], goal:goalRow[7], pct:true  },
                              { label:`${piece.troop} DEF%`, cur:curRow[8], goal:goalRow[8], pct:true  },
                              ...(showDeploy ? [{ label:"Deploy Buff", cur:curRow[9], goal:goalRow[9], pct:false }] : []),
                            ].map(({ label, cur, goal, pct }) => {
                              const diff = goal - cur;
                              const diffCol = diff > 0 ? C.blue : diff < 0 ? C.red : C.textDim;
                              const fmtVal = v => pct ? (v*100).toFixed(2)+"%" : fmt(v);
                              const fmtDiff = d => pct ? (d>0?"+":"")+((d)*100).toFixed(2)+"%" : (d>0?"+":"")+fmt(d);
                              return (
                                <tr key={label}>
                                  <td style={{ padding:"1px 8px", fontSize:10, color:C.textDim, whiteSpace:"nowrap" }}>{label}</td>
                                  <td style={{ padding:"1px 8px", fontFamily:"'Space Mono',monospace", fontSize:10, textAlign:"right", color:C.textSec }}>{fmtVal(cur)}</td>
                                  <td style={{ padding:"1px 8px", fontFamily:"'Space Mono',monospace", fontSize:10, textAlign:"right", color:diffCol }}>{diff===0?"—":fmtDiff(diff)}</td>
                                  <td style={{ padding:"1px 8px", fontFamily:"'Space Mono',monospace", fontSize:10, textAlign:"right", color:C.textPri }}>{fmtVal(goal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
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

// Compute cost between two stored values (1-based; 0=None)
// curVal and goalVal are 1-based indices into CHIEF_CHARM_LEVELS
function calcCharmCost(curVal, goalVal) {
  let guides=0, designs=0, secrets=0;
  if (!curVal || !goalVal || goalVal <= curVal) return { guides, designs, secrets };
  // stored value N → array index N-1; we sum from curVal to goalVal-1 (0-based)
  for (let i = curVal; i < goalVal; i++) {
    const r = CHIEF_CHARM_LEVELS[i];
    if (!r) break; // safety: out-of-bounds guard
    guides  += r.guides  ?? 0;
    designs += r.designs ?? 0;
    secrets += r.secrets ?? 0;
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

function ChiefCharmsPage({ inv, onCompleteSvs }) {
  const C = COLORS;
  const { isGuest, isPro } = useTierContext();
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
    if (s.current >= s.goal) return acc;
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

      {isGuest && (
        <GuestBanner message="Track and progress saving requires a free account. Sign up to save your levels and sync across devices." />
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
              <th style={{ ...thS, textAlign:"right" }}>Lethality</th>
              <th style={{ ...thS, textAlign:"right" }}>Health</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s, idx) => {
              const curLvl  = s.current > 0 ? CHIEF_CHARM_LEVELS[s.current - 1] : null;
              const goalLvl = s.goal    > 0 ? CHIEF_CHARM_LEVELS[s.goal    - 1] : null;
              const cost = (s.current < s.goal) ? calcCharmCost(s.current, s.goal) : { guides:0, designs:0, secrets:0 };
              const changed = s.current !== s.goal;

              // Track grouping labels
              const showTroop = idx === 0 || slots[idx-1].troop !== s.troop;
              const showGear  = idx === 0 || slots[idx-1].gear  !== s.gear;
              const charmNum  = (idx % 3) + 1;

              const goalLeth = s.goal > 0 ? CHIEF_CHARM_LEVELS[s.goal-1].leth   : 0;
              const goalHp   = s.goal > 0 ? CHIEF_CHARM_LEVELS[s.goal-1].health : 0;

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
                    <td style={tdMono}>{goalLeth > 0 ? `${(goalLeth * 100).toFixed(2)}%` : "—"}</td>
                    <td style={tdMono}>{goalHp   > 0 ? `${(goalHp   * 100).toFixed(2)}%` : "—"}</td>
                  </tr>
                  {changed && isPro && (
                    <tr style={{ background: Math.floor(idx/3)%2===0 ? "rgba(56,139,253,0.04)" : "rgba(56,139,253,0.06)" }}>
                      <td colSpan={10} style={{ padding:"2px 10px 8px 32px" }}>
                        <table style={{ borderCollapse:"collapse", fontSize:10, minWidth:300 }}>
                          <thead>
                            <tr>
                              {["Stat","Current","Change","Goal"].map(h => (
                                <th key={h} style={{ padding:"1px 8px", textAlign:h==="Stat"?"left":"right",
                                  color:C.textDim, fontSize:9, fontWeight:700, letterSpacing:"0.8px" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label:"Power",      cur: curLvl?.power  ?? 0, goal: goalLvl?.power  ?? 0, pct:false },
                              { label:"Lethality%", cur: curLvl?.leth   ?? 0, goal: goalLvl?.leth   ?? 0, pct:true  },
                              { label:"Health%",    cur: curLvl?.health ?? 0, goal: goalLvl?.health ?? 0, pct:true  },
                            ].map(({ label, cur, goal, pct }) => {
                              const diff = goal - cur;
                              const diffCol = diff > 0 ? C.blue : diff < 0 ? C.red : C.textDim;
                              const fmtVal = v => pct ? (v*100).toFixed(2)+"%" : fmt(v);
                              const fmtDiff = d => pct ? (d>0?"+":"")+((d)*100).toFixed(2)+"%" : (d>0?"+":"")+fmt(d);
                              return (
                                <tr key={label}>
                                  <td style={{ padding:"1px 8px", fontSize:10, color:C.textDim, whiteSpace:"nowrap" }}>{label}</td>
                                  <td style={{ padding:"1px 8px", fontFamily:"'Space Mono',monospace", fontSize:10, textAlign:"right", color:C.textSec }}>{fmtVal(cur)}</td>
                                  <td style={{ padding:"1px 8px", fontFamily:"'Space Mono',monospace", fontSize:10, textAlign:"right", color:diffCol }}>{diff===0?"—":fmtDiff(diff)}</td>
                                  <td style={{ padding:"1px 8px", fontFamily:"'Space Mono',monospace", fontSize:10, textAlign:"right", color:C.textPri }}>{fmtVal(goal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
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


// Daybreak Island page — see ./DaybreakIsland.jsx
// ─── Character Profile Page ───────────────────────────────────────────────────

// ─── Exports ──────────────────────────────────────────────────────────────────
export { ChiefGearPage, ChiefCharmsPage, CHIEF_GEAR_LEVELS, CHIEF_CHARM_LEVELS };
