import React, { useState, useMemo } from "react";
import { buildCycles, getCurrentCycleNum, fmtDate, cycleLabelFull, todayUTC } from "./svsCalendar.js";
import { SERVER_MILESTONES, getStateStartMs } from "./CharacterProfile.jsx";

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
.cal-sub{font-size:12px;color:${C.textPri};margin-top:3px}
.cal-ctrl{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ctrl-lbl{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.textSec};font-family:'Space Mono',monospace}
.ctrl-sel{background:${C.card};border:1px solid ${C.border};border-radius:6px;padding:6px 10px;font-family:'Space Mono',monospace;font-size:12px;color:${C.textPri};outline:none;cursor:pointer}
.ctrl-sel:focus{border-color:${C.accent}}
.ctrl-sel option{background:${C.card}}
.cal-body{padding:24px 28px;display:flex;flex-direction:column;gap:20px}
.legend{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.leg-item{display:flex;align-items:center;gap:6px;font-size:11px;color:${C.textPri}}
.leg-dot{width:12px;height:12px;border-radius:3px;flex-shrink:0}
.leg-svs{background:var(--c-accentBg);border:1px solid var(--c-accentDim);box-shadow:0 0 6px var(--c-accentDim)}
.leg-koi{background:var(--c-blueBg);border:1px solid var(--c-blueDim);box-shadow:0 0 6px var(--c-blueDim)}
.leg-prep{background:${C.card};border:1px solid ${C.border}}
.cycle-block{display:flex;flex-direction:column;gap:8px}
.cycle-hd{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;font-family:'Space Mono',monospace;color:${C.textSec};display:flex;align-items:center;gap:8px;padding-bottom:4px}
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
.badge-prep{background:${C.card};color:${C.textSec};border:1px solid ${C.border}}
.badge-now{float:right;background:${C.accentBg};color:${C.accent};border:1px solid ${C.accentDim};padding:2px 6px;border-radius:4px;font-size:8px;font-family:'Space Mono',monospace;font-weight:700;margin-top:2px}
.wk-dates{font-size:11px;font-weight:700;font-family:'Space Mono',monospace;margin-bottom:3px}
.wk-dates.svs{color:var(--c-accent)}
.wk-dates.koi{color:var(--c-blue)}
.wk-dates.prep{color:${C.textPri}}
.wk-lbl{font-size:11px;font-weight:600;color:${C.textPri}}
.wk-lbl.svs{color:var(--c-accent);opacity:.85}
.wk-lbl.koi{color:var(--c-blue);opacity:.85}
.day-pips{margin-top:10px;display:flex;gap:3px}
.pip{width:22px;height:22px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;font-family:'Space Mono',monospace;border:1px solid ${C.border};background:${C.surface};color:${C.textDim}}
.pip.today{background:${C.accentBg};border-color:${C.accentDim};color:${C.accent};font-weight:700}
.pip.past{opacity:.3}
.pip.svs-pip{background:var(--c-accentBg);border-color:var(--c-accentDim);color:var(--c-accent)}
.pip.koi-pip{background:var(--c-blueBg);border-color:var(--c-blueDim);color:var(--c-blue)}
.pip.milestone{background:var(--c-amberBg);border-color:var(--c-amber);color:var(--c-amber);font-weight:700;cursor:pointer;box-shadow:0 0 5px var(--c-amberBg)}
.pip.milestone:hover,.pip.milestone.tip-open{box-shadow:0 0 8px var(--c-amber);border-color:var(--c-amber)}
@media(max-width:700px){.week-row{grid-template-columns:1fr 1fr}}
@media(max-width:420px){.week-row{grid-template-columns:1fr}}
`;

const DAY_AB = ["Mo","Tu","We","Th","Fr","Sa","Su"];

// Returns the ms timestamp of the Monday on or before the given ms (UTC).
function mondayBefore(ms) {
  const utcDay = new Date(ms).getUTCDay(); // 0=Sun
  return ms - (utcDay === 0 ? 6 : utcDay - 1) * 86400000;
}

export default function SvSCalendar({ stateNum }) {
  const today = useMemo(()=>todayUTC(),[]);
  const currentCycle = useMemo(()=>getCurrentCycleNum(),[]);
  const [startCycle, setStartCycle] = useState(currentCycle);
  const [tooltip, setTooltip] = useState(null); // { x, y, labels[] }

  // Build 8 cycles from the selected start
  const cycles = useMemo(()=>buildCycles(startCycle, 8),[startCycle]);

  // Build a map of ISO date string → milestone labels for the active character's state.
  // Dates are the Monday on or before each milestone's calendar date.
  const milestoneMap = useMemo(() => {
    const startMs = getStateStartMs(stateNum);
    if (!startMs) return new Map();
    const map = new Map();
    SERVER_MILESTONES.forEach(m => {
      const monMs = mondayBefore(startMs + m.day * 86400000);
      const key   = new Date(monMs).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m.label);
    });
    return map;
  }, [stateNum]);

  // Options for dropdown: go back 2 cycles, forward 24
  const cycleOpts = useMemo(()=>{
    const all = buildCycles(Math.max(1,currentCycle-2), 28);
    return all;
  },[currentCycle]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:STYLE}}/>
      <div className="cal" onClick={()=>setTooltip(null)}>
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
            {milestoneMap.size > 0 && (
              <div className="leg-item">
                <div className="leg-dot" style={{background:"var(--c-amberBg)",border:"1px solid var(--c-amber)",boxShadow:"0 0 5px var(--c-amberBg)"}}/>
                <span>Content release{stateNum ? ` (State ${stateNum})` : ""}</span>
              </div>
            )}
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
                            const dayMs    = w.weekStart.getTime() + di * 86400000;
                            const dayDate  = new Date(dayMs);
                            const dayIso   = dayDate.toISOString().slice(0, 10);
                            const isToday  = dayMs === today.getTime();
                            const isDayPast = dayMs < today.getTime();
                            const labels   = milestoneMap.get(dayIso) || [];
                            const isMilestone = labels.length > 0;
                            const tipOpen  = tooltip?.iso === dayIso;
                            let pipCls = isToday ? "today" : isDayPast ? "past" : w.isSvS ? "svs-pip" : w.isKOI ? "koi-pip" : "";
                            if (isMilestone && !isToday) pipCls = `milestone${tipOpen ? " tip-open" : ""}`;
                            return (
                              <div
                                key={di}
                                className={`pip ${pipCls}`}
                                title={isMilestone ? undefined : fmtDate(dayDate)}
                                onMouseEnter={isMilestone ? (e) => {
                                  const r = e.currentTarget.getBoundingClientRect();
                                  setTooltip({ x: r.left + r.width / 2, y: r.top, iso: dayIso, labels });
                                } : undefined}
                                onMouseLeave={isMilestone ? () => setTooltip(null) : undefined}
                                onClick={isMilestone ? (e) => {
                                  e.stopPropagation();
                                  setTooltip(t => t?.iso === dayIso ? null : { x: e.currentTarget.getBoundingClientRect().left + e.currentTarget.getBoundingClientRect().width / 2, y: e.currentTarget.getBoundingClientRect().top, iso: dayIso, labels });
                                } : undefined}
                              >
                                {DAY_AB[di]}
                              </div>
                            );
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

      {tooltip && (
        <div
          onMouseEnter={() => {}} // keep alive while hovering tooltip
          style={{
            position:"fixed", left:tooltip.x, top:tooltip.y - 10,
            transform:"translate(-50%, -100%)",
            background:"var(--c-card)", border:"1px solid var(--c-amber)",
            borderRadius:10, padding:"10px 14px", zIndex:9999,
            pointerEvents:"none", maxWidth:280,
            boxShadow:"0 6px 24px rgba(0,0,0,0.45)",
            fontFamily:"'Syne',sans-serif",
          }}
        >
          <div style={{fontSize:9,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
            color:"var(--c-amber)",fontFamily:"'Space Mono',monospace",marginBottom:6}}>
            Est. Release
          </div>
          {tooltip.labels.map((lbl, i) => (
            <div key={i} style={{fontSize:12,color:"var(--c-textPri)",lineHeight:1.5,
              borderBottom: i < tooltip.labels.length-1 ? "1px solid var(--c-border)" : "none",
              paddingBottom: i < tooltip.labels.length-1 ? 4 : 0,
              marginBottom:  i < tooltip.labels.length-1 ? 4 : 0}}>
              {lbl}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
