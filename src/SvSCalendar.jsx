import React, { useState, useMemo } from "react";
import { buildCycles, getCurrentCycleNum, fmtDate, cycleLabelFull } from "./svsCalendar.js";

const C = new Proxy({}, { get(_, key) { return `var(--c-${key})`; } });
// Semantic week colors mapped to theme vars
const C_SVS_COLOR = "var(--c-accent)";
const C_SVS_DIM   = "var(--c-accentDim)";
const C_SVS_BG    = "var(--c-accentBg)";
const C_KOI_COLOR = "var(--c-blue)";
const C_KOI_DIM   = "var(--c-blueDim)";
const C_KOI_BG    = "var(--c-blueBg)";

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.cal{font-family:'Syne',sans-serif;color:${C.textPri};background:var(--c-bg);min-height:100vh}
.cal-top{background:${C.surface};border-bottom:1px solid ${C.border};padding:20px 28px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.cal-title{font-size:20px;font-weight:800}.cal-title span{color:${C.accent}}
.cal-sub{font-size:12px;color:${C.textSec};margin-top:3px}
.cal-ctrl{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ctrl-lbl{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.textDim};font-family:'Space Mono',monospace}
.ctrl-sel{background:${C.card};border:1px solid ${C.border};border-radius:6px;padding:6px 10px;font-family:'Space Mono',monospace;font-size:12px;color:${C.textPri};outline:none;cursor:pointer}
.ctrl-sel:focus{border-color:${C.accent}}
.ctrl-sel option{background:${C.card}}
.cal-body{padding:24px 28px;display:flex;flex-direction:column;gap:20px}
.legend{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.leg-item{display:flex;align-items:center;gap:6px;font-size:11px;color:${C.textSec}}
.leg-dot{width:12px;height:12px;border-radius:3px;flex-shrink:0}
.leg-svs{background:var(--c-accentBg);border:1px solid var(--c-accentDim);box-shadow:0 0 6px var(--c-accentDim)}
.leg-koi{background:var(--c-blueBg);border:1px solid var(--c-blueDim);box-shadow:0 0 6px var(--c-blueDim)}
.leg-prep{background:${C.card};border:1px solid ${C.border}}
.cycle-block{display:flex;flex-direction:column;gap:8px}
.cycle-hd{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;font-family:'Space Mono',monospace;color:${C.textDim};display:flex;align-items:center;gap:8px;padding-bottom:4px}
.cycle-hd::after{content:'';flex:1;height:1px;background:${C.borderHi}}
.week-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.wk{border-radius:10px;padding:14px 16px;border:1px solid ${C.border};transition:border-color .15s}
.wk.prep{background:${C.card}}
.wk.prep:hover{border-color:${C.borderHi}}
.wk.koi{background:var(--c-blueBg);border:1.5px solid var(--c-blueDim);box-shadow:0 0 10px var(--c-blueDim)55}
.wk.svs{background:var(--c-accentBg);border:1.5px solid var(--c-accentDim);box-shadow:0 0 14px var(--c-accentDim)66}
.wk.current{outline:2px solid ${C.accent};outline-offset:3px}
.wk-badge{font-size:9px;font-weight:700;font-family:'Space Mono',monospace;padding:2px 7px;border-radius:4px;display:inline-block;margin-bottom:6px}
.badge-svs{background:var(--c-accentBg);color:var(--c-accent);border:1px solid var(--c-accentDim)}
.badge-koi{background:var(--c-blueBg);color:var(--c-blue);border:1px solid var(--c-blueDim)}
.badge-prep{background:${C.card};color:${C.textDim};border:1px solid ${C.border}}
.badge-now{float:right;background:${C.accentBg};color:${C.accent};border:1px solid ${C.accentDim};padding:2px 6px;border-radius:4px;font-size:8px;font-family:'Space Mono',monospace;font-weight:700;margin-top:2px}
.wk-dates{font-size:11px;font-weight:700;font-family:'Space Mono',monospace;margin-bottom:3px}
.wk-dates.svs{color:var(--c-accent)}
.wk-dates.koi{color:var(--c-blue)}
.wk-dates.prep{color:${C.textSec}}
.wk-lbl{font-size:11px;font-weight:600;color:${C.textSec}}
.wk-lbl.svs{color:var(--c-accent);opacity:.85}
.wk-lbl.koi{color:var(--c-blue);opacity:.85}
.day-pips{margin-top:10px;display:flex;gap:3px}
.pip{width:22px;height:22px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;font-family:'Space Mono',monospace;border:1px solid ${C.border};background:${C.surface};color:${C.textDim}}
.pip.today{background:${C.accentBg};border-color:${C.accentDim};color:${C.accent};font-weight:700}
.pip.past{opacity:.3}
.pip.svs-pip{background:var(--c-accentBg);border-color:var(--c-accentDim);color:var(--c-accent)}
.pip.koi-pip{background:var(--c-blueBg);border-color:var(--c-blueDim);color:var(--c-blue)}
@media(max-width:700px){.week-row{grid-template-columns:1fr 1fr}}
@media(max-width:420px){.week-row{grid-template-columns:1fr}}
`;

const DAY_AB = ["Mo","Tu","We","Th","Fr","Sa","Su"];

export default function SvSCalendar() {
  const today = useMemo(()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; },[]);
  const currentCycle = useMemo(()=>getCurrentCycleNum(),[]);
  const [startCycle, setStartCycle] = useState(currentCycle);

  // Build 8 cycles from the selected start
  const cycles = useMemo(()=>buildCycles(startCycle, 8),[startCycle]);

  // Options for dropdown: go back 2 cycles, forward 24
  const cycleOpts = useMemo(()=>{
    const all = buildCycles(Math.max(1,currentCycle-2), 28);
    return all;
  },[currentCycle]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:STYLE}}/>
      <div className="cal">
        <div className="cal-top">
          <div>
            <div className="cal-title">SvS <span>Calendar</span></div>
            <div className="cal-sub">Rolling event schedule — SvS every 4th week · King of Icefield every 2nd week · anchored Apr 20, 2026</div>
          </div>
          <div className="cal-ctrl">
            <span className="ctrl-lbl">Start from cycle</span>
            <select className="ctrl-sel" value={startCycle} onChange={e=>setStartCycle(Number(e.target.value))}>
              {cycleOpts.map(c=>(
                <option key={c.cycleNum} value={c.cycleNum}>
                  {cycleLabelFull(c.cycleNum, cycleOpts)}{c.cycleNum===currentCycle?" (current)":""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="cal-body">
          <div className="legend">
            <div className="leg-item"><div className="leg-dot leg-svs"/><span>SvS week</span></div>
            <div className="leg-item"><div className="leg-dot leg-koi"/><span>King of Icefield</span></div>
            <div className="leg-item"><div className="leg-dot leg-prep"/><span>Prep week</span></div>
          </div>

          {cycles.map(cycle=>{
            const isCurrentCycle = cycle.cycleNum === currentCycle;
            return (
              <div key={cycle.cycleNum} className="cycle-block">
                <div className="cycle-hd">
                  Cycle {cycle.cycleNum} — SvS {fmtDate(cycle.svsWeekStart)}
                  {isCurrentCycle&&<span style={{color:C.accent,fontSize:9,fontFamily:"Space Mono,monospace",marginLeft:6}}>[CURRENT]</span>}
                </div>
                <div className="week-row">
                  {cycle.weeks.map(w=>{
                    const isNow = today >= w.weekStart && today <= w.weekEnd;
                    const isPast = w.weekEnd < today;
                    const wCls = w.isSvS?"svs":w.isKOI?"koi":"prep";
                    const badge = w.isSvS
                      ? <span className="wk-badge badge-svs">⚔ SvS</span>
                      : w.isKOI
                        ? <span className="wk-badge badge-koi">❄ KOI</span>
                        : <span className="wk-badge badge-prep">Prep {w.isPrep1?"1":"3"}</span>;
                    const label = w.isSvS?"State vs State":w.isKOI?"King of Icefield":w.isPrep1?"Preparation (pre-KOI)":"Preparation (pre-SvS)";
                    return (
                      <div key={w.weekIndex} className={`wk ${wCls} ${isNow?"current":""}`} style={{opacity:isPast&&!isNow?.5:1}}>
                        {badge}
                        {isNow&&<span className="badge-now">THIS WEEK</span>}
                        <div className={`wk-dates ${wCls}`}>{fmtDate(w.weekStart)} – {fmtDate(w.weekEnd)}</div>
                        <div className={`wk-lbl ${wCls}`}>{label}</div>
                        <div className="day-pips">
                          {Array.from({length:7},(_,di)=>{
                            const day = new Date(w.weekStart); day.setDate(day.getDate()+di);
                            const isToday = day.getTime()===today.getTime();
                            const isDayPast = day<today;
                            const pipCls = isToday?"today":isDayPast?"past":w.isSvS?"svs-pip":w.isKOI?"koi-pip":"";
                            return <div key={di} className={`pip ${pipCls}`} title={fmtDate(day)}>{DAY_AB[di]}</div>;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
