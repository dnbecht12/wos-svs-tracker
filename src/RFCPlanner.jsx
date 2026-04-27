import React, { useState, useMemo, useCallback, useEffect } from "react";
import { _isGuest, useLocalStorage, scheduleSync } from "./useLocalStorage.js";
import { buildCycles, getCurrentCycleNum, getCycleStartDate, toIso, fmtIso, fmtDate as fmtDateUtil, cycleLabelFull } from "./svsCalendar.js";
import { supabase } from "./supabase.js";

const ADMIN_UID = "c5c3392e-2399-4cc9-b2ab-f22a61e7b91c";

// ─── Per-refine lookup table (v66b) ───────────────────────────────────────────────────
const REFINE_TABLE = [
  {n:1,  tier:"T1",fc:20,rfc:1},  {n:2,  tier:"T1",fc:20,rfc:1},  {n:3,  tier:"T1",fc:20,rfc:1},
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

// First refine of each day gets 50% FC discount
function calcRefines(weekCumulativeSoFar, count) {
  if (count <= 0) return { fcBurn:0, rfcEarned:0, tierAtStart:null, tierAfter:null, endCumulative:weekCumulativeSoFar };
  let fcBurn=0, rfcEarned=0, tierAtStart=null, tierAfter=null;
  for (let i=0; i<count; i++) {
    const idx = Math.min(Math.max(weekCumulativeSoFar+i, 0), REFINE_TABLE.length-1);
    const row = REFINE_TABLE[idx];
    if (!row) continue;
    if (i===0) tierAtStart = row.tier;
    tierAfter = row.tier;
    fcBurn    += i===0 ? Math.ceil(row.fc * 0.5) : row.fc;
    rfcEarned += row.rfc;
  }
  const nextIdx = Math.min(Math.max(weekCumulativeSoFar+count, 0), REFINE_TABLE.length-1);
  const nextRow = REFINE_TABLE[nextIdx];
  const tierEndOfDay = nextRow ? nextRow.tier : tierAfter;
  return { fcBurn, rfcEarned, tierAtStart, tierAfter: tierEndOfDay, endCumulative: weekCumulativeSoFar+count };
}

const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MON_FAVORITES = [1, 5, 10, 20, 40, 60, 80, 100];

const fmtN = n => typeof n==="number" ? Math.round(n).toLocaleString() : "—";
function loadLS(k,fb){
  try{
    if(typeof _isGuest!=="undefined"&&_isGuest) return fb;
    const store = _isGuest ? sessionStorage : localStorage;
    const s=store.getItem(k);return s?JSON.parse(s):fb;
  }catch{return fb;}
}
function saveLS(k,v){
  try{
    const store = _isGuest ? sessionStorage : localStorage;
    store.setItem(k,JSON.stringify(v));
    // Also sync to Supabase via scheduleSync (debounced 800ms)
    if(!_isGuest) scheduleSync(k,v);
  }catch{}
}
function fmtDate(isoStr){return fmtIso(isoStr);}
function addDays(isoStr,n){
  if(!isoStr)return"";
  const d=new Date(isoStr+"T00:00:00");
  if(isNaN(d))return"";
  d.setDate(d.getDate()+n);
  return toIso(d);
}
function planBaseName(isoStr){
  if(!isoStr)return"";
  const d=new Date(isoStr+"T00:00:00");
  if(isNaN(d))return"";
  return d.toLocaleDateString("en-US",{month:"long",year:"numeric"});
}
function nextPlanKey(baseName,existingKeys){
  let seq=1;
  while(true){
    const candidate=`${baseName}-${String(seq).padStart(2,"0")}`;
    if(!existingKeys.includes(candidate))return candidate;
    seq++;
  }
}
function latestPlanKey(baseName,existingKeys){
  const matches=existingKeys.filter(k=>k.startsWith(baseName+"-")).sort();
  return matches[matches.length-1]||null;
}

const C = new Proxy({},{ get(_,key){ return `var(--c-${key})`; } });

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
.date-lbl{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.textSec};font-family:'Space Mono',monospace}
.date-inp{background:${C.card};border:1px solid ${C.border};border-radius:6px;padding:5px 10px;font-family:'Space Mono',monospace;font-size:12px;color:${C.textPri};outline:none;cursor:pointer;transition:border-color .15s}
.date-inp:focus{border-color:${C.accent}}
.save-btn{padding:7px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Syne',sans-serif;background:${C.accentBg};color:${C.accent};border:1px solid ${C.accentDim};transition:all .15s;white-space:nowrap}
.save-btn:hover{background:${C.accent};color:#0a0c10}
.rp-body{padding:22px 28px;display:flex;flex-direction:column;gap:20px}
.sum-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.stile{background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:12px 14px;transition:border-color .15s}
.stile.ed:focus-within{border-color:${C.accent}}
.stile:not(.ed):hover{border-color:${C.borderHi}}
.sl{font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${C.textSec};font-family:'Space Mono',monospace;margin-bottom:5px;display:flex;align-items:center;gap:5px}
.sl-e{font-size:8px;color:${C.accentDim}}
.sv{font-size:20px;font-weight:800;font-family:'Space Mono',monospace;line-height:1}
.sv-inp{font-size:20px;font-weight:800;font-family:'Space Mono',monospace;line-height:1;background:transparent;border:none;outline:none;width:100%;color:inherit;-moz-appearance:textfield}
.sv-inp::-webkit-outer-spin-button,.sv-inp::-webkit-inner-spin-button{-webkit-appearance:none}
.ss{font-size:9px;color:${C.textDim};margin-top:4px;font-family:'Space Mono',monospace}
.shd{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.textSec};display:flex;align-items:center;gap:8px;margin-bottom:10px}
.shd::after{content:'';flex:1;height:1px;background:${C.border}}
.cfg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.cfg-item{display:flex;flex-direction:column;gap:5px}
.cfg-lbl{font-size:11px;font-weight:600;color:${C.blue}}
.cfg-hint{font-size:10px;color:${C.textSec}}
.cfg-inp{background:${C.surface};border:1px solid ${C.blueDim};border-radius:7px;padding:7px 10px;font-family:'Space Mono',monospace;font-size:13px;color:${C.blue};outline:none;width:100%;transition:border-color .15s;cursor:pointer}
.cfg-inp:focus{border-color:${C.blue}}
.cfg-inp option,.cfg-inp optgroup{background:${C.card};color:${C.textPri}}
.cfg-wrap{background:rgba(56,139,253,0.05);border:1px solid ${C.blueDim};border-radius:10px;padding:14px 16px}
.day-table{background:${C.card};border:1px solid ${C.border};border-radius:12px;overflow:hidden}
.day-table.wk2{border:1.5px solid var(--c-blueDim);box-shadow:0 0 16px var(--c-blueDim)66,inset 0 0 12px var(--c-blueDim)18}
.day-table.wk4{border:1.5px solid var(--c-accentDim);box-shadow:0 0 18px var(--c-accentDim)88,inset 0 0 14px var(--c-accentDim)18}
.dt-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
table.dt{border-collapse:collapse;font-size:12px;width:100%;min-width:960px}
table.dt col.c-day{width:120px}
table.dt col.c-ref{width:75px}
table.dt col.c-tier{width:55px}
table.dt col.c-est{width:80px}
table.dt col.c-fcb{width:70px}
table.dt col.c-wkr{width:75px}
table.dt col.c-act{width:90px}
table.dt col.c-used{width:80px}
table.dt col.c-rol{width:85px}
table.dt col.c-evt{width:90px}
table.dt col.c-dlt{width:110px}
table.dt thead tr{background:${C.surface}}
table.dt th{padding:8px 10px;font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${C.textSec};font-family:'Space Mono',monospace;white-space:nowrap;text-align:left;border-right:1px solid ${C.border};border-bottom:1px solid ${C.border}}
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
td.ec select option{background:${C.card};color:${C.textPri}}
td.ec input[type=number]{-moz-appearance:textfield;text-align:right}
td.ec input[type=number]::-webkit-outer-spin-button,td.ec input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
td.ec select.mon-sel{color:${C.accent};font-weight:700}
.locked-val{display:flex;align-items:center;justify-content:flex-end;height:36px;padding:0 10px;font-family:'Space Mono',monospace;font-size:11px;color:${C.textSec}}
.tp{padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;font-family:'Space Mono',monospace;white-space:nowrap;display:inline-block}
.tp1{background:${C.blueBg};color:${C.blue};border:1px solid ${C.blueDim}}
.tp2{background:${C.accentBg};color:${C.accent};border:1px solid ${C.accentDim}}
.tp3{background:${C.amberBg};color:${C.amber};border:1px solid #7d5a0d}
.tp4{background:var(--c-blueBg);color:var(--c-blue);border:1px solid #0f5a60}
.tp5{background:var(--c-accentBg);color:var(--c-accent)}
.dc{display:flex;align-items:center;gap:5px;padding:0 10px;height:36px;white-space:nowrap}
.dn{font-weight:700;color:${C.textPri};font-family:'Space Mono',monospace;font-size:11px;min-width:16px;text-align:right;flex-shrink:0}
.dw{font-size:11px;color:${C.textPri};flex-shrink:0}
.dd{font-size:9px;color:${C.textSec};font-family:'Space Mono',monospace;flex-shrink:0}
.wk-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;font-family:'Space Mono',monospace;padding:6px 0 8px;display:flex;align-items:center;gap:8px}
.wk-label::after{content:'';flex:1;height:1px;background:${C.border}}
.wk-label.wk-svs{color:var(--c-accent)}
.wk-label.wk-koi{color:var(--c-blue)}
.wk-label.wk-prep{color:${C.textSec}}
tr.dt-foot td{background:${C.surface}!important;border-top:2px solid ${C.borderHi};font-family:'Space Mono',monospace;font-size:11px;font-weight:700;padding:8px 10px}
.note{background:${C.accentBg};border:1px solid ${C.accentDim};border-radius:8px;padding:10px 14px;font-size:12px;color:${C.textPri};line-height:1.6}
.note strong{color:${C.accent}}
.save-toast{position:fixed;bottom:24px;right:24px;background:${C.greenBg};border:1px solid ${C.greenDim};border-radius:8px;padding:10px 16px;font-size:12px;color:${C.green};font-family:'Space Mono',monospace;z-index:999;animation:fadeUp .3s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.accept-btn{padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700;cursor:pointer;font-family:'Space Mono',monospace;border:1px solid ${C.amber};background:${C.amberBg};color:${C.amber};white-space:nowrap;transition:all .15s;line-height:1.4}
.accept-btn:hover{background:${C.amber};color:#0a0c10}
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

const EMPTY_ACTUALS = Array.from({length:28},()=>({
  refines:"", actualRfc:"", eventRfc:"", rfcUsed:"",
}));

// Read total RFC needed from Construction Planner localStorage
function getConstructionRfcNeeded() {
  try {
    const raw = localStorage.getItem("cp-buildings");
    if (!raw) return 0;
    // Import inline to avoid circular dep — same logic as getInventoryBuildingTotals
    const buildings = JSON.parse(raw);
    const FC_LEVELS = ["FC1","FC2","FC3","FC4","FC5","FC6","FC7","FC8","FC9","FC10"];
    const RFC_COST = {
      Furnace:     {FC6:80,FC7:110,FC8:160,FC9:300,FC10:350},
      Embassy:     {FC5:8,FC6:20,FC7:32,FC8:50,FC9:88,FC10:87},
      Infantry:    {FC5:16,FC6:45,FC7:76,FC8:114,FC9:166,FC10:157},
      Marksman:    {FC5:16,FC6:45,FC7:76,FC8:114,FC9:166,FC10:157},
      Lancer:      {FC5:16,FC6:45,FC7:76,FC8:114,FC9:166,FC10:157},
      Command:     {FC5:8,FC6:20,FC7:32,FC8:50,FC9:84,FC10:70},
      Infirmary:   {FC5:8,FC6:20,FC7:32,FC8:50,FC9:84,FC10:70},
      "War Academy":{FC5:16,FC6:45,FC7:76,FC8:114,FC9:166,FC10:157},
    };
    let total = 0;
    buildings.forEach(b => {
      const fromIdx = FC_LEVELS.indexOf(b.current);
      const toIdx   = FC_LEVELS.indexOf(b.goal);
      if (fromIdx < 0 || toIdx <= fromIdx) return;
      const rfc = RFC_COST[b.name] || {};
      for (let i = fromIdx + 1; i <= toIdx; i++) total += rfc[FC_LEVELS[i]] || 0;
    });
    return total;
  } catch { return 0; }
}

export default function RFCPlanner({ inv, setInv, savedPlans, onSavePlan, openSavePopup, currentUser }) {
  const currentCycle = useMemo(()=>getCurrentCycleNum(),[]);
  const cycleOpts    = useMemo(()=>buildCycles(Math.max(1,currentCycle-1),16),[currentCycle]);

  const [selectedCycle, setSelectedCycle] = useState(()=>loadLS("rfc-cycle",currentCycle));
  const [monRefines,    setMonRefines]    = useState(()=>loadLS("rfc-monref",1));
  const [weekdayMode,   setWeekdayMode]   = useState(()=>loadLS("rfc-wdmode","default"));
  const [actuals,       setActuals]       = useState(()=>loadLS(`rfc-actuals2-${loadLS("rfc-cycle", 1)}`,EMPTY_ACTUALS));
  const [estEventRfc,   setEstEventRfc]   = useState(()=>loadLS("rfc-est-event",0));
  const [toast,         setToast]         = useState("");

  // Re-read all RFC keys from localStorage on login or character switch
  const [charSwitchCount, setCharSwitchCount] = useState(0);
  useEffect(() => {
    const handler = () => {
      setCharSwitchCount(n => n + 1);
      setSelectedCycle(loadLS("rfc-cycle", currentCycle));
      setMonRefines(loadLS("rfc-monref", 1));
      setWeekdayMode(loadLS("rfc-wdmode", "default"));
      setActuals(loadLS(`rfc-actuals2-${loadLS("rfc-cycle", 1)}`, EMPTY_ACTUALS));
      setEstEventRfc(loadLS("rfc-est-event", 0));
    };
    window.addEventListener("wos-char-ready", handler);
    window.addEventListener("wos-user-ready", handler);
    return () => {
      window.removeEventListener("wos-char-ready", handler);
      window.removeEventListener("wos-user-ready", handler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCycle]);

  // Is the selected cycle in the past? If so, view-only.
  const isPastCycle = selectedCycle < currentCycle;

  const startDate = useMemo(()=>{
    const d = getCycleStartDate(selectedCycle);
    return toIso(d);
  },[selectedCycle]);

  // Today's day index (0-27) within the selected cycle, or -1 if not current cycle
  const todayDayIdx = useMemo(()=>{
    if (selectedCycle !== currentCycle) return -1;
    const today = new Date(); today.setHours(0,0,0,0);
    const start = new Date(startDate + "T00:00:00"); start.setHours(0,0,0,0);
    const diff = Math.floor((today - start) / 86400000);
    return Math.min(Math.max(diff, 0), 27);
  },[selectedCycle, currentCycle, startDate]);

  const updateActual = useCallback((idx,field,val)=>{
    if (isPastCycle) return; // past cycles are read-only
    setActuals(prev=>{
      const next=prev.map((d,i)=>i===idx?{...d,[field]:val===""?"":isNaN(Number(val))?val:Number(val)}:d);
      saveLS(`rfc-actuals2-${selectedCycle}`,next);
      return next;
    });
  },[isPastCycle, selectedCycle]);

  const persistInv = field=>val=>setInv(p=>({...p,[field]:val}));

  const applyMonRefines = useCallback(val=>{
    setMonRefines(val);
    saveLS("rfc-monref",val);
    setActuals(prev=>{
      const next=prev.map((d,i)=>WEEKDAYS[i%7]==="Monday"?{...d,refines:val}:d);
      saveLS(`rfc-actuals2-${selectedCycle}`,next);
      return next;
    });
  },[selectedCycle]);

  // ── Row calculation ────────────────────────────────────────────────────────
  const rows = useMemo(()=>{\n    let rollingRFC = inv.refinedFC;
    let weekCumRef = 0;
    const out=[];
    for(let i=0;i<28;i++){
      const dayNum  = i+1;
      const weekday = WEEKDAYS[i%7];
      const isMon   = weekday==="Monday";
      const weekNum = Math.floor(i/7)+1;
      const act     = actuals[i]||{};
      const dateStr = addDays(startDate,i);

      if(isMon) weekCumRef=0;

      let refines;
      if(isMon) refines = act.refines!==""?Number(act.refines):monRefines;
      else       refines = act.refines!==""?Number(act.refines):1;

      const {fcBurn,rfcEarned,tierAtStart,tierAfter,endCumulative} = calcRefines(weekCumRef,refines);

      const hasActual  = act.actualRfc!==""&&act.actualRfc!=null;
      const effectiveRfc = hasActual ? Number(act.actualRfc) : rfcEarned;
      const eventRfc   = act.eventRfc!==""&&act.eventRfc!=null ? Number(act.eventRfc) : 0;
      const rfcUsed    = act.rfcUsed!==""&&act.rfcUsed!=null ? Number(act.rfcUsed) : 0;

      rollingRFC += effectiveRfc + eventRfc - rfcUsed;

      weekCumRef = endCumulative;

      // difference: how much MORE the projected RFC is vs current inventory (live)
      const difference = rollingRFC - inv.refinedFC;
      const variance   = hasActual ? Number(act.actualRfc) - rfcEarned : null;
      const displayTier = isMon ? tierAfter : tierAtStart;

      out.push({
        dayNum,weekday,isMon,weekNum,dateStr,
        refines,tier:displayTier,fcBurn,
        estRfc:rfcEarned,effectiveRfc,eventRfc,rfcUsed,
        rollingRFC,difference,variance,
        hasActual,act,weekCumRef,
      });
    }
    return out;
  },[inv.refinedFC,monRefines,weekdayMode,actuals,startDate]);

  const totals=useMemo(()=>({
    refines: rows.reduce((s,r)=>s+r.refines,0),
    fcBurn:  rows.reduce((s,r)=>s+r.fcBurn,0),
    estRfc:  rows.reduce((s,r)=>s+r.estRfc,0),
    actualEventRfc: rows.reduce((s,r)=>s+r.eventRfc,0),
    finalRFC:rows[27]?.rollingRFC??inv.refinedFC,
  }),[rows,inv.refinedFC]);

  // RFC accumulation card values
  const constructionRfcNeeded = useMemo(()=>getConstructionRfcNeeded(),[selectedCycle, charSwitchCount]);
  const projectedRfcAtSvS = rows[20]?.rollingRFC ?? inv.refinedFC;
  const rfcBalance = projectedRfcAtSvS - constructionRfcNeeded;

  const hasVariances = rows.some(r=>r.variance!==null&&r.variance!==0);

  const submitVariance = useCallback(async()=>{
    const variances = rows
      .filter(r=>r.variance!==null&&r.variance!==0)
      .map(r=>({
        date:r.dateStr, day:r.dayNum, weekday:r.weekday,
        tier:r.tier, refines:r.refines,
        estRfc:r.estRfc, actualRfc:Number(r.act.actualRfc),
        variance:r.variance,
      }));
    if(!variances.length)return;
    await supabase.from("stat_submissions").insert({
      hero_name:`RFC Variance — Cycle ${selectedCycle}`,
      submitted_by:currentUser?.id||null,
      character_name:`Cycle ${selectedCycle}`,
      stars:0,level:0,widget:0,
      stats:{type:"rfc_variance",cycle:selectedCycle,startDate,variances},
    });
    setToast("Variance submitted for admin review.");
    setTimeout(()=>setToast(""),2500);
  },[rows,selectedCycle,startDate,currentUser]);

  const buildPlanData=()=>({
    savedAt:new Date().toISOString(),
    selectedCycle,startDate,monRefines,weekdayMode,actuals,estEventRfc,
    fireCrystals:inv.fireCrystals,refinedFC:inv.refinedFC,
  });

  const baseName=planBaseName(startDate)||`Cycle ${selectedCycle}`;
  const existingKeys=Object.keys(savedPlans);

  const saveOver=async()=>{
    const existing=latestPlanKey(baseName,existingKeys);
    const autoName=existing||nextPlanKey(baseName,existingKeys);
    let key=autoName;
    if(openSavePopup){
      key=await new Promise((resolve,reject)=>{
        openSavePopup(autoName,"over",resolve,reject);
      }).catch(()=>null);
      if(!key)return;
    }
    onSavePlan(key,{key,...buildPlanData()});
    setToast(`Saved: ${key}`);
    setTimeout(()=>setToast(""),2500);
  };

  const saveNew=async()=>{
    const autoName=nextPlanKey(baseName,existingKeys);
    let key=autoName;
    if(openSavePopup){
      key=await new Promise((resolve,reject)=>{
        openSavePopup(autoName,"new",resolve,reject);
      }).catch(()=>null);
      if(!key)return;
    }
    onSavePlan(key,{key,...buildPlanData()});
    setToast(`Saved: ${key}`);
    setTimeout(()=>setToast(""),2500);
  };

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
              <div className="rp-sub">28-day schedule · first daily refine at 50% FC · Week 2 = KOI · Week 4 = SvS</div>
            </div>
            <div className="header-controls">
              <div className="date-ctrl">
                <span className="date-lbl">SvS Cycle</span>
                <select className="date-inp" value={selectedCycle}
                  onChange={e=>{
                    const v=Number(e.target.value);
                    setSelectedCycle(v);
                    saveLS("rfc-cycle",v);
                    // Load actuals for the new cycle (fresh if none saved)
                    const cycleActuals = loadLS(`rfc-actuals2-${v}`, EMPTY_ACTUALS);
                    setActuals(cycleActuals);
                  }}>
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
                  {startDate?fmtDate(startDate):"—"}
                </span>
              </div>
              <div className="date-ctrl">
                <span className="date-lbl">Save plan</span>
                <div style={{display:"flex",gap:6}}>
                  <button className="save-btn" onClick={saveOver} disabled={!onSavePlan} title="Overwrite most recent plan">↓ Save</button>
                  <button className="save-btn" onClick={saveNew} disabled={!onSavePlan}
                    style={{background:"transparent",border:`1px solid ${C.accentDim}`,color:C.accent}}>+ Save New</button>
                </div>
                {!onSavePlan&&<div style={{fontSize:10,color:C.textSec,fontFamily:"Space Mono,monospace",marginTop:4}}>Sign in to save plans</div>}
              </div>
              {/* Variance submit — admin only */}
              {currentUser?.id===ADMIN_UID&&hasVariances&&(
                <div className="date-ctrl">
                  <span className="date-lbl">Variance data</span>
                  <button className="save-btn" onClick={submitVariance}
                    style={{background:"transparent",border:`1px solid ${C.blue}`,color:C.blue}}>
                    📊 Submit Variance
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rp-body">

          {/* Summary tiles */}
          <div className="sum-grid">
            <div className="stile ed">
              <div className="sl">FC Inventory <span className="sl-e">✎</span></div>
              <input className="sv-inp" type="number" min={0} style={{color:C.accent}}
                value={inv.fireCrystals} onChange={e=>persistInv("fireCrystals")(Number(e.target.value))}/>
              <div className="ss">current inventory</div>
            </div>
            <div className="stile ed">
              <div className="sl">RFC Inventory <span className="sl-e">✎</span></div>
              <input className="sv-inp" type="number" min={0} style={{color:C.accent}}
                value={inv.refinedFC} onChange={e=>persistInv("refinedFC")(Number(e.target.value))}/>
              <div className="ss">current inventory</div>
            </div>
            <div className="stile">
              <div className="sl">RFC at SvS week</div>
              <div className="sv" style={{color:rows[20]?.rollingRFC>=0?C.green:C.red}}>{fmtN(rows[20]?.rollingRFC)}</div>
              <div className="ss">start of week 4</div>
            </div>
            <div className="stile">
              <div className="sl">Total refines</div>
              <div className="sv" style={{color:C.textPri}}>{fmtN(totals.refines)}</div>
              <div className="ss">28-day total</div>
            </div>
          </div>

          {/* Settings */}
          <div>
            <div className="shd">Refine settings</div>
            <div className="cfg-wrap">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,alignItems:"end"}}>
                <div className="cfg-item">
                  <label className="cfg-lbl">Set Monday refines to</label>
                  <span className="cfg-hint">Applies to all 4 Mondays · each row is still individually editable</span>
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
                  <span className="cfg-hint">Default set to 1/day</span>
                  <select className="cfg-inp" value={weekdayMode}
                    onChange={e=>{setWeekdayMode(e.target.value);saveLS("rfc-wdmode",e.target.value);}}>
                    <option value="default">Default — 1 refine each day (editable)</option>
                    <option value="manual">Manual — all days start blank</option>
                  </select>
                </div>
                <div className="cfg-item">
                  <label className="cfg-lbl">Est. RFC from Events (this cycle)</label>
                  <span className="cfg-hint">Expected RFC from recurring events — used in projection only</span>
                  <input type="number" min={0} className="cfg-inp"
                    value={estEventRfc}
                    onChange={e=>{const v=Number(e.target.value)||0;setEstEventRfc(v);saveLS("rfc-est-event",v);}}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Week tables */}
          {weeks.map((wkRows,wi)=>{
            const weekNum=wi+1;
            const isSvS=weekNum===4;
            const isKOI=weekNum===2;
            const wkStart=wkRows[0]?.dateStr;
            const wkLabel=isSvS
              ?`Week 4 — SvS Week${wkStart?" — Starts "+fmtDate(wkStart):""}`
              :isKOI
                ?`Week 2 — KOI${wkStart?" — Starts "+fmtDate(wkStart):""}`
                :`Week ${weekNum}${wkStart?" — Starts "+fmtDate(wkStart):""}`;
            const labelCls=isSvS?"wk-label wk-svs":isKOI?"wk-label wk-koi":"wk-label wk-prep";
            const tableCls=isSvS?"day-table wk4":isKOI?"day-table wk2":"day-table";

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
                        <col className="c-est"/>
                        <col className="c-fcb"/>
                        <col className="c-wkr"/>
                        <col className="c-act"/>
                        <col className="c-evt"/>
                        <col className="c-used"/>
                        <col className="c-rol"/>
                        <col className="c-dlt"/>
                      </colgroup>
                      {weekNum===1&&(
                        <thead>
                          <tr>
                            <th>Day</th>
                            <th className="r">Refines</th>
                            <th>Tier</th>
                            <th className="r">Est. RFC Rec'd</th>
                            <th className="r">FC Burn</th>
                            <th className="r">Wkly Refines</th>
                            <th className="r">Actual RFC Rec'd</th>
                            <th className="r">Event RFC Rec'd</th>
                            <th className="r">RFC Used</th>
                            <th className="r">Rolling RFC</th>
                            <th className="r">Difference</th>
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {wkRows.map((r,ri)=>{
                          const globalIdx=(wi*7)+ri;
                          const isToday   = globalIdx === todayDayIdx;
                          const isPast    = isPastCycle || (selectedCycle === currentCycle && globalIdx < todayDayIdx);
                          const rollingColor=r.rollingRFC>=0?C.green:C.red;
                          const diffColor=r.difference===0?C.textSec:r.difference>0?C.green:C.red;
                          const hasVar=r.variance!==null&&r.variance!==0;

                          // Read-only inputs for past days
                          const roStyle={pointerEvents:"none",opacity:0.6};

                          return (
                            <tr key={r.dayNum} className={r.isMon?"mon-row":""}
                              style={isToday?{background:"rgba(227,107,26,0.06)"}:{}}>

                              {/* Day */}
                              <td>
                                <div className="dc">
                                  <span className="dn" style={isToday?{color:"var(--c-accent)"}:{}}>{r.dayNum}</span>
                                  <span className="dw">{r.weekday.slice(0,3)}</span>
                                  {r.dateStr&&<span className="dd">{fmtDate(r.dateStr)}</span>}
                                  {isToday&&<span style={{fontSize:8,color:"var(--c-accent)",fontWeight:700,fontFamily:"Space Mono,monospace"}}>TODAY</span>}
                                </div>
                              </td>

                              {/* Refines */}
                              <td className="ec" style={isPast?roStyle:{}}>
                                {r.isMon
                                  ?<MonSelect value={r.refines} onChange={v=>updateActual(globalIdx,"refines",v)}/>
                                  :<WkdaySelect value={r.refines} onChange={v=>updateActual(globalIdx,"refines",v)}/>
                                }
                              </td>

                              {/* Tier */}
                              <td>
                                <div className="cp">
                                  {r.refines>0?<TierPill tier={r.tier}/>:null}
                                </div>
                              </td>

                              {/* Est. RFC Rec'd */}
                              <td>
                                <div className="cp r" style={{color:hasVar?C.amber:r.estRfc>0?C.blue:C.textSec,fontWeight:700,gap:4}}>
                                  {r.estRfc>0?fmtN(r.estRfc):"—"}
                                  {hasVar&&<span style={{fontSize:9,color:C.amber}}>{r.variance>0?"+":""}{r.variance}</span>}
                                </div>
                              </td>

                              {/* FC Burn */}
                              <td>
                                <div className="cp r" style={{color:r.fcBurn>0?C.accent:C.textSec,fontWeight:700}}>
                                  {r.fcBurn>0?fmtN(r.fcBurn):"—"}
                                </div>
                              </td>

                              {/* Wkly Refines */}
                              <td>
                                <div className="cp r" style={{color:C.textPri}}>{r.weekCumRef||""}</div>
                              </td>

                              {/* Actual RFC Rec'd */}
                              <td className="ec" style={isPast?roStyle:{}}>
                                <input type="number" min={0}
                                  value={r.act.actualRfc??""}
                                  placeholder="—"
                                  onChange={e=>updateActual(globalIdx,"actualRfc",e.target.value)}
                                  style={{color:r.hasActual?C.green:C.textSec}}
                                />
                              </td>

                              {/* Event RFC Rec'd */}
                              <td className="ec" style={isPast?roStyle:{}}>
                                <input type="number" min={0}
                                  value={r.act.eventRfc??""}
                                  placeholder="—"
                                  onChange={e=>updateActual(globalIdx,"eventRfc",e.target.value)}
                                  style={{color:r.act.eventRfc!==""&&r.act.eventRfc!=null?"var(--c-blue)":C.textSec}}
                                />
                              </td>

                              {/* RFC Used */}
                              <td className="ec" style={isPast?roStyle:{}}>
                                <input type="number" min={0}
                                  value={r.act.rfcUsed??""}
                                  placeholder="—"
                                  onChange={e=>updateActual(globalIdx,"rfcUsed",e.target.value)}
                                  style={{color:r.act.rfcUsed!==""&&r.act.rfcUsed!=null?C.red:C.textSec}}
                                />
                              </td>

                              {/* Rolling RFC */}
                              <td>
                                <div className="cp r" style={{color:rollingColor,fontWeight:700}}>
                                  {fmtN(r.rollingRFC)}
                                </div>
                              </td>

                              {/* Difference — only show for today */}
                              <td>
                                <div className="cp r" style={{gap:5,justifyContent:"flex-end"}}>
                                  {isToday && (
                                    <span style={{color:diffColor,fontWeight:700,fontFamily:"Space Mono,monospace",fontSize:11}}>
                                      {r.difference===0?"✓":`${r.difference>0?"+":""}${fmtN(r.difference)}`}
                                    </span>
                                  )}
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

          {/* ── RFC Accumulation Card ──────────────────────────────────────── */}
          {isPastCycle && (
            <div style={{padding:"10px 16px",background:"var(--c-amberBg)",border:"1px solid var(--c-amber)40",
              borderRadius:8,fontSize:12,color:"var(--c-amber)",fontFamily:"Space Mono,monospace",marginBottom:4}}>
              📁 Viewing a past cycle — this plan is archived and read-only.
            </div>
          )}

          <div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",
              fontFamily:"Space Mono,monospace",color:"var(--c-textSec)",display:"flex",
              alignItems:"center",gap:8,marginBottom:10}}>
              RFC Accumulation
              <span style={{flex:1,height:1,background:"var(--c-border)",display:"block"}}/>
            </div>
            <div style={{background:"var(--c-card)",border:"1px solid var(--c-border)",borderRadius:12,padding:"18px 20px",maxWidth:480}}>

              {/* Current RFC */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--c-border)",fontSize:13}}>
                <span style={{color:"var(--c-textPri)"}}>Current RFC</span>
                <span style={{fontFamily:"Space Mono,monospace",fontWeight:700,color:"var(--c-accent)"}}>{fmtN(inv.refinedFC)}</span>
              </div>

              {/* Est. RFC from Refining */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--c-border)",fontSize:13}}>
                <span style={{color:"var(--c-textSec)"}}>Est. RFC from Refining</span>
                <span style={{fontFamily:"Space Mono,monospace",fontWeight:700,color:"var(--c-blue)"}}>+{fmtN(totals.estRfc)}</span>
              </div>

              {/* Est. RFC from Events */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"2px solid var(--c-borderHi)",fontSize:13}}>
                <span style={{color:"var(--c-textSec)"}}>Est. RFC from Events</span>
                <span style={{fontFamily:"Space Mono,monospace",fontWeight:700,color:"var(--c-blue)"}}>+{fmtN(estEventRfc)}</span>
              </div>

              {/* Projected RFC at SvS */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--c-border)",fontSize:14}}>
                <span style={{color:"var(--c-textPri)",fontWeight:800}}>Projected RFC at SvS</span>
                <span style={{fontFamily:"Space Mono,monospace",fontWeight:800,fontSize:18,color:projectedRfcAtSvS>=0?"var(--c-accent)":"var(--c-red)"}}>{fmtN(projectedRfcAtSvS)}</span>
              </div>

              {/* Total RFC Needed */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--c-border)",fontSize:13}}>
                <span style={{color:"var(--c-textSec)"}}>Total RFC Needed</span>
                <span style={{fontFamily:"Space Mono,monospace",fontWeight:700,color:"var(--c-textPri)"}}>{fmtN(constructionRfcNeeded)}</span>
              </div>

              {/* RFC Balance */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",fontSize:13}}>
                <span style={{color:"var(--c-textSec)"}}>RFC Balance</span>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontFamily:"Space Mono,monospace",fontWeight:700,color:rfcBalance>=0?"var(--c-green)":"var(--c-red)"}}>
                    {rfcBalance>=0?"+":""}{fmtN(rfcBalance)}
                  </span>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:5,
                    background:rfcBalance>=0?"var(--c-greenBg)":"var(--c-redBg)",
                    color:rfcBalance>=0?"var(--c-green)":"var(--c-red)",
                    border:"1px solid " + (rfcBalance>=0?"var(--c-greenDim)":"var(--c-redDim)")}}>
                    {rfcBalance>=0?"Covered":"Short RFC"}
                  </span>
                </div>
              </div>

            </div>
          </div>

          <div className="note">
            <strong>Est. RFC Rec'd</strong> uses the exact per-refine lookup with the first daily refine at 50% FC.
            Enter <strong>Actual RFC Rec'd</strong> to override — Rolling RFC uses actuals where available.
            <strong> Event RFC Rec'd</strong> logs RFC from events separately to keep refine variance data clean.
            <strong> RFC Used</strong> tracks mid-cycle RFC spent on upgrades.
            <strong> Difference</strong> = Inventory RFC − Rolling RFC. <strong>Accept</strong> appears on today's row only.
            Past cycles are <strong>archived and read-only</strong>.
            <strong style={{color:"var(--c-accent)"}}> Week 4 = SvS</strong> (neon yellow). <strong style={{color:"var(--c-blue)"}}> Week 2 = KOI</strong> (neon blue).
          </div>

        </div>
      </div>
      {toast&&<div className="save-toast">{toast}</div>}
    </>
  );
}
