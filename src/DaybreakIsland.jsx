import React, { useRef, useEffect } from "react";
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

// ─── Daybreak Island Page ─────────────────────────────────────────────────────

const DAYBREAK_BUFFS = [
  { key:"infantryAtk",     label:"Infantry Attack",            suffix:"%" },
  { key:"infantryDef",     label:"Infantry Defense",           suffix:"%" },
  { key:"lancerAtk",       label:"Lancer Attack",              suffix:"%" },
  { key:"lancerDef",       label:"Lancer Defense",             suffix:"%" },
  { key:"marksmanAtk",     label:"Marksman Attack",            suffix:"%" },
  { key:"marksmanDef",     label:"Marksman Defense",           suffix:"%" },
  { key:"troopsAtk",       label:"Troops' Attack",             suffix:"%" },
  { key:"troopsDef",       label:"Troops' Defense",            suffix:"%" },
  { key:"troopsLethality", label:"Troops' Lethality",          suffix:"%" },
  { key:"troopsHealth",    label:"Troops' Health",             suffix:"%" },
  { key:"huntingMarch",    label:"Hunting March Speed",        suffix:"%" },
  { key:"researchSpeed",   label:"Research Speed",             suffix:"%" },
  { key:"constructionSpd", label:"Construction Speed",         suffix:"%" },
  { key:"healingSpeed",    label:"Healing Speed",              suffix:"%" },
  { key:"trainingSpeed",   label:"Training Speed",             suffix:"%" },
  { key:"resourceGather",  label:"Resource Gathering Speed",   suffix:"%" },
  { key:"meatGather",      label:"Meat Gathering Speed",       suffix:"%" },
  { key:"woodGather",      label:"Wood Gathering Speed",       suffix:"%" },
  { key:"coalGather",      label:"Coal Gathering Speed",       suffix:"%" },
  { key:"ironGather",      label:"Iron Gathering Speed",       suffix:"%" },
  { key:"troopsMarch",     label:"Troops March Speed",         suffix:"%" },
  { key:"deployCap",       label:"Troops Deployment Capacity", suffix:""  },
];

const DAYBREAK_DEFAULTS = Object.fromEntries(DAYBREAK_BUFFS.map(b => [b.key, ""]));

function DaybreakNumberInput({ value, onChange, suffix, isLarge, isInteger }) {
  const inputRef = React.useRef(null);
  const cursorRef = React.useRef(null);

  const handleChange = (e) => {
    const el = e.target;
    const raw = el.value;
    if (isInteger) {
      const digits = raw.replace(/[^\d]/g, "");
      const formatted = digits ? Number(digits).toLocaleString() : "";
      const charsFromEnd = raw.length - el.selectionStart;
      cursorRef.current = Math.max(0, formatted.length - charsFromEnd);
      onChange(formatted);
    } else {
      let clean = raw.replace(/[^\d.]/g, "");
      const parts = clean.split(".");
      if (parts.length > 2) clean = parts[0] + "." + parts.slice(1).join("");
      if (parts.length === 2 && parts[1].length > 1) clean = parts[0] + "." + parts[1].slice(0, 1);
      onChange(clean);
    }
  };

  React.useEffect(() => {
    if (cursorRef.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
      cursorRef.current = null;
    }
  });

  const C = COLORS;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        placeholder="0"
        style={{
          width: isLarge ? 130 : 90,
          textAlign:"right",
          background:C.card,
          border:`1px solid ${C.border}`,
          borderRadius:5,
          color:C.textPri,
          padding:"5px 8px",
          fontSize:12,
          outline:"none",
          fontFamily:"'Space Mono',monospace",
        }}
      />
      {suffix && <span style={{ fontSize:11, color:C.textDim }}>{suffix}</span>}
    </div>
  );
}

function DaybreakIslandPage() {
  const C = COLORS;
  const [buffs, setBuffs] = useLocalStorage("daybreak-buffs", DAYBREAK_DEFAULTS);
  const [prosperityPoints, setProsperityPoints] = useLocalStorage("daybreak-prosperity", "");

  const setField = (key, val) => setBuffs(prev => ({ ...prev, [key]: val }));

  const tdLabel = {
    padding:"10px 14px", fontSize:13, fontWeight:600, color:C.textPri,
    borderBottom:`1px solid ${C.border}`, verticalAlign:"middle",
  };
  const tdVal = {
    padding:"10px 14px", textAlign:"right",
    borderBottom:`1px solid ${C.border}`, verticalAlign:"middle",
  };

  return (
    <div className="fade-in" style={{ maxWidth:580 }}>
      <div style={{
        background:C.card, border:`1px solid ${C.accentDim || C.border}`,
        borderRadius:10, padding:"18px 20px", marginBottom:20,
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:16,
      }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif" }}>
            Prosperity Points
          </div>
          <div style={{ fontSize:11, color:C.textSec, marginTop:3, fontFamily:"'Space Mono',monospace" }}>
            Your island's current prosperity level (0 – 250,000)
          </div>
        </div>
        <DaybreakNumberInput
          value={prosperityPoints}
          onChange={val => setProsperityPoints(val)}
          suffix=""
          isLarge={true}
          isInteger={true}
        />
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden", marginBottom:16 }}>
        <div style={{ padding:"14px 20px 12px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:15, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif" }}>
            Island Buffs
          </div>
          <div style={{ fontSize:11, color:C.textSec, marginTop:3, fontFamily:"'Space Mono',monospace" }}>
            Enter your current Daybreak Island bonus values
          </div>
        </div>
        <table style={{ borderCollapse:"collapse", width:"100%" }}>
          <tbody>
            {DAYBREAK_BUFFS.map((b, i) => (
              <tr key={b.key} style={{ background: i % 2 === 0 ? "transparent" : C.surface }}>
                <td style={tdLabel}>{b.label}</td>
                <td style={tdVal}>
                  <DaybreakNumberInput
                    value={buffs[b.key] ?? ""}
                    onChange={val => setField(b.key, val)}
                    suffix={b.suffix}
                    isLarge={b.key === "deployCap"}
                    isInteger={b.key === "deployCap"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize:10, color:C.textDim, fontFamily:"'Space Mono',monospace",
        textAlign:"center", paddingBottom:8 }}>
        Deployment Capacity bonus is included in the Chief Profile Military calculation
      </div>
    </div>
  );
}

// ─── Character Profile Page ───────────────────────────────────────────────────

// ─── Export ───────────────────────────────────────────────────────────────────
export default DaybreakIslandPage;
