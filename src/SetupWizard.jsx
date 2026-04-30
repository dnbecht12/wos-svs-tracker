import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocalStorage } from "./useLocalStorage.js";
import { CHIEF_GEAR_LEVELS, CHIEF_CHARM_LEVELS } from "./ChiefEquipment.jsx";
import { HERO_ROSTER, GEAR_SLOTS, isSSRHero } from "./Heroes.jsx";
import { WA_RESEARCH } from "./WarAcademy.jsx";
import { RC } from "./ResearchCenter.jsx";

// ─── Styling proxy ────────────────────────────────────────────────────────────
const C = new Proxy({}, { get(_, k) { return `var(--c-${k})`; } });

// ─── Constants ────────────────────────────────────────────────────────────────
const CG_PIECES = [
  { name:"Cap",    troop:"Lancer"   }, { name:"Watch",  troop:"Lancer"   },
  { name:"Coat",   troop:"Infantry" }, { name:"Pants",  troop:"Infantry" },
  { name:"Ring",   troop:"Marksman" }, { name:"Weapon", troop:"Marksman" },
];
const CC_PIECES = [
  { gear:"Cap",    troop:"Lancer",   charms:["Cap Charm 1","Cap Charm 2","Cap Charm 3"] },
  { gear:"Watch",  troop:"Lancer",   charms:["Watch Charm 1","Watch Charm 2","Watch Charm 3"] },
  { gear:"Coat",   troop:"Infantry", charms:["Coat Charm 1","Coat Charm 2","Coat Charm 3"] },
  { gear:"Pants",  troop:"Infantry", charms:["Pants Charm 1","Pants Charm 2","Pants Charm 3"] },
  { gear:"Ring",   troop:"Marksman", charms:["Ring Charm 1","Ring Charm 2","Ring Charm 3"] },
  { gear:"Weapon", troop:"Marksman", charms:["Weapon Charm 1","Weapon Charm 2","Weapon Charm 3"] },
];
const EXPERTS_LIST = ["Cyrille","Agnes","Romulus","Holger","Fabian","Baldur","Valeria","Ronne","Kathy"];
const PETS_LIST = [
  "Cave Hyena","Arctic Wolf","Musk Ox","Giant Tapir","Titan Roc",
  "Giant Elk","Snow Leopard","Cave Lion","Snow Ape","Iron Rhino",
  "Sabertooth Tiger","Mammoth","Frost Gorilla","Frostscale Chameleon",
];
const FC_LEVEL_OPTS = ["F30","FC1","FC2","FC3","FC4","FC5","FC6","FC7","FC8","FC9","FC10"];
const BLDG_NAMES    = ["Furnace","Embassy","Infantry","Marksman","Lancer","Command","Infirmary","War Academy"];
const TROOP_TYPES   = ["infantry","lancer","marksman"];
const TROOP_LABELS  = { infantry:"Infantry", lancer:"Lancer", marksman:"Marksman" };
const TIER_OPTS     = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11"];
const STAR_OPTS     = [0,1,2,3,3.1,3.2,3.3,4,4.1,4.2,4.3,4.4,5];
const SKILL_OPTS    = [0,1,2,3,4,5];
const WA_TROOPS     = ["Infantry","Lancer","Marksman"];

// Chief gear groups (two-level: main tier + sub-levels with "+")
const GEAR_GROUPS = (() => {
  const groups = [];
  let last = null;
  CHIEF_GEAR_LEVELS.forEach((r, i) => {
    if (!r[1].includes('+')) {
      last = { label: r[1], stepIdx: i, subs: [] };
      groups.push(last);
    } else if (last) {
      last.subs.push({ label: r[1], stepIdx: i });
    }
  });
  return groups;
})();

// Chief charm groups (main = no decimal, sub = has decimal)
const CHARM_GROUPS = (() => {
  const groups = [];
  let last = null;
  CHIEF_CHARM_LEVELS.forEach((r, i) => {
    const isSub = /Lv[.\s]+\d+\.\d+/.test(r.label);
    if (!isSub) {
      last = { label: r.label, idx: i, subs: [] };
      groups.push(last);
    } else if (last) {
      last.subs.push({ label: r.label, idx: i });
    }
  });
  return groups;
})();

// Generation list derived from HERO_ROSTER
const GEN_LIST = [...new Set(HERO_ROSTER.map(h => h.gen))].sort((a, b) => {
  const n = s => parseInt(s.replace("Gen ",""));
  return n(a) - n(b);
});

// ─── Wizard steps ─────────────────────────────────────────────────────────────
const STEPS = [
  { id:"welcome",      title:"Welcome"                },
  { id:"character",    title:"Character Details"      },
  { id:"chief-gear",   title:"Chief Gear"             },
  { id:"chief-charms", title:"Chief Charms"           },
  { id:"inventory",    title:"Inventory"              },
  { id:"daybreak",     title:"Daybreak Island"        },
  { id:"experts",      title:"Experts"                },
  { id:"pets",         title:"Pets"                   },
  { id:"heroes",       title:"Heroes"                 },
  { id:"hero-gear",    title:"Hero Gear (A-Team)"     },
  { id:"construction", title:"Construction"           },
  { id:"troops",       title:"Troops"                 },
  { id:"research",     title:"Research Center"        },
  { id:"war-academy",  title:"War Academy"            },
  { id:"chief-stats",  title:"Chief Stats"            },
  { id:"all-set",      title:"All Set!"               },
];

// ─── Shared sub-components ────────────────────────────────────────────────────
function WhereToFind({ children }) {
  return (
    <div style={{ display:"flex", gap:10, padding:"10px 14px", marginBottom:16,
      background:"rgba(56,139,253,0.07)", border:`1px solid ${C.blue}33`,
      borderRadius:8, fontSize:12, color:C.textSec, lineHeight:1.5 }}>
      <span style={{ fontSize:16, flexShrink:0 }}>📍</span>
      <div><strong style={{ color:C.blue }}>Where to find in-game: </strong>{children}</div>
    </div>
  );
}

function QASection() {
  return (
    <div style={{ marginTop:20, padding:"12px 14px",
      background:C.amberBg, border:`1px solid ${C.amber}40`,
      borderRadius:8, fontSize:11, color:C.amber }}>
      <strong>Q&A</strong> — Common questions for this section will appear here soon.
    </div>
  );
}

function SectionHead({ label }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase",
      color:C.textDim, fontFamily:"'Space Mono',monospace", marginBottom:10, marginTop:16,
      paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>
      {label}
    </div>
  );
}

function NumIn({ value, onChange, width=90, ...rest }) {
  return (
    <input type="text" inputMode="numeric"
      value={value ?? ""}
      onChange={e => onChange(Number(e.target.value.replace(/[^0-9.]/g,"")) || 0)}
      style={{ width, padding:"5px 8px", borderRadius:6, fontSize:12, textAlign:"right",
        background:C.surface, border:`1px solid ${C.border}`,
        color:C.textPri, outline:"none", fontFamily:"'Space Mono',monospace" }}
      {...rest}
    />
  );
}

function Sel({ value, onChange, opts, labels, width=120 }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width, padding:"5px 8px", borderRadius:6, fontSize:12,
        background:C.surface, border:`1px solid ${C.border}`,
        color:C.textPri, outline:"none", cursor:"pointer" }}>
      {opts.map((o, i) => <option key={o} value={o}>{labels ? labels[i] : o}</option>)}
    </select>
  );
}

// ─── Step 0: Welcome ──────────────────────────────────────────────────────────
function StepWelcome() {
  return (
    <div>
      <div style={{ fontSize:32, marginBottom:8 }}>👋</div>
      <p style={{ fontSize:14, color:C.textPri, marginBottom:12, lineHeight:1.6 }}>
        Welcome to <strong>Tundra Command</strong>! This wizard will walk you through
        entering your current in-game details so the app is fully loaded and accurate
        from day one.
      </p>
      <p style={{ fontSize:13, color:C.textSec, marginBottom:16, lineHeight:1.6 }}>
        You can skip any step you don't have data for yet, and come back to fill in
        details later using the individual module pages. You can also re-launch this
        wizard any time from <strong>Profile → Characters</strong>.
      </p>
      <div style={{ padding:"14px 16px", background:C.surface, borderRadius:10,
        border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.textDim,
          letterSpacing:"1.2px", textTransform:"uppercase",
          fontFamily:"'Space Mono',monospace", marginBottom:10 }}>
          Pages covered
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 16px" }}>
          {STEPS.slice(1, -1).map(s => (
            <div key={s.id} style={{ fontSize:12, color:C.textSec,
              display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ color:C.accent }}>›</span> {s.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Character Details ────────────────────────────────────────────────
function StepCharacter({ character, renameCharacter, onSaved }) {
  const [name,     setName]     = useState(character?.name     || "");
  const [stateNum, setStateNum] = useState(character?.state_number ? String(character.state_number) : "");
  const [alliance, setAlliance] = useState(character?.alliance  || "");
  const [busy,     setBusy]     = useState(false);
  const [saved,    setSaved]    = useState(false);

  const allFilled = name.trim() && stateNum.trim() && alliance.trim();
  const alreadyComplete = character?.state_number && character?.alliance;

  const handleSave = async () => {
    if (!allFilled) return;
    setBusy(true);
    await renameCharacter(character.id, name.trim(), parseInt(stateNum), alliance.trim().toUpperCase().slice(0,3));
    setBusy(false);
    setSaved(true);
  };

  return (
    <div>
      <WhereToFind>
        Tap your <strong>avatar → Profile</strong> in-game to find your character name,
        state number, and alliance tag.
      </WhereToFind>
      {alreadyComplete && (
        <div style={{ padding:"8px 12px", marginBottom:14, background:C.greenBg,
          border:`1px solid ${C.green}40`, borderRadius:6, fontSize:12, color:C.green }}>
          ✓ Character details are already set — update below if anything has changed.
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:12, maxWidth:400 }}>
        {[
          { label:"Character Name", value:name, set:setName, placeholder:"Your in-game name", type:"text" },
          { label:"State Number",   value:stateNum, set:setStateNum, placeholder:"e.g. 2713", type:"number" },
          { label:"Alliance Tag (2–3 letters)", value:alliance, set:(v)=>setAlliance(v.toUpperCase().slice(0,3)), placeholder:"e.g. ABC", type:"text" },
        ].map(f => (
          <div key={f.label}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textSec, marginBottom:4 }}>{f.label}</div>
            <input type={f.type} value={f.value}
              onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
              style={{ width:"100%", padding:"8px 12px", borderRadius:7, fontSize:13,
                background:C.surface, border:`1px solid ${C.border}`,
                color:C.textPri, outline:"none", boxSizing:"border-box" }} />
          </div>
        ))}
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={handleSave} disabled={busy || !allFilled}
            style={{ padding:"8px 18px", borderRadius:7, fontSize:13, fontWeight:700,
              cursor: allFilled ? "pointer" : "not-allowed", fontFamily:"Syne,sans-serif",
              background:C.accent, color:"#0a0c10", border:"none", opacity:allFilled ? 1 : 0.5 }}>
            {busy ? "Saving…" : "Save Details"}
          </button>
          {saved && <span style={{ fontSize:12, color:C.green }}>✓ Saved</span>}
        </div>
      </div>
      <QASection />
    </div>
  );
}

// ─── Step 2: Chief Gear ───────────────────────────────────────────────────────
function StepChiefGear() {
  const [slots, setSlots] = useLocalStorage("cg-slots",
    CG_PIECES.map(p => ({ piece: p.name, current: 0, goal: 0 })));

  const setLevel = (idx, val) => setSlots(prev => prev.map((s, i) =>
    i === idx ? { ...s, current: val, goal: Math.max(s.goal, val) } : s));

  const { groupIdx: grpOf, subIdx: subOf } = (stepIdx) => {
    for (let g = 0; g < GEAR_GROUPS.length; g++) {
      if (GEAR_GROUPS[g].stepIdx === stepIdx) return { groupIdx:g, subIdx:0 };
      for (let s = 0; s < GEAR_GROUPS[g].subs.length; s++)
        if (GEAR_GROUPS[g].subs[s].stepIdx === stepIdx) return { groupIdx:g, subIdx:s+1 };
    }
    return { groupIdx:0, subIdx:0 };
  };

  const selStyle = { background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:5, color:C.textPri, padding:"4px 6px", fontSize:11, outline:"none" };

  return (
    <div>
      <WhereToFind>
        <strong>Chief → Equipment → Gear</strong> — tap each equipped piece to see its current tier and level.
      </WhereToFind>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:10 }}>
        {CG_PIECES.map((piece, idx) => {
          const cur = slots[idx]?.current ?? 0;
          const { groupIdx, subIdx } = grpOf(cur);
          const grp = GEAR_GROUPS[groupIdx] || GEAR_GROUPS[0];
          const subOpts = [
            { label:"Base", si:0, stepIdx:grp.stepIdx },
            ...grp.subs.map((s, i) => ({ label:`+${s.label.split('+').pop()}`, si:i+1, stepIdx:s.stepIdx })),
          ];
          return (
            <div key={piece.name} style={{ padding:"10px 12px", background:C.surface,
              borderRadius:8, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textSec, marginBottom:6 }}>
                <span style={{ color: piece.troop==="Infantry"?C.green:piece.troop==="Lancer"?C.blue:C.amber }}>
                  {piece.troop[0]}
                </span> {piece.name}
              </div>
              <div style={{ display:"flex", gap:4 }}>
                <select value={groupIdx} onChange={e => {
                  const g = GEAR_GROUPS[Number(e.target.value)];
                  setLevel(idx, g.stepIdx);
                }} style={{...selStyle, minWidth:80}}>
                  {GEAR_GROUPS.map((g, gi) => <option key={gi} value={gi}>{g.label}</option>)}
                </select>
                {grp.subs.length > 0 && (
                  <select value={subIdx} onChange={e => {
                    const si = Number(e.target.value);
                    setLevel(idx, si === 0 ? grp.stepIdx : grp.subs[si-1].stepIdx);
                  }} style={{...selStyle, minWidth:48}}>
                    {subOpts.map(o => <option key={o.si} value={o.si}>{o.label}</option>)}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <QASection />
    </div>
  );
}

// ─── Step 3: Chief Charms ─────────────────────────────────────────────────────
function StepChiefCharms() {
  const defaultSlots = () => CC_PIECES.flatMap(p =>
    p.charms.map(name => ({ charm:name, gear:p.gear, troop:p.troop, current:0, goal:0 })));
  const [slots, setSlots] = useLocalStorage("cc-slots", defaultSlots());

  const setLevel = (idx, val) => setSlots(prev => prev.map((s, i) =>
    i === idx ? { ...s, current: val, goal: Math.max(s.goal, val) } : s));

  const selStyle = { background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:5, color:C.textPri, padding:"4px 6px", fontSize:11, outline:"none" };

  // Rebuild charm groups for the level picker
  const charmGroupSubToStored = (gi, si) => {
    if (gi < 0) return 0;
    const g = CHARM_GROUPS[gi];
    if (!g) return 0;
    return (si === 0 ? g.idx : (g.subs[si-1]?.idx ?? g.idx)) + 1;
  };
  const storedToGroupSub = (stored) => {
    if (!stored) return { gi:-1, si:0 };
    const idx = stored - 1;
    for (let g = 0; g < CHARM_GROUPS.length; g++) {
      if (CHARM_GROUPS[g].idx === idx) return { gi:g, si:0 };
      for (let s = 0; s < CHARM_GROUPS[g].subs.length; s++)
        if (CHARM_GROUPS[g].subs[s].idx === idx) return { gi:g, si:s+1 };
    }
    return { gi:-1, si:0 };
  };

  return (
    <div>
      <WhereToFind>
        <strong>Chief → Equipment → Charms</strong> — check the level of each charm attached to your Chief Gear pieces.
      </WhereToFind>
      {CC_PIECES.map((piece, pi) => (
        <div key={piece.gear} style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.textSec, marginBottom:6 }}>
            <span style={{ color: piece.troop==="Infantry"?C.green:piece.troop==="Lancer"?C.blue:C.amber }}>
              ■
            </span> {piece.gear} Charms
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {piece.charms.map((charmName, ci) => {
              const slotIdx = pi * 3 + ci;
              const cur = slots[slotIdx]?.current ?? 0;
              const { gi, si } = storedToGroupSub(cur);
              const grp = gi >= 0 ? CHARM_GROUPS[gi] : null;
              const subOpts = grp ? [
                { label:"Base", si:0, stored:grp.idx+1 },
                ...grp.subs.map((s, i) => ({ label:`.${s.label.split('.').pop()}`, si:i+1, stored:s.idx+1 })),
              ] : [];
              return (
                <div key={charmName} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <div style={{ fontSize:10, color:C.textDim }}>#{ci+1}</div>
                  <div style={{ display:"flex", gap:3 }}>
                    <select value={gi} onChange={e => {
                      const ng = Number(e.target.value);
                      setLevel(slotIdx, charmGroupSubToStored(ng, 0));
                    }} style={{...selStyle, minWidth:72}}>
                      <option value={-1}>None</option>
                      {CHARM_GROUPS.map((g, i) => <option key={i} value={i}>{g.label}</option>)}
                    </select>
                    {grp && subOpts.length > 1 && (
                      <select value={si} onChange={e => setLevel(slotIdx, charmGroupSubToStored(gi, Number(e.target.value)))}
                        style={{...selStyle, minWidth:44}}>
                        {subOpts.map(o => <option key={o.si} value={o.si}>{o.label}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <QASection />
    </div>
  );
}

// ─── Step 4: Inventory ────────────────────────────────────────────────────────
function StepInventory({ inv, setInv }) {
  const set = (field, val) => setInv(p => ({ ...p, [field]: val }));
  const row = (label, field, suffix="") => (
    <div key={field} style={{ display:"flex", alignItems:"center",
      justifyContent:"space-between", padding:"7px 0",
      borderBottom:`1px solid ${C.border}40`, gap:12 }}>
      <span style={{ fontSize:12, color:C.textSec }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
        <NumIn value={inv[field] ?? 0} onChange={v => set(field, v)} width={110} />
        {suffix && <span style={{ fontSize:11, color:C.textDim }}>{suffix}</span>}
      </div>
    </div>
  );
  return (
    <div>
      <WhereToFind>
        Tap the <strong>backpack / bag icon</strong> in-game → Resources and Materials tabs.
        Check your FC and RFC in the <strong>Fire Crystal</strong> section.
      </WhereToFind>
      <SectionHead label="Fire Crystals" />
      {row("Fire Crystals (FC)", "fireCrystals")}
      {row("Refined FC (RFC)",   "refinedFC")}
      <SectionHead label="Chief Gear Materials" />
      {row("Design Plans",  "chiefPlans")}
      {row("Polish",        "chiefPolish")}
      {row("Alloy",         "chiefAlloy")}
      {row("Amber",         "chiefAmber")}
      <SectionHead label="Chief Charm Materials" />
      {row("Charm Designs", "charmDesigns")}
      {row("Guides",        "charmGuides")}
      {row("Secrets",       "charmSecrets")}
      <SectionHead label="Hero Gear Materials" />
      {row("Mithril",        "mithril")}
      {row("Mastery Stones", "stones")}
      {row("Mythic Gear",    "mythicGear")}
      <SectionHead label="War Academy" />
      {row("Shards",  "shards")}
      {row("Steel",   "steel")}
      <SectionHead label="Construction Resources" />
      {row("Meat",  "meat")}
      {row("Wood",  "wood")}
      {row("Coal",  "coal")}
      {row("Iron",  "iron")}
      <QASection />
    </div>
  );
}

// ─── Step 5: Daybreak Island ──────────────────────────────────────────────────
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
  { key:"researchSpeed",   label:"Research Speed",             suffix:"%" },
  { key:"constructionSpd", label:"Construction Speed",         suffix:"%" },
  { key:"trainingSpeed",   label:"Training Speed",             suffix:"%" },
  { key:"deployCap",       label:"Troops Deployment Capacity", suffix:""  },
];

function StepDaybreak() {
  const [buffs, setBuffs] = useLocalStorage("daybreak-buffs",
    Object.fromEntries(DAYBREAK_BUFFS.map(b => [b.key, ""])));
  const set = (key, val) => setBuffs(p => ({ ...p, [key]: val }));
  return (
    <div>
      <WhereToFind>
        <strong>Map → Daybreak Island → Alliance Buffs</strong> — view each active buff
        and its current percentage.
      </WhereToFind>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {DAYBREAK_BUFFS.map(b => (
          <div key={b.key} style={{ display:"flex", alignItems:"center",
            justifyContent:"space-between", gap:8,
            padding:"6px 10px", background:C.surface,
            borderRadius:6, border:`1px solid ${C.border}` }}>
            <span style={{ fontSize:11, color:C.textSec }}>{b.label}</span>
            <div style={{ display:"flex", alignItems:"center", gap:3 }}>
              <input type="text" inputMode="numeric"
                value={buffs[b.key] ?? ""}
                onChange={e => set(b.key, e.target.value)}
                placeholder="0"
                style={{ width:64, padding:"4px 6px", borderRadius:5, fontSize:12,
                  textAlign:"right", background:C.card,
                  border:`1px solid ${C.border}`, color:C.textPri, outline:"none" }} />
              {b.suffix && <span style={{ fontSize:11, color:C.textDim }}>{b.suffix}</span>}
            </div>
          </div>
        ))}
      </div>
      <QASection />
    </div>
  );
}

// ─── Step 6: Experts ──────────────────────────────────────────────────────────
function StepExperts() {
  const [data, setData] = useLocalStorage("experts-data", {});
  const get = (name, field) => data[name]?.[field] ?? 0;
  const set = (name, field, val) => setData(p => ({
    ...p, [name]: { ...(p[name] || {}), [field]: val }
  }));
  const selS = { background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:5, color:C.textPri, padding:"3px 5px", fontSize:11, outline:"none" };
  const lvOpts = Array.from({length:101}, (_,i)=>i);
  const affOpts = Array.from({length:12},  (_,i)=>i);
  const skOpts  = Array.from({length:21},  (_,i)=>i);
  return (
    <div>
      <WhereToFind>
        <strong>Alliance → Experts</strong> — tap each expert to see their current Level,
        Affinity (Bond), and individual Skill levels (Sk1–Sk4).
      </WhereToFind>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", width:"100%", fontSize:11 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {["Expert","Level","Affinity","Sk 1","Sk 2","Sk 3","Sk 4"].map(h => (
                <th key={h} style={{ padding:"4px 8px", textAlign:"center",
                  color:C.textDim, fontFamily:"'Space Mono',monospace",
                  fontSize:10, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EXPERTS_LIST.map(name => (
              <tr key={name} style={{ borderBottom:`1px solid ${C.border}20` }}>
                <td style={{ padding:"5px 8px", fontSize:12, color:C.textPri,
                  fontWeight:600, whiteSpace:"nowrap" }}>{name}</td>
                {[
                  ["level",    lvOpts],
                  ["affinity", affOpts],
                  ["sk1Level", skOpts],
                  ["sk2Level", skOpts],
                  ["sk3Level", skOpts],
                  ["sk4Level", skOpts],
                ].map(([field, opts]) => (
                  <td key={field} style={{ padding:"5px 6px", textAlign:"center" }}>
                    <select value={get(name, field)} onChange={e => set(name, field, Number(e.target.value))} style={selS}>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <QASection />
    </div>
  );
}

// ─── Step 7: Pets ─────────────────────────────────────────────────────────────
function StepPets() {
  const [data, setData] = useLocalStorage("pets-data", {});
  const get = (name, field, def=0) => data[name]?.[field] ?? def;
  const set = (name, field, val) => setData(p => ({
    ...p, [name]: { ...(p[name] || {}), [field]: val }
  }));
  const selS = { background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:5, color:C.textPri, padding:"3px 5px", fontSize:11, outline:"none" };
  return (
    <div>
      <WhereToFind>
        <strong>Pets → Beast Cage</strong> — tap each pet to see its current Level
        and whether it has been Advanced beyond the base level cap.
      </WhereToFind>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", width:"100%", fontSize:11 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {["Pet","Level","Advanced?"].map(h => (
                <th key={h} style={{ padding:"4px 8px", textAlign:h==="Pet"?"left":"center",
                  color:C.textDim, fontFamily:"'Space Mono',monospace", fontSize:10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PETS_LIST.map(name => (
              <tr key={name} style={{ borderBottom:`1px solid ${C.border}20` }}>
                <td style={{ padding:"5px 8px", fontSize:12, color:C.textPri,
                  whiteSpace:"nowrap" }}>{name}</td>
                <td style={{ padding:"5px 8px", textAlign:"center" }}>
                  <select value={get(name,"level")}
                    onChange={e => set(name,"level",Number(e.target.value))} style={selS}>
                    {Array.from({length:101},(_,i)=>i).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>
                <td style={{ padding:"5px 8px", textAlign:"center" }}>
                  <input type="checkbox" checked={!!get(name,"advanced",false)}
                    onChange={e => set(name,"advanced",e.target.checked)}
                    style={{ accentColor:C.accent, width:15, height:15, cursor:"pointer" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <QASection />
    </div>
  );
}

// ─── Step 8: Heroes ───────────────────────────────────────────────────────────
function StepHeroes() {
  const [heroStats, setHeroStats] = useLocalStorage("hg-hero-stats", {});
  const [selGen, setSelGen] = useState(GEN_LIST[0] || "Gen 1");

  const heroes = useMemo(() => HERO_ROSTER.filter(h => h.gen === selGen), [selGen]);

  const get  = (name, field, def=0) => heroStats[name]?.[field] ?? def;
  const setF = (name, field, val)   => setHeroStats(p => ({
    ...p, [name]: { ...(p[name] || {}), [field]: val }
  }));
  const setMax = (name, isSSR) => setHeroStats(p => ({
    ...p, [name]: {
      ...(p[name] || {}),
      stars:5, level:80,
      widget: isSSR ? 10 : 0,
      expS1:5, expS2:5, expS3:5,
      expdS1:5, expdS2:5, expdS3:5,
    }
  }));

  const selS = { background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:5, color:C.textPri, padding:"3px 5px", fontSize:11, outline:"none" };
  const lvOpts = Array.from({length:81}, (_,i)=>i);
  const wgOpts = Array.from({length:11}, (_,i)=>i);

  return (
    <div>
      <WhereToFind>
        <strong>Heroes tab → tap each hero card</strong> to see Stars, Level, Widget level,
        and individual Skill levels. Exploration skills = top row, Expedition skills = bottom row.
      </WhereToFind>

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <span style={{ fontSize:12, color:C.textSec }}>Generation:</span>
        <select value={selGen} onChange={e => setSelGen(e.target.value)}
          style={{...selS, minWidth:100}}>
          {GEN_LIST.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {heroes.map(hero => {
        const isSSR = isSSRHero(hero.name);
        return (
          <div key={hero.name} style={{ marginBottom:14, padding:"12px 14px",
            background:C.surface, borderRadius:8, border:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.textPri }}>{hero.name}</div>
              <button onClick={() => setMax(hero.name, isSSR)}
                style={{ padding:"4px 10px", borderRadius:5, fontSize:11, fontWeight:700,
                  cursor:"pointer", fontFamily:"Syne,sans-serif",
                  border:`1px solid ${C.accent}`, background:C.accentBg, color:C.accent }}>
                Max All
              </button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:8 }}>
              {/* Stars */}
              <div>
                <div style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>Stars</div>
                <select value={get(hero.name,"stars")} onChange={e => setF(hero.name,"stars",Number(e.target.value))} style={selS}>
                  {STAR_OPTS.map(v => <option key={v} value={v}>{v}★</option>)}
                </select>
              </div>
              {/* Level */}
              <div>
                <div style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>Level</div>
                <select value={get(hero.name,"level")} onChange={e => setF(hero.name,"level",Number(e.target.value))} style={selS}>
                  {lvOpts.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              {/* Widget (SSR only) */}
              {isSSR && (
                <div>
                  <div style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>Widget</div>
                  <select value={get(hero.name,"widget")} onChange={e => setF(hero.name,"widget",Number(e.target.value))} style={selS}>
                    {wgOpts.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              )}
              {/* Exploration Skills */}
              {["expS1","expS2","expS3"].map((f,i) => (
                <div key={f}>
                  <div style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>Expl. Sk{i+1}</div>
                  <select value={get(hero.name,f)} onChange={e => setF(hero.name,f,Number(e.target.value))} style={selS}>
                    {SKILL_OPTS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              ))}
              {/* Expedition Skills */}
              {["expdS1","expdS2","expdS3"].map((f,i) => (
                <div key={f}>
                  <div style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>Expd. Sk{i+1}</div>
                  <select value={get(hero.name,f)} onChange={e => setF(hero.name,f,Number(e.target.value))} style={selS}>
                    {SKILL_OPTS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <QASection />
    </div>
  );
}

// ─── Step 9: Hero Gear (A-Team) ───────────────────────────────────────────────
function StepHeroGear() {
  const [teams, setTeams] = useLocalStorage("hg-teams", { activeTeam:"A", teams:{ A:[null,null,null] } });
  const aTeam = teams.teams?.A || [null, null, null];
  const gearSlots = GEAR_SLOTS.slice(0, 4); // Goggles, Gloves, Belt, Boots
  const gearOpts = Array.from({length:101},(_,i)=>i);
  const mastOpts = Array.from({length:21}, (_,i)=>i);

  const setSlotField = (heroIdx, slotIdx, field, val) => {
    setTeams(prev => {
      const newTeams = { ...prev, teams: { ...prev.teams } };
      const aArr = [...(newTeams.teams.A || [null,null,null])];
      const hero = { ...(aArr[heroIdx] || { hero:"", slots:[] }) };
      const slots = [...(hero.slots || [])];
      slots[slotIdx] = { ...(slots[slotIdx] || {}), [field]: val };
      hero.slots = slots;
      aArr[heroIdx] = hero;
      newTeams.teams.A = aArr;
      return newTeams;
    });
  };

  const selS = { background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:5, color:C.textPri, padding:"3px 5px", fontSize:11, outline:"none" };

  return (
    <div>
      <WhereToFind>
        <strong>Heroes → Hero Gear → A-Team</strong> — check each hero's equipped gear: the tier
        (Mythic or Legendary), current Gear Level (+0 to +100), and Mastery Level (0–20).
      </WhereToFind>
      {[0,1,2].map(heroIdx => {
        const hd = aTeam[heroIdx] || { hero:"", slots:[] };
        return (
          <div key={heroIdx} style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.textSec, marginBottom:8 }}>
              Slot {heroIdx+1}: <span style={{ color:C.textPri }}>{hd.hero || "—"}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
              {gearSlots.map((slotName, slotIdx) => {
                const s = hd.slots?.[slotIdx] || {};
                return (
                  <div key={slotName} style={{ padding:"8px 10px", background:C.surface,
                    borderRadius:7, border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:10, color:C.textDim, marginBottom:6 }}>{slotName}</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:10, color:C.textDim, width:56 }}>Tier</span>
                        <select value={s.status || ""} onChange={e => setSlotField(heroIdx,slotIdx,"status",e.target.value)} style={selS}>
                          <option value="">— Not Set —</option>
                          <option value="Mythic">Mythic</option>
                          <option value="Legendary">Legendary</option>
                        </select>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:10, color:C.textDim, width:56 }}>Lvl</span>
                        <select value={s.gearCurrent ?? 0} onChange={e => setSlotField(heroIdx,slotIdx,"gearCurrent",Number(e.target.value))} style={selS}>
                          {gearOpts.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:10, color:C.textDim, width:56 }}>Mastery</span>
                        <select value={s.masteryCurrent ?? 0} onChange={e => setSlotField(heroIdx,slotIdx,"masteryCurrent",Number(e.target.value))} style={selS}>
                          {mastOpts.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <QASection />
    </div>
  );
}

// ─── Step 10: Construction ────────────────────────────────────────────────────
function StepConstruction() {
  const DEFAULT_BLDGS = BLDG_NAMES.map(name => ({ name, current:"FC1", currentSub:0, goal:"FC1", goalSub:0 }));
  const [buildings, setBuildings] = useLocalStorage("cp-buildings", DEFAULT_BLDGS);
  const [nonFcMax,  setNonFcMax]  = useLocalStorage("cp-nonfc-active", false);

  const setLevel = (name, val) => setBuildings(prev => prev.map(b =>
    b.name === name ? { ...b, current:val, goal:val } : b));

  const getLevel = (name) => buildings.find(b => b.name === name)?.current || "FC1";

  const selS = { background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:5, color:C.textPri, padding:"4px 8px", fontSize:12, outline:"none" };

  return (
    <div>
      <WhereToFind>
        <strong>City view → tap each building</strong> to see its current Fire Crystal level.
        Look for the "FC" badge on each building icon.
      </WhereToFind>

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16,
        padding:"10px 14px", background:C.surface, borderRadius:8, border:`1px solid ${C.border}` }}>
        <input type="checkbox" id="nonfc-check" checked={!!nonFcMax}
          onChange={e => setNonFcMax(e.target.checked)}
          style={{ accentColor:C.accent, width:15, height:15, cursor:"pointer" }} />
        <label htmlFor="nonfc-check" style={{ fontSize:12, color:C.textPri, cursor:"pointer" }}>
          All non-FC buildings maxed (Hunter's Hut, Sawmill, Coal Mine, etc.)
        </label>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {BLDG_NAMES.map(name => (
          <div key={name} style={{ display:"flex", alignItems:"center",
            justifyContent:"space-between", padding:"8px 12px",
            background:C.surface, borderRadius:7, border:`1px solid ${C.border}`, gap:8 }}>
            <span style={{ fontSize:12, color:C.textPri, fontWeight:600 }}>{name}</span>
            <select value={getLevel(name)} onChange={e => setLevel(name, e.target.value)} style={selS}>
              {FC_LEVEL_OPTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        ))}
      </div>
      <QASection />
    </div>
  );
}

// ─── Step 11: Troops ──────────────────────────────────────────────────────────
function StepTroops() {
  const defaultTroops = () => ({ infantry:[], lancer:[], marksman:[] });
  const [troops, setTroops] = useLocalStorage("troops-inventory-v2", defaultTroops());

  const addRow = (type) => setTroops(p => ({
    ...p, [type]: [...(p[type]||[]), { tier:"T1", count:0 }]
  }));
  const setRow = (type, idx, field, val) => setTroops(p => ({
    ...p, [type]: (p[type]||[]).map((r,i) => i===idx ? { ...r, [field]:val } : r)
  }));
  const removeRow = (type, idx) => setTroops(p => ({
    ...p, [type]: (p[type]||[]).filter((_,i) => i!==idx)
  }));

  const selS = { background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:5, color:C.textPri, padding:"4px 6px", fontSize:11, outline:"none" };
  const typeColor = { infantry:C.green, lancer:C.blue, marksman:C.amber };

  return (
    <div>
      <WhereToFind>
        <strong>Troops tab → Army</strong> — select each troop type and check the count
        for each tier (T1–T11). Add a row for each tier you have troops in.
      </WhereToFind>
      {TROOP_TYPES.map(type => {
        const rows = troops[type] || [];
        return (
          <div key={type} style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:8,
              color:typeColor[type] }}>{TROOP_LABELS[type]}</div>
            {rows.map((row, idx) => (
              <div key={idx} style={{ display:"flex", alignItems:"center", gap:8,
                marginBottom:6 }}>
                <select value={row.tier} onChange={e => setRow(type,idx,"tier",e.target.value)} style={{...selS,width:60}}>
                  {TIER_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <NumIn value={row.count} onChange={v => setRow(type,idx,"count",v)} width={110} />
                <button onClick={() => removeRow(type,idx)}
                  style={{ padding:"3px 8px", borderRadius:5, fontSize:11,
                    cursor:"pointer", border:`1px solid ${C.red}50`,
                    background:"transparent", color:C.red }}>✕</button>
              </div>
            ))}
            <button onClick={() => addRow(type)}
              style={{ padding:"5px 12px", borderRadius:5, fontSize:11, fontWeight:700,
                cursor:"pointer", fontFamily:"Syne,sans-serif",
                border:`1px solid ${C.border}`, background:C.surface,
                color:C.textSec, marginTop:2 }}>
              + Add {TROOP_LABELS[type]} tier
            </button>
          </div>
        );
      })}
      <QASection />
    </div>
  );
}

// ─── Step 12: Research Center ─────────────────────────────────────────────────
function StepResearch({ rcLevels, setRcLevels }) {
  const [selTree, setSelTree] = useState("Growth");
  const levels = rcLevels ?? {};
  const getCur = id => levels[id]?.cur ?? 0;
  const setCur = (id, val) => setRcLevels(p => ({
    ...(p||{}), [id]: { ...((p||{})[id]||{}), cur: val }
  }));
  const selS = { background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:5, color:C.textPri, padding:"3px 5px", fontSize:11, outline:"none" };
  const treeData = RC[selTree];
  return (
    <div>
      <WhereToFind>
        <strong>Research Center → each tree tab</strong> — tap each node to see its
        current level. Note the max level per node (shown in the node detail panel).
      </WhereToFind>
      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        {["Growth","Economy","Battle"].map(t => (
          <button key={t} onClick={() => setSelTree(t)}
            style={{ padding:"6px 14px", borderRadius:6, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"Syne,sans-serif",
              border:`1px solid ${selTree===t ? C.accent : C.border}`,
              background: selTree===t ? C.accentBg : C.surface,
              color: selTree===t ? C.accent : C.textSec }}>
            {t}
          </button>
        ))}
      </div>
      {treeData?.tiers?.map(tier => (
        <div key={tier.tier} style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.2px",
            textTransform:"uppercase", color:C.textDim,
            fontFamily:"'Space Mono',monospace", marginBottom:8,
            paddingBottom:5, borderBottom:`1px solid ${C.border}` }}>
            Tier {tier.tier}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {tier.researches.map(res => {
              const maxLv = res.levels.length - 1;
              const opts = Array.from({length:maxLv+1},(_,i)=>i);
              return (
                <div key={res.id} style={{ display:"flex", alignItems:"center",
                  justifyContent:"space-between", gap:8,
                  padding:"6px 10px", background:C.surface,
                  borderRadius:6, border:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:11, color:C.textPri, flexShrink:1 }}>{res.name}</span>
                  <select value={getCur(res.id)} onChange={e => setCur(res.id, Number(e.target.value))} style={{...selS,minWidth:50}}>
                    {opts.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <QASection />
    </div>
  );
}

// ─── Step 13: War Academy ─────────────────────────────────────────────────────
function StepWarAcademy() {
  const [waLevels, setWaLevels] = useLocalStorage("wa-levels", {});
  const getCur = (troop, id) => waLevels[troop]?.[id]?.cur ?? 0;
  const setCur = (troop, id, val) => setWaLevels(p => ({
    ...p, [troop]: {
      ...(p[troop]||{}),
      [id]: { ...((p[troop]||{})[id]||{}), cur: val }
    }
  }));
  const selS = { background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:5, color:C.textPri, padding:"3px 5px", fontSize:11, outline:"none" };
  const [selTroop, setSelTroop] = useState("Infantry");
  const troopColor = { Infantry:C.green, Lancer:C.blue, Marksman:C.amber };
  return (
    <div>
      <WhereToFind>
        <strong>Alliance → War Academy → select troop type</strong> — check each
        research node's current level. Each troop type (Infantry, Lancer, Marksman)
        has its own independent research tree.
      </WhereToFind>
      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        {WA_TROOPS.map(t => (
          <button key={t} onClick={() => setSelTroop(t)}
            style={{ padding:"6px 14px", borderRadius:6, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"Syne,sans-serif",
              border:`1px solid ${selTroop===t ? troopColor[t] : C.border}`,
              background: selTroop===t ? `${troopColor[t]}15` : C.surface,
              color: selTroop===t ? troopColor[t] : C.textSec }}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {WA_RESEARCH.map(res => {
          const maxLv = res.maxLv;
          const opts = Array.from({length:maxLv+1},(_,i)=>i);
          const name = res.names?.[selTroop] || res.id;
          return (
            <div key={res.id} style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", gap:8, padding:"7px 10px",
              background:C.surface, borderRadius:6, border:`1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize:11, color:C.textPri }}>{name}</div>
                <div style={{ fontSize:10, color:C.textDim }}>{res.type}</div>
              </div>
              <select value={getCur(selTroop, res.id)}
                onChange={e => setCur(selTroop, res.id, Number(e.target.value))}
                style={{...selS, minWidth:50}}>
                {opts.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          );
        })}
      </div>
      <QASection />
    </div>
  );
}

// ─── Step 14: Chief Stats ─────────────────────────────────────────────────────
function StepChiefStats({ inv, setInv }) {
  const [purchasedQueue, setPurchasedQueue] = useLocalStorage("cp-purchased-queue", false);
  const [constructionSpeed, setConstructionSpeed] = useLocalStorage("cp-speed-buff", 0);
  const [researchSpeed,    setResearchSpeed]    = useLocalStorage("wa-speedbuff",   0);

  const row = (label, hint, children) => (
    <div style={{ display:"flex", alignItems:"flex-start",
      justifyContent:"space-between", padding:"12px 0",
      borderBottom:`1px solid ${C.border}`, gap:16 }}>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:C.textPri }}>{label}</div>
        {hint && <div style={{ fontSize:11, color:C.textSec, marginTop:2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );

  return (
    <div>
      <WhereToFind>
        <strong>Chief Profile</strong> for march queue. <strong>Construction tab → Bonus Overview</strong> for
        construction speed. <strong>War Academy tab → Bonus Overview</strong> for research speed.
      </WhereToFind>
      {row("Purchased March Queue",
        "An extra march queue slot purchased via real-money pack",
        <input type="checkbox" checked={!!purchasedQueue}
          onChange={e => setPurchasedQueue(e.target.checked)}
          style={{ accentColor:C.accent, width:18, height:18, cursor:"pointer", marginTop:2 }} />
      )}
      {row("Construction Speed",
        "Total construction speed buff % (sum of all sources)",
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <NumIn value={constructionSpeed} onChange={setConstructionSpeed} width={90} />
          <span style={{ fontSize:11, color:C.textDim }}>%</span>
        </div>
      )}
      {row("Research Speed",
        "Total research speed buff % (War Academy, Daybreak, etc.)",
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <NumIn value={researchSpeed} onChange={setResearchSpeed} width={90} />
          <span style={{ fontSize:11, color:C.textDim }}>%</span>
        </div>
      )}
      <QASection />
    </div>
  );
}

// ─── Step 15: All Set ─────────────────────────────────────────────────────────
function StepAllSet() {
  return (
    <div>
      <div style={{ fontSize:40, marginBottom:12, textAlign:"center" }}>🎉</div>
      <div style={{ fontSize:18, fontWeight:800, fontFamily:"Syne,sans-serif",
        color:C.textPri, textAlign:"center", marginBottom:8 }}>
        You're all set!
      </div>
      <p style={{ fontSize:13, color:C.textSec, textAlign:"center", marginBottom:20, lineHeight:1.6 }}>
        Your data has been saved and synced. The app is now loaded with your current
        in-game details. Here are a few things to know:
      </p>
      {[
        { icon:"⚑", title:"Report a bug or issue",     body:"Use the Flag button in the top-right corner of any page to submit a bug report or feedback." },
        { icon:"💬", title:"Message the admin",         body:"Go to Profile → Messages & Issues to send a direct message." },
        { icon:"👤", title:"Manage your profile",       body:"Profile → Account lets you update your character name, state, and alliance at any time." },
        { icon:"🏆", title:"Submit hero stats",         body:"When a hero is missing stats in the Hero Profile, hit Submit Stats — your submission helps update the database for all Tundra Command users." },
        { icon:"📖", title:"Need help?",                body:"Tap the Guide button on any page for a walkthrough of that module." },
        { icon:"🔄", title:"Re-run this wizard",        body:"Profile → Characters → Start Setup Wizard to come back to this any time." },
      ].map(item => (
        <div key={item.title} style={{ display:"flex", gap:12, marginBottom:12,
          padding:"10px 14px", background:C.surface, borderRadius:8,
          border:`1px solid ${C.border}` }}>
          <span style={{ fontSize:18, flexShrink:0 }}>{item.icon}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.textPri, marginBottom:2 }}>{item.title}</div>
            <div style={{ fontSize:12, color:C.textSec, lineHeight:1.5 }}>{item.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Wizard Component ────────────────────────────────────────────────────
export default function SetupWizard({ character, renameCharacter, inv, setInv, rcLevels, setRcLevels, onClose }) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;

  const markSeen = useCallback(() => {
    if (character?.id) {
      try { localStorage.setItem(`wizard-seen-${character.id}`, "1"); } catch {}
    }
  }, [character?.id]);

  const handleClose = () => { markSeen(); onClose(); };
  const handleComplete = () => { markSeen(); onClose(); };

  const isLast = step === total - 1;

  const renderStep = () => {
    switch (STEPS[step].id) {
      case "welcome":      return <StepWelcome />;
      case "character":    return <StepCharacter character={character} renameCharacter={renameCharacter} />;
      case "chief-gear":   return <StepChiefGear />;
      case "chief-charms": return <StepChiefCharms />;
      case "inventory":    return <StepInventory inv={inv} setInv={setInv} />;
      case "daybreak":     return <StepDaybreak />;
      case "experts":      return <StepExperts />;
      case "pets":         return <StepPets />;
      case "heroes":       return <StepHeroes />;
      case "hero-gear":    return <StepHeroGear />;
      case "construction": return <StepConstruction />;
      case "troops":       return <StepTroops />;
      case "research":     return <StepResearch rcLevels={rcLevels} setRcLevels={setRcLevels} />;
      case "war-academy":  return <StepWarAcademy />;
      case "chief-stats":  return <StepChiefStats inv={inv} setInv={setInv} />;
      case "all-set":      return <StepAllSet />;
      default:             return null;
    }
  };

  return createPortal(
    <div style={{ position:"fixed", inset:0, zIndex:10000, background:"rgba(0,0,0,0.82)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{
        background:C.card, border:`1px solid ${C.borderHi}`, borderRadius:14,
        width:"100%", maxWidth:760, height:620, display:"flex", flexDirection:"column",
        boxShadow:"0 24px 80px rgba(0,0,0,0.7)", overflow:"hidden",
      }}>

        {/* ── Header ─── */}
        <div style={{ padding:"16px 20px 12px", borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1.5px",
              textTransform:"uppercase", color:C.textDim,
              fontFamily:"'Space Mono',monospace", marginBottom:2 }}>
              Setup Wizard · Step {step + 1} of {total}
            </div>
            <div style={{ fontSize:17, fontWeight:800, fontFamily:"Syne,sans-serif",
              color:C.textPri }}>{STEPS[step].title}</div>
          </div>
          <button onClick={handleClose}
            style={{ background:"none", border:"none", cursor:"pointer",
              color:C.textDim, fontSize:13, fontFamily:"Syne,sans-serif",
              padding:"5px 10px", borderRadius:6,
              display:"flex", alignItems:"center", gap:5 }}>
            Skip wizard ✕
          </button>
        </div>

        {/* ── Progress dots ─── */}
        <div style={{ display:"flex", gap:4, padding:"10px 20px 0", flexShrink:0, flexWrap:"wrap" }}>
          {STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)}
              style={{ width: i === step ? 18 : 8, height:8, borderRadius:4,
                background: i < step ? C.accent : i === step ? C.accent : C.border,
                opacity: i <= step ? 1 : 0.4, cursor:"pointer",
                transition:"all 0.2s", flexShrink:0 }} />
          ))}
        </div>

        {/* ── Scrollable content ─── */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
          {renderStep()}
        </div>

        {/* ── Footer ─── */}
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexShrink:0, background:C.surface }}>
          <button onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{ padding:"8px 18px", borderRadius:7, fontSize:13, fontWeight:700,
              cursor: step === 0 ? "not-allowed" : "pointer",
              fontFamily:"Syne,sans-serif",
              border:`1px solid ${C.border}`, background:"transparent",
              color: step === 0 ? C.textDim : C.textPri, opacity: step === 0 ? 0.4 : 1 }}>
            ← Back
          </button>

          <span style={{ fontSize:11, color:C.textDim, fontFamily:"'Space Mono',monospace" }}>
            {step + 1} / {total}
          </span>

          {isLast ? (
            <button onClick={handleComplete}
              style={{ padding:"8px 22px", borderRadius:7, fontSize:13, fontWeight:700,
                cursor:"pointer", fontFamily:"Syne,sans-serif",
                border:"none", background:C.accent, color:"#0a0c10" }}>
              Finish 🎉
            </button>
          ) : (
            <button onClick={() => setStep(s => Math.min(total - 1, s + 1))}
              style={{ padding:"8px 22px", borderRadius:7, fontSize:13, fontWeight:700,
                cursor:"pointer", fontFamily:"Syne,sans-serif",
                border:`1px solid ${C.accent}`, background:C.accentBg, color:C.accent }}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
