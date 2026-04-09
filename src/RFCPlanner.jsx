import React, { useState, useMemo, useCallback } from "react";
import { buildCycles, getCurrentCycleNum, getCycleStartDate, toIso, fmtIso, fmtDate as fmtDateUtil, cycleLabelFull } from "./svsCalendar.js";

// ─── Exact per-refine lookup table from Misc. Data Tables O13:T112 ────────────
const REFINE_TABLE = [
  {n:1,  tier:"T1",fc:10, rfc:1},  {n:2,  tier:"T1",fc:20,rfc:1},  {n:3,  tier:"T1",fc:20,rfc:1},
  {n:4,  tier:"T1",fc:20,rfc:1},  {n:5,  tier:"T1",fc:20,rfc:1},  {n:6,  tier:"T1",fc:20,rfc:1},
  {n:7,  tier:"T1",fc:20,rfc:1},  {n:8,  tier:"T1",fc:20,rfc:1},  {n:9,  tier:"T1",fc:20,rfc:1},
  {n:10, tier:"T1",fc:20,rfc:1},  {n:11, tier:"T1",fc:20,rfc:1},  {n:12, tier:"T1",fc:20,rfc:1},
  {n:13, tier:"T1",fc:20,rfc:1},  {n:14, tier:"T1",fc:20,rfc:2},  {n:15, tier:"T1",fc:20,rfc:2},
  {n:16, tier:"T1",fc:20,rfc:2},  {n:17, tier:"T1",fc:20,rfc:2},  {n:18, tier:"T1",fc:20,rfc:2},
  {n:19, tier:"T1",fc:20,rfc:3},  {n:20, tier:"T1",fc:20,rfc:3},
  {n:21, tier:"T2",fc:50,rfc:2},  {n:22, tier:"T2",fc:50,rfc:2},  {n:23, tier:"T2",fc:50,rfc:2},
  {n:24, tier:"T2",fc:50,rfc:2},  {n:25, tier:"T2",fc:50,rfc:2},  {n:26, tier:"T2",fc:50,rfc:2},
  {n:27, tier:"T2",fc:50,rfc:2},  {n:28, tier:"T2",fc:50,rfc:2},  {n:29, tier:"T2",fc:50,rfc:2},
  {n:30, tier:"T2",fc:50,rfc:2},  {n:31, tier:"T2",fc:50,rfc:2},  {n:32, tier:"T2",fc:50,rfc:2},
  {n:33, tier:"T2",fc:50,rfc:2},  {n:34, tier:"T2",fc:50,rfc:2},  {n:35, tier:"T2",fc:50,rfc:2},
  {n:36, tier:"T2",fc:50,rfc:2},  {n:37, tier:"T2",fc:50,rfc:2},  {n:38, tier:"T2",fc:50,rfc:3},
  {n:39, tier:"T2",fc:50,rfc:3},  {n:40, tier:"T2",fc:50,rfc:3},
  {n:41, tier:"T3",fc:100,rfc:3}, {n:42, tier:"T3",fc:100,rfc:3}, {n:43, tier:"T3",fc:100,rfc:3},
  {n:44, tier:"T3",fc:100,rfc:3}, {n:45, tier:"T3",fc:100,rfc:3}, {n:46, tier:"T3",fc:100,rfc:3},
  {n:47, tier:"T3",fc:100,rfc:3}, {n:48, tier:"T3",fc:100,rfc:3}, {n:49, tier:"T3",fc:100,rfc:3},
  {n:50, tier:"T3",fc:100,rfc:3}, {n:51, tier:"T3",fc:100,rfc:3}, {n:52, tier:"T3",fc:100,rfc:3},
  {n:53, tier:"T3",fc:100,rfc:3}, {n:54, tier:"T3",fc:100,rfc:3}, {n:55, tier:"T3",fc:100,rfc:3},
  {n:56, tier:"T3",fc:100,rfc:3}, {n:57, tier:"T3",fc:100,rfc:3}, {n:58, tier:"T3",fc:100,rfc:4},
  {n:59, tier:"T3",fc:100,rfc:4}, {n:60, tier:"T3",fc:100,rfc:5},
  {n:61, tier:"T4",fc:130,rfc:3}, {n:62, tier:"T4",fc:130,rfc:3}, {n:63, tier:"T4",fc:130,rfc:3},
  {n:64, tier:"T4",fc:130,rfc:3}, {n:65, tier:"T4",fc:130,rfc:3}, {n:66, tier:"T4",fc:130,rfc:3},
  {n:67, tier:"T4",fc:130,rfc:3}, {n:68, tier:"T4",fc:130,rfc:3}, {n:69, tier:"T4",fc:130,rfc:3},
  {n:70, tier:"T4",fc:130,rfc:3}, {n:71, tier:"T4",fc:130,rfc:3}, {n:72, tier:"T4",fc:130,rfc:3},
  {n:73, tier:"T4",fc:130,rfc:3}, {n:74, tier:"T4",fc:130,rfc:3}, {n:75, tier:"T4",fc:130,rfc:3},
  {n:76, tier:"T4",fc:130,rfc:4}, {n:77, tier:"T4",fc:130,rfc:4}, {n:78, tier:"T4",fc:130,rfc:4},
  {n:79, tier:"T4",fc:130,rfc:5}, {n:80, tier:"T4",fc:130,rfc:6},
  {n:81, tier:"T5",fc:160,rfc:3}, {n:82, tier:"T5",fc:160,rfc:3}, {n:83, tier:"T5",fc:160,rfc:3},
  {n:84, tier:"T5",fc:160,rfc:3}, {n:85, tier:"T5",fc:160,rfc:3}, {n:86, tier:"T5",fc:160,rfc:3},
  {n:87, tier:"T5",fc:160,rfc:3}, {n:88, tier:"T5",fc:160,rfc:3}, {n:89, tier:"T5",fc:160,rfc:3},
  {n:90, tier:"T5",fc:160,rfc:3}, {n:91, tier:"T5",fc:160,rfc:3}, {n:92, tier:"T5",fc:160,rfc:3},
  {n:93, tier:"T5",fc:160,rfc:3}, {n:94, tier:"T5",fc:160,rfc:3}, {n:95, tier:"T5",fc:160,rfc:4},
  {n:96, tier:"T5",fc:160,rfc:4}, {n:97, tier:"T5",fc:160,rfc:5}, {n:98, tier:"T5",fc:160,rfc:5},
  {n:99, tier:"T5",fc:160,rfc:6}, {n:100,tier:"T5",fc:160,rfc:7},
];

function calcRefines(weekCumulativeSoFar, count) {
  if (count <= 0) return { fcBurn:0, rfcEarned:0, tierAtStart:null, tierAfter:null, endCumulative:weekCumulativeSoFar };
  let fcBurn=0, rfcEarned=0, tierAtStart=null, tierAfter=null;
  for (let i=0; i<count; i++) {
    const row = REFINE_TABLE[Math.min(weekCumulativeSoFar+i, REFINE_TABLE.length-1)];
    if (i===0) tierAtStart = row.tier;
    tierAfter = row.tier;
    fcBurn    += row.fc;
    rfcEarned += row.rfc;
  }
  // Tier AFTER this day's refines = tier of the next refine to be done
  const nextRow = REFINE_TABLE[Math.min(weekCumulativeSoFar+count, REFINE_TABLE.length-1)];
  const tierEndOfDay = nextRow ? nextRow.tier : tierAfter;
  return { fcBurn, rfcEarned, tierAtStart, tierAfter: tierEndOfDay, endCumulative: weekCumulativeSoFar+count };
}

const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MON_FAVORITES = [1, 5, 10, 20, 40, 60, 80, 100];

const fmtN = n => typeof n==="number" ? Math.round(n).toLocaleString() : "—";
function loadLS(k,fb){try{const s=localStorage.getItem(k);return s?JSON.parse(s):fb;}catch{return fb;}}
function saveLS(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}

function fmtDate(isoStr) { return fmtIso(isoStr); }

function addDays(isoStr, n) {
  if (!isoStr) return "";
  const d = new Date(isoStr + "T00:00:00");
  if (isNaN(d)) return "";
  d.setDate(d.getDate()+n);
  return toIso(d);
}

// Base plan name: "Month YYYY" (e.g. "April 2026")
function planBaseName(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr + "T00:00:00");
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US",{month:"long",year:"numeric"});
}

// Generate next available key: "April 2026-01", "April 2026-02", etc.
function nextPlanKey(baseName, existingKeys) {
  let seq = 1;
  while (true) {
    const candidate = `${baseName}-${String(seq).padStart(2,"0")}`;
    if (!existingKeys.includes(candidate)) return candidate;
    seq++;
  }
}

// Get the most recent existing key for this base name (for overwrite Save)
function latestPlanKey(baseName, existingKeys) {
  const matches = existingKeys
    .filter(k => k.startsWith(baseName + "-"))
    .sort();
  return matches[matches.length - 1] || null;
}

const C = new Proxy({}, { get(_, key) { return `var(--c-${key})`; } });
// Extra semantic colors not in main theme — fall back gracefully
const C_SVS    = "var(--c-accent)";
const C_SVS_BG = "var(--c-accentBg)";
const C_KOI    = "var(--c-blue)";
const C_KOI_BG = "var(--c-blueBg)";


const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.rp{font-family:'Syne',sans-serif;color:${C.textPri};background:var(--c-bg);min-height:100vh}
.rp-top{background:${C.surface};border-bottom:1px solid ${C.border};padding:20px 28px}
.rp-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:12px}
.rp-title{font-size:20px;font-weight:800}.rp-title span{color:${C.accent}}
.rp-sub{font-size:12px;color:${C.textSec};margin-top:3px}
.header-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.date-ctrl{display:flex;flex-direction:column;gap:3px}
.date-lbl{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.textDim};font-family:'Space Mono',monospace}
.date-inp{background:${C.card};border:1px solid ${C.border};border-radius:6px;padding:5px 10px;font-family:'Space Mono',monospace;font-size:12px;color:${C.textPri};outline:none;cursor:pointer;transition:border-color .15s}
.date-inp:focus{border-color:${C.accent}}
.save-btn{padding:7px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Syne',sans-serif;background:${C.accentBg};color:${C.accent};border:1px solid ${C.accentDim};transition:all .15s;white-space:nowrap}
.save-btn:hover{background:${C.accent};color:#0a0c10}
.rp-body{padding:22px 28px;display:flex;flex-direction:column;gap:20px}

/* Summary tiles */
.sum-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.stile{background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:12px 14px;transition:border-color .15s}
.stile.ed:focus-within{border-color:${C.accent}}
.stile:not(.ed):hover{border-color:${C.borderHi}}
.sl{font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${C.textDim};font-family:'Space Mono',monospace;margin-bottom:5px;display:flex;align-items:center;gap:5px}
.sl-e{font-size:8px;color:${C.accentDim}}
.sv{font-size:20px;font-weight:800;font-family:'Space Mono',monospace;line-height:1}
.sv-inp{font-size:20px;font-weight:800;font-family:'Space Mono',monospace;line-height:1;background:transparent;border:none;outline:none;width:100%;color:inherit;-moz-appearance:textfield}
.sv-inp::-webkit-outer-spin-button,.sv-inp::-webkit-inner-spin-button{-webkit-appearance:none}
.ss{font-size:9px;color:${C.textDim};margin-top:4px;font-family:'Space Mono',monospace}

/* Section head */
.shd{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.textDim};display:flex;align-items:center;gap:8px;margin-bottom:10px}
.shd::after{content:'';flex:1;height:1px;background:${C.border}}

/* Settings */
.cfg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.cfg-item{display:flex;flex-direction:column;gap:5px}
.cfg-lbl{font-size:11px;font-weight:600;color:${C.blue}}
.cfg-hint{font-size:10px;color:${C.textDim}}
.cfg-inp{background:${C.surface};border:1px solid ${C.blueDim};border-radius:7px;padding:7px 10px;font-family:'Space Mono',monospace;font-size:13px;color:${C.blue};outline:none;width:100%;transition:border-color .15s;cursor:pointer}
.cfg-inp:focus{border-color:${C.blue}}
.cfg-inp option,.cfg-inp optgroup{background:${C.card};color:${C.textPri}}
.cfg-wrap{background:rgba(56,139,253,0.05);border:1px solid ${C.blueDim};border-radius:10px;padding:14px 16px}

/* Table */
.day-table{background:${C.card};border:1px solid ${C.border};border-radius:12px;overflow:hidden}

/* Week 2 (KOI) — neon blue outline */
.day-table.wk2{border:1.5px solid var(--c-blueDim);box-shadow:0 0 16px var(--c-blueDim)66,inset 0 0 12px var(--c-blueDim)18}

/* Week 4 (SvS) — neon yellow outline */
.day-table.wk4{border:1.5px solid var(--c-accentDim);box-shadow:0 0 18px var(--c-accentDim)88,inset 0 0 14px var(--c-accentDim)18}

.dt-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
table.dt{border-collapse:collapse;font-size:12px;width:100%;min-width:680px}
table.dt col.c-day{width:130px}
table.dt col.c-ref{width:90px}
table.dt col.c-tier{width:60px}
table.dt col.c-rfc{width:80px}
table.dt col.c-fcb{width:80px}
table.dt col.c-wkr{width:90px}
table.dt col.c-rol{width:90px}

table.dt thead tr{background:${C.surface}}
table.dt th{padding:8px 10px;font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${C.textDim};font-family:'Space Mono',monospace;white-space:nowrap;text-align:left;border-right:1px solid ${C.border};border-bottom:1px solid ${C.border}}
table.dt th:last-child{border-right:none}
table.dt th.r{text-align:right}

table.dt td{padding:0;border-bottom:1px solid ${C.border};border-right:1px solid ${C.border};vertical-align:middle;height:36px}
table.dt td:last-child{border-right:none}
table.dt tr:last-child td{border-bottom:none}
table.dt tr:hover td{background:var(--c-hover)}
table.dt tr.mon-row td{background:rgba(56,139,253,0.05)}

.cp{padding:0 10px;display:flex;align-items:center;height:36px;font-family:'Space Mono',monospace;font-size:11px}
.cp.r{justify-content:flex-end;text-align:right}

td.ec{position:relative}
td.ec select,td.ec input{position:absolute;inset:0;width:100%;height:100%;background:transparent;border:none;outline:none;font-family:'Space Mono',monospace;font-size:11px;color:${C.textPri};padding:0 10px;cursor:pointer}
td.ec select:focus,td.ec input:focus{background:rgba(227,107,26,0.1)}
td.ec input[type=number]{-moz-appearance:textfield;text-align:right}
td.ec input[type=number]::-webkit-outer-spin-button,td.ec input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
td.ec select.mon-sel{color:${C.accent};font-weight:700}
.locked-val{display:flex;align-items:center;justify-content:flex-end;height:36px;padding:0 10px;font-family:'Space Mono',monospace;font-size:11px;color:${C.textDim}}

.tp{padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;font-family:'Space Mono',monospace;white-space:nowrap;display:inline-block}
.tp1{background:${C.blueBg};color:${C.blue};border:1px solid ${C.blueDim}}
.tp2{background:${C.accentBg};color:${C.accent};border:1px solid ${C.accentDim}}
.tp3{background:${C.amberBg};color:${C.amber};border:1px solid #7d5a0d}
.tp4{background:var(--c-blueBg);color:var(--c-blue);border:1px solid #0f5a60}
.tp5{background:var(--c-accentBg);color:var(--c-accent)}

.dc{display:flex;align-items:center;gap:5px;padding:0 10px;height:36px;white-space:nowrap}
.dn{font-weight:700;color:${C.textPri};font-family:'Space Mono',monospace;font-size:11px;min-width:16px;text-align:right;flex-shrink:0}
.dw{font-size:11px;color:${C.textSec};flex-shrink:0}
.dd{font-size:9px;color:${C.textDim};font-family:'Space Mono',monospace;flex-shrink:0}

/* Week divider rows — each week is its own table, so the divider is the table's label */
.wk-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;font-family:'Space Mono',monospace;padding:6px 0 8px;display:flex;align-items:center;gap:8px}
.wk-label::after{content:'';flex:1;height:1px;background:${C.border}}
.wk-label.wk-svs{color:var(--c-accent)}
.wk-label.wk-koi{color:var(--c-blue)}
.wk-label.wk-prep{color:${C.textDim}}

/* tfoot */
tr.dt-foot td{background:${C.surface}!important;border-top:2px solid ${C.borderHi};font-family:'Space Mono',monospace;font-size:11px;font-weight:700;padding:8px 10px}

.note{background:${C.accentBg};border:1px solid ${C.accentDim};border-radius:8px;padding:10px 14px;font-size:12px;color:${C.textSec};line-height:1.6}
.note strong{color:${C.accent}}
.save-toast{position:fixed;bottom:24px;right:24px;background:${C.greenBg};border:1px solid ${C.greenDim};border-radius:8px;padding:10px 16px;font-size:12px;color:${C.green};font-family:'Space Mono',monospace;z-index:999;animation:fadeUp .3s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
`;

function TierPill({ tier }) {
  if (!tier) return null;
  const cls={T1:"tp tp1",T2:"tp tp2",T3:"tp tp3",T4:"tp tp4",T5:"tp tp5"}[tier]||"tp tp1";
  return <span className={cls}>{tier}</span>;
}

function MonSelect({ value, onChange }) {
  return (
    <select className="mon-sel" value={value} onChange={e=>onChange(Number(e.target.value))}>
      <optgroup label="── Favorites ──">
        {MON_FAVORITES.map(v=><option key={v} value={v}>{v}</option>)}
      </optgroup>
      <optgroup label="── All (1–100) ──">
        {Array.from({length:100},(_,i)=>i+1).map(v=><option key={v} value={v}>{v}</option>)}
      </optgroup>
    </select>
  );
}

function WkdaySelect({ value, onChange }) {
  return (
    <select value={value} onChange={e=>onChange(Number(e.target.value))}>
      {Array.from({length:40},(_,i)=>i+1).map(v=><option key={v} value={v}>{v}</option>)}
    </select>
  );
}

const EMPTY_ACTUALS = Array.from({length:28},()=>({refines:"",rfcUsed:""}));

export default function RFCPlanner({ inv, setInv, savedPlans, onSavePlan, openSavePopup }) {
  const currentCycle = useMemo(()=>getCurrentCycleNum(),[]);
  const cycleOpts    = useMemo(()=>buildCycles(Math.max(1,currentCycle-1), 16),[currentCycle]);

  const [selectedCycle, setSelectedCycle] = useState(()=>loadLS("rfc-cycle", currentCycle));
  const [monRefines,  setMonRefines]  = useState(()=>loadLS("rfc-monref",  1));
  const [weekdayMode, setWeekdayMode] = useState(()=>loadLS("rfc-wdmode",  "default"));
  const [actuals,     setActuals]     = useState(()=>loadLS("rfc-actuals2", EMPTY_ACTUALS));
  const [toast,       setToast]       = useState("");

  // Start date is always derived from the selected cycle (Prep1 Monday = 3 weeks before SvS)
  const startDate = useMemo(()=>{
    const d = getCycleStartDate(selectedCycle);
    return toIso(d);
  },[selectedCycle]);

  const updateActual = useCallback((idx,field,val)=>{
    setActuals(prev=>{
      const next=prev.map((d,i)=>i===idx?{...d,[field]:val===""?"":isNaN(Number(val))?val:Number(val)}:d);
      saveLS("rfc-actuals2",next);
      return next;
    });
  },[]);

  const persistInv = field=>val=>setInv(p=>({...p,[field]:val}));

  const applyMonRefines = useCallback(val=>{
    setMonRefines(val);
    saveLS("rfc-monref",val);
    setActuals(prev=>{
      const next=prev.map((d,i)=>WEEKDAYS[i%7]==="Monday"?{...d,refines:val}:d);
      saveLS("rfc-actuals2",next);
      return next;
    });
  },[]);

  // ── Rows (Week 4 = SvS, Week 2 = KOI — fixed) ────────────────────────────
  const rows = useMemo(()=>{
    let rollingRFC = inv.refinedFC;
    let weekCumRef = 0;
    const out=[];
    for(let i=0;i<28;i++){
      const dayNum  = i+1;
      const weekday = WEEKDAYS[i%7];
      const isMon   = weekday==="Monday";
      const weekNum = Math.floor(i/7)+1;   // 1-4
      const act     = actuals[i]||{};
      const dateStr = addDays(startDate,i);

      if(isMon) weekCumRef=0;

      let refines;
      if(isMon)                        refines = act.refines!==""?Number(act.refines):monRefines;
      else if(weekdayMode==="default") refines = 1;
      else                             refines = act.refines!==""?Number(act.refines):1;

      const{fcBurn,rfcEarned,tierAtStart,tierAfter,endCumulative}=calcRefines(weekCumRef,refines);
      const rfcUsed=act.rfcUsed!==""?Number(act.rfcUsed):0;
      rollingRFC+=rfcEarned-rfcUsed;
      weekCumRef=endCumulative;

      // For Monday, show the tier AFTER doing all refines (where you end up)
      // For other days, show starting tier
      const displayTier = isMon ? tierAfter : tierAtStart;

      out.push({dayNum,weekday,isMon,weekNum,dateStr,refines,tier:displayTier,fcBurn,rfcEarned,rfcUsed,weekCumRef,rollingRFC,act});
    }
    return out;
  },[inv.refinedFC,monRefines,weekdayMode,actuals,startDate]);

  const totals=useMemo(()=>({
    refines:rows.reduce((s,r)=>s+r.refines,0),
    fcBurn: rows.reduce((s,r)=>s+r.fcBurn,0),
    rfcRec: rows.reduce((s,r)=>s+r.rfcEarned,0),
    finalRFC:rows[27]?.rollingRFC??inv.refinedFC,
  }),[rows,inv.refinedFC]);

  const buildPlanData = () => ({
    savedAt: new Date().toISOString(),
    selectedCycle, startDate, monRefines, weekdayMode, actuals,
    fireCrystals: inv.fireCrystals, refinedFC: inv.refinedFC,
  });

  const baseName = planBaseName(startDate) || `Cycle ${selectedCycle}`;
  const existingKeys = Object.keys(savedPlans);

  // Ask for nickname then save, overwriting the most recent plan for this month
  const saveOver = async () => {
    const existing = latestPlanKey(baseName, existingKeys);
    const autoName = existing || nextPlanKey(baseName, existingKeys);
    let key = autoName;
    if (openSavePopup) {
      key = await new Promise((resolve, reject) => {
        openSavePopup(autoName, "over", resolve, reject);
      }).catch(() => null);
      if (!key) return; // user cancelled
    }
    onSavePlan(key, { key, ...buildPlanData() });
    setToast(`Saved: ${key}`);
    setTimeout(()=>setToast(""), 2500);
  };

  // Ask for nickname then save as a new numbered slot
  const saveNew = async () => {
    const autoName = nextPlanKey(baseName, existingKeys);
    let key = autoName;
    if (openSavePopup) {
      key = await new Promise((resolve, reject) => {
        openSavePopup(autoName, "new", resolve, reject);
      }).catch(() => null);
      if (!key) return;
    }
    onSavePlan(key, { key, ...buildPlanData() });
    setToast(`Saved: ${key}`);
    setTimeout(()=>setToast(""), 2500);
  };

  // Group rows into 4 weeks
  const weeks=[0,1,2,3].map(wi=>rows.slice(wi*7,(wi+1)*7));

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:STYLE}}/>
      <div className="rp">

        {/* Header */}
        <div className="rp-top">
          <div className="rp-title-row">
            <div>
              <div className="rp-title">RFC <span>Refining Planner</span></div>
              <div className="rp-sub">28-day schedule · exact per-refine FC/RFC · Week 2 = KOI · Week 4 = SvS</div>
            </div>
            <div className="header-controls">
              <div className="date-ctrl">
                <span className="date-lbl">SvS Cycle</span>
                <select className="date-inp" value={selectedCycle}
                  onChange={e=>{const v=Number(e.target.value);setSelectedCycle(v);saveLS("rfc-cycle",v);}}>
                  {cycleOpts.map(c=>(
                    <option key={c.cycleNum} value={c.cycleNum}>
                      {cycleLabelFull(c.cycleNum,cycleOpts)}{c.cycleNum===currentCycle?" ★":""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="date-ctrl">
                <span className="date-lbl">Plan starts</span>
                <span className="date-inp" style={{color:"var(--c-textSec)",cursor:"default"}}>
                  {startDate ? fmtDate(startDate) : "—"}
                </span>
              </div>
              <div className="date-ctrl">
                <span className="date-lbl">Save plan</span>
                <div style={{display:"flex",gap:6}}>
                  <button className="save-btn" onClick={saveOver}
                    title="Overwrite the most recent plan for this month"
                    disabled={!onSavePlan}>
                    ↓ Save
                  </button>
                  <button className="save-btn" onClick={saveNew}
                    title="Create a new numbered plan for this month"
                    disabled={!onSavePlan}
                    style={{background:"transparent",border:`1px solid ${C.accentDim}`,color:C.accent}}>
                    + Save New
                  </button>
                </div>
                {!onSavePlan && <div style={{fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace",marginTop:4}}>Sign in to save plans</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="rp-body">

          {/* Summary tiles */}
          <div className="sum-grid">
            <div className="stile ed">
              <div className="sl">Starting FC <span className="sl-e">✎</span></div>
              <input className="sv-inp" type="number" min={0} style={{color:C.accent}}
                value={inv.fireCrystals} onChange={e=>persistInv("fireCrystals")(Number(e.target.value))}/>
              <div className="ss">current inventory</div>
            </div>
            <div className="stile ed">
              <div className="sl">Starting RFC <span className="sl-e">✎</span></div>
              <input className="sv-inp" type="number" min={0} style={{color:C.accent}}
                value={inv.refinedFC} onChange={e=>persistInv("refinedFC")(Number(e.target.value))}/>
              <div className="ss">current inventory</div>
            </div>
            <div className="stile">
              <div className="sl">FC after week 4</div>
              <div className="sv" style={{color:C.textPri}}>
                {fmtN(inv.fireCrystals - rows.reduce((s,r)=>s+r.fcBurn,0))}
              </div>
              <div className="ss">after all burns</div>
            </div>
            <div className="stile">
              <div className="sl">RFC at SvS week</div>
              <div className="sv" style={{color:rows[20]?.rollingRFC>=0?C.green:C.red}}>
                {fmtN(rows[20]?.rollingRFC)}
              </div>
              <div className="ss">start of week 4</div>
            </div>
            <div className="stile">
              <div className="sl">Total FC burned</div>
              <div className="sv" style={{color:C.amber}}>{fmtN(totals.fcBurn)}</div>
              <div className="ss">28-day total</div>
            </div>
            <div className="stile">
              <div className="sl">Total RFC earned</div>
              <div className="sv" style={{color:C.blue}}>{fmtN(totals.rfcRec)}</div>
              <div className="ss">28-day total</div>
            </div>
            <div className="stile">
              <div className="sl">Total refines</div>
              <div className="sv" style={{color:C.textPri}}>{fmtN(totals.refines)}</div>
              <div className="ss">28-day total</div>
            </div>
            <div className="stile">
              <div className="sl">Final RFC balance</div>
              <div className="sv" style={{color:totals.finalRFC>=0?C.green:C.red}}>{fmtN(totals.finalRFC)}</div>
              <div className="ss">end of day 28</div>
            </div>
          </div>

          {/* Settings — 2 items only */}
          <div>
            <div className="shd">Refine settings</div>
            <div className="cfg-wrap">
              <div className="cfg-grid">
                <div className="cfg-item">
                  <label className="cfg-lbl">Set Monday refines to</label>
                  <span className="cfg-hint" style={{whiteSpace:"nowrap"}}>Applies to all 4 Mondays · each row is still individually editable</span>
                  <select className="cfg-inp" value={monRefines} onChange={e=>applyMonRefines(Number(e.target.value))}>
                    <optgroup label="── Favorites ──">
                      {MON_FAVORITES.map(v=><option key={v} value={v}>{v} refines</option>)}
                    </optgroup>
                    <optgroup label="── All (1–100) ──">
                      {Array.from({length:100},(_,i)=>i+1).map(v=><option key={v} value={v}>{v}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div className="cfg-item">
                  <label className="cfg-lbl">Tue–Sun refinement mode</label>
                  <span className="cfg-hint" style={{whiteSpace:"nowrap"}}>Select Default or Manual Entry</span>
                  <select className="cfg-inp" value={weekdayMode}
                    onChange={e=>{setWeekdayMode(e.target.value);saveLS("rfc-wdmode",e.target.value);}}>
                    <option value="default">Default — 1 refine each day (locked)</option>
                    <option value="manual">Manual — set each day individually</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Four week tables, each with its own label and glow ── */}
          {weeks.map((wkRows,wi)=>{
            const weekNum  = wi+1;
            const isSvS    = weekNum===4;
            const isKOI    = weekNum===2;
            const wkStart  = wkRows[0]?.dateStr;
            const wkLabel  = isSvS
              ? `Week 4 — SvS Week${wkStart?" — Starts "+fmtDate(wkStart):""}`
              : isKOI
                ? `Week 2 — KOI${wkStart?" — Starts "+fmtDate(wkStart):""}`
                : `Week ${weekNum}${wkStart?" — Starts "+fmtDate(wkStart):""}`;
            const labelCls = isSvS?"wk-label wk-svs":isKOI?"wk-label wk-koi":"wk-label wk-prep";
            const tableCls = isSvS?"day-table wk4":isKOI?"day-table wk2":"day-table";

            return (
              <div key={weekNum}>
                <div className={labelCls}>{wkLabel}</div>
                <div className={tableCls}>
                  <div className="dt-scroll">
                    <table className="dt">
                      <colgroup>
                        <col className="c-day"/>
                        <col className="c-ref"/>
                        <col className="c-tier"/>
                        <col className="c-rfc"/>
                        <col className="c-fcb"/>
                        <col className="c-wkr"/>
                        <col className="c-rol"/>
                      </colgroup>
                      {/* Only show header on week 1 */}
                      {weekNum===1&&(
                        <thead>
                          <tr>
                            <th>Day</th>
                            <th className="r">Refines</th>
                            <th>Tier</th>
                            <th className="r">RFC rec'd</th>
                            <th className="r">FC burn</th>
                            <th className="r">Wkly refines</th>
                            <th className="r">Rolling RFC</th>
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {wkRows.map((r,ri)=>{
                          const rfcCol = r.rollingRFC>=0?C.green:C.red;
                          const isManWkday = !r.isMon&&weekdayMode==="manual";
                          return (
                            <tr key={r.dayNum} className={r.isMon?"mon-row":""}>
                              <td>
                                <div className="dc">
                                  <span className="dn">{r.dayNum}</span>
                                  <span className="dw">{r.weekday.slice(0,3)}</span>
                                  {r.dateStr&&<span className="dd">{fmtDate(r.dateStr)}</span>}
                                </div>
                              </td>
                              <td className="ec">
                                {r.isMon?(
                                  <MonSelect value={r.refines} onChange={v=>updateActual((wi*7)+ri,"refines",v)}/>
                                ):isManWkday?(
                                  <WkdaySelect value={r.refines} onChange={v=>updateActual((wi*7)+ri,"refines",v)}/>
                                ):(
                                  <span className="locked-val">1</span>
                                )}
                              </td>
                              <td>
                                <div className="cp">
                                  {r.refines>0?<TierPill tier={r.tier}/>:null}
                                </div>
                              </td>
                              <td>
                                <div className="cp r" style={{color:r.rfcEarned>0?C.blue:C.textDim,fontWeight:700}}>
                                  {r.rfcEarned>0?fmtN(r.rfcEarned):"—"}
                                </div>
                              </td>
                              <td>
                                <div className="cp r" style={{color:r.fcBurn>0?C.accent:C.textDim,fontWeight:700}}>
                                  {r.fcBurn>0?fmtN(r.fcBurn):"—"}
                                </div>
                              </td>
                              <td>
                                <div className="cp r" style={{color:C.textSec}}>
                                  {r.weekCumRef}
                                </div>
                              </td>
                              <td>
                                <div className="cp r" style={{color:rfcCol,fontWeight:700}}>
                                  {fmtN(r.rollingRFC)}
                                </div>
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
          })}

          <div className="note">
            <strong>Tier</strong> is auto-calculated per-refine from your spreadsheet lookup table (O13:T112).
            <strong style={{color:C.accent}}> Week 4 = SvS week</strong> (neon yellow outline).
            <strong style={{color:C.blue}}> Week 2 = King of Icefield</strong> (neon blue outline).
            Monday resets weekly refine count. Use <strong>Set Monday refines to</strong> for Favorites or any value 1–120.
          </div>

        </div>
      </div>
      {toast&&<div className="save-toast">{toast}</div>}
    </>
  );
}
