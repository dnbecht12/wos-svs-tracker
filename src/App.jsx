import { useState, useEffect, useCallback } from "react";
import ConstructionPlanner from "./ConstructionPlanner.jsx";
import RFCPlanner from "./RFCPlanner.jsx";
import SvSCalendar from "./SvSCalendar.jsx";

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
    const next = typeof v === "function" ? v(val) : v;
    setVal(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }, [key, val]);
  return [val, set];
}

// ─── Initial Data (from your spreadsheet) ────────────────────────────────────
const INITIAL_INVENTORY = {
  // Construction resources
  fireCrystals:   2982,
  refinedFC:      34,
  // Hero Gear materials
  mithril:        74,
  stones:         1842,
  mythicGear:     14,
  // War Academy
  shards:         265,
  steel:          0,
  // Experts
  generalSigils:  204,
  books:          4252,
  // Chief Gear & Charms
  chiefPlans:     507,
  chiefPolish:    1387,
  chiefAlloy:     321211,
  chiefAmber:     12,
  charmDesigns:   200,
  charmGuides:    150,
  charmSecrets:   0,
  // Skill settings
  agnesSkillLevel: 8,
  zinmanSkillLevel: 5,
  zinmanBonus:    0.15,
  // WA accumulation
  dailyIntel:     30,
  weeklyPack:     true,
  labyrinthWeekly: 100,
};

const BUILDINGS = [
  { name: "Furnace",   fc: 2835, rfc: 600  },
  { name: "Embassy",   fc: 706,  rfc: 146  },
  { name: "Infantry",  fc: 1273, rfc: 266  },
  { name: "Marksman",  fc: 1273, rfc: 266  },
  { name: "Lancer",    fc: 1273, rfc: 266  },
  { name: "Command",   fc: 567,  rfc: 120  },
];

const HEROES = [
  { type: "Infantry1", name: "Hector",  pieces: [{slot:"Goggles",stones:0,mithril:0,mythic:0},{slot:"Gloves",stones:0,mithril:0,mythic:0},{slot:"Belt",stones:0,mithril:0,mythic:0},{slot:"Boots",stones:0,mithril:0,mythic:0}], svsPoints: 0 },
  { type: "Lancer1",   name: "Norah",   pieces: [{slot:"Goggles",stones:0,mithril:30,mythic:5},{slot:"Gloves",stones:0,mithril:0,mythic:0},{slot:"Belt",stones:0,mithril:0,mythic:0},{slot:"Boots",stones:0,mithril:30,mythic:5}], svsPoints: 8640000 },
  { type: "Marksman1", name: "Gwen",    pieces: [{slot:"Goggles",stones:0,mithril:0,mythic:0},{slot:"Gloves",stones:0,mithril:0,mythic:0},{slot:"Belt",stones:0,mithril:0,mythic:0},{slot:"Boots",stones:0,mithril:0,mythic:0}], svsPoints: 0 },
];

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
`;

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

  // Derived totals
  const fcNeeded = BUILDINGS.reduce((s, b) => s + b.fc, 0);
  const rfcNeeded = BUILDINGS.reduce((s, b) => s + b.rfc, 0);
  const fcBalance = inv.fireCrystals - fcNeeded;
  const rfcBalance = inv.refinedFC - rfcNeeded;
  const stoneBalance = inv.stones - HEROES.reduce((s,h) => s + h.pieces.reduce((p,g)=>p+g.stones,0),0);
  const mithBalance  = inv.mithril - HEROES.reduce((s,h) => s + h.pieces.reduce((p,g)=>p+g.mithril,0),0);

  return (
    <div className="fade-in">
      <div className="stat-grid">
        <StatCard label="Fire Crystals" value={inv.fireCrystals} sub={`need ${fmt(fcNeeded)} for FC10`} color="accent" />
        <StatCard label="Refined FC" value={inv.refinedFC} sub={`need ${fmt(rfcNeeded)} for FC10`} color="accent" />
        <StatCard label="FC Balance" value={fcBalance} sub="after all upgrades" />
        <StatCard label="RFC Balance" value={rfcBalance} sub="after all upgrades" />
        <StatCard label="Stones" value={inv.stones} sub={`${fmt(stoneBalance)} remaining`} />
        <StatCard label="Mithril" value={inv.mithril} sub={`${fmt(mithBalance)} remaining`} />
        <StatCard label="Shards (WA)" value={inv.shards} sub={`+${inv.dailyIntel}/day intel`} />
        <StatCard label="General Sigils" value={inv.generalSigils} sub="expert upgrades" />
      </div>

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

      <SectionLabel>Hero Gear Materials</SectionLabel>
      <div className="card">
        <div className="card-body">
          <div className="res-grid">
            <ResInput label="Stones" icon="ST" field="stones" value={inv.stones} onChange={update} color={COLORS.blue} />
            <ResInput label="Mithril" icon="MI" field="mithril" value={inv.mithril} onChange={update} color={COLORS.blue} />
            <ResInput label="Mythic Gear" icon="MG" field="mythicGear" value={inv.mythicGear} onChange={update} color={COLORS.blue} />
          </div>
        </div>
      </div>

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

      <SectionLabel>Expert Resources</SectionLabel>
      <div className="card">
        <div className="card-body">
          <div className="res-grid">
            <ResInput label="General Sigils" icon="GS" field="generalSigils" value={inv.generalSigils} onChange={update} color={COLORS.amber} />
            <ResInput label="Books of Knowledge" icon="BK" field="books" value={inv.books} onChange={update} color={COLORS.amber} />
          </div>
        </div>
      </div>

      <SectionLabel>Chief Gear Materials</SectionLabel>
      <div className="card">
        <div className="card-body">
          <div className="res-grid">
            <ResInput label="Plans" icon="PL" field="chiefPlans" value={inv.chiefPlans} onChange={update} />
            <ResInput label="Polish" icon="PO" field="chiefPolish" value={inv.chiefPolish} onChange={update} />
            <ResInput label="Alloy" icon="AL" field="chiefAlloy" value={inv.chiefAlloy} onChange={update} />
            <ResInput label="Amber" icon="AM" field="chiefAmber" value={inv.chiefAmber} onChange={update} />
          </div>
        </div>
      </div>

      <SectionLabel>Chief Charm Materials</SectionLabel>
      <div className="card">
        <div className="card-body">
          <div className="res-grid">
            <ResInput label="Designs" icon="DS" field="charmDesigns" value={inv.charmDesigns} onChange={update} />
            <ResInput label="Guides" icon="GD" field="charmGuides" value={inv.charmGuides} onChange={update} />
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

function HeroGearPage({ inv }) {
  const totalStones  = HEROES.flatMap(h=>h.pieces).reduce((s,p)=>s+p.stones,0);
  const totalMithril = HEROES.flatMap(h=>h.pieces).reduce((s,p)=>s+p.mithril,0);
  const totalMythic  = HEROES.flatMap(h=>h.pieces).reduce((s,p)=>s+p.mythic,0);
  const totalSVS     = HEROES.reduce((s,h)=>s+h.svsPoints,0);

  return (
    <div className="fade-in">
      <div className="stat-grid">
        <StatCard label="Stones needed" value={totalStones} sub={`have ${fmt(inv.stones)}`} />
        <StatCard label="Mithril needed" value={totalMithril} sub={`have ${fmt(inv.mithril)}`} />
        <StatCard label="Mythic needed" value={totalMythic} sub={`have ${fmt(inv.mythicGear)}`} />
        <StatCard label="SVS pts (gear)" value={totalSVS} color="accent" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Hero Gear Upgrade Status</div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hero</th><th>Type</th><th>Slot</th>
                  <th style={{textAlign:"right"}}>Stones</th>
                  <th style={{textAlign:"right"}}>Mithril</th>
                  <th style={{textAlign:"right"}}>Mythic</th>
                  <th style={{textAlign:"right"}}>SVS Pts</th>
                </tr>
              </thead>
              <tbody>
                {HEROES.map(h => h.pieces.map((p,i) => (
                  <tr key={`${h.name}-${p.slot}`}>
                    {i === 0 && <td className="pri" rowSpan={h.pieces.length} style={{verticalAlign:"middle"}}>{h.name}</td>}
                    {i === 0 && <td rowSpan={h.pieces.length} style={{verticalAlign:"middle"}}><span className="badge badge-blue">{h.type}</span></td>}
                    <td>{p.slot}</td>
                    <td className={p.stones > 0 ? "accent" : "mono"} style={{textAlign:"right"}}>{p.stones > 0 ? fmtFull(p.stones) : "—"}</td>
                    <td className={p.mithril > 0 ? "blue" : "mono"} style={{textAlign:"right", color: p.mithril>0?COLORS.blue:undefined}}>{p.mithril > 0 ? fmtFull(p.mithril) : "—"}</td>
                    <td className={p.mythic > 0 ? "green" : "mono"} style={{textAlign:"right"}}>{p.mythic > 0 ? fmtFull(p.mythic) : "—"}</td>
                    {i === 0 && <td className="accent" rowSpan={h.pieces.length} style={{textAlign:"right",verticalAlign:"middle"}}>{h.svsPoints > 0 ? fmt(h.svsPoints) : "—"}</td>}
                  </tr>
                )))}
              </tbody>
            </table>
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
  const [page, setPage] = useState("inventory");
  const [inv, setInv] = useLocalStorage("wos-svs-inventory", INITIAL_INVENTORY);
  const [savedAt, setSavedAt] = useState(null);
  const [savedPlans, setSavedPlans] = useLocalStorage("wos-rfc-saved-plans", {});
  const [loadedPlanKey, setLoadedPlanKey] = useState(null);

  useEffect(() => {
    setSavedAt(new Date().toLocaleTimeString());
  }, [inv]);

  const handleSavePlan = useCallback((key, plan) => {
    setSavedPlans(prev => ({ ...prev, [key]: plan }));
  }, [setSavedPlans]);

  const handleLoadPlan = useCallback((key) => {
    const plan = savedPlans[key];
    if (!plan) return;
    // Restore plan state into localStorage keys that RFCPlanner reads on mount
    try {
      if (plan.selectedCycle !== undefined) localStorage.setItem("rfc-cycle",    JSON.stringify(plan.selectedCycle));
      if (plan.monRefines  !== undefined) localStorage.setItem("rfc-monref",     JSON.stringify(plan.monRefines));
      if (plan.weekdayMode !== undefined) localStorage.setItem("rfc-wdmode",     JSON.stringify(plan.weekdayMode));
      if (plan.actuals     !== undefined) localStorage.setItem("rfc-actuals2",   JSON.stringify(plan.actuals));
      if (plan.fireCrystals!== undefined) setInv(p => ({ ...p, fireCrystals: plan.fireCrystals }));
      if (plan.refinedFC   !== undefined) setInv(p => ({ ...p, refinedFC:    plan.refinedFC    }));
    } catch {}
    setLoadedPlanKey(key);
    setPage("rfc-planner");
    // Force RFCPlanner to re-read from localStorage by navigating away and back
    setTimeout(() => setPage("rfc-planner"), 10);
  }, [savedPlans, setInv]);

  const handleDeletePlan = useCallback((key) => {
    setSavedPlans(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [setSavedPlans]);

  const sections = [...new Set(PAGES.map(p => p.section))];
  const pageTitle = PAGE_TITLES[page] || { title: "RFC Planner", sub: "" };
  const { title, sub } = pageTitle;
  const planKeys = Object.keys(savedPlans).sort();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLE }} />
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="wos">WoS · SvS</div>
            <h1>Planning<br /><span>Tracker</span></h1>
          </div>
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

            {/* Saved Plans section */}
            {planKeys.length > 0 && (
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
                    <span
                      onClick={e => { e.stopPropagation(); handleDeletePlan(key); }}
                      style={{color:COLORS.red,fontSize:13,lineHeight:1,padding:"2px 4px",flexShrink:0,cursor:"pointer",opacity:0.7}}
                      title="Delete plan"
                    >✕</span>
                  </div>
                ))}
              </div>
            )}
          </nav>
          <div className="sidebar-footer">
            v1.0 · Auto-saves
          </div>
        </aside>

        <main className="main">
          <div className="page-header">
            <div className="page-header-row">
              <div>
                <div className="page-title">{title.split(" ").map((w,i) => i===0 ? <span key={i}>{w} </span> : <span key={i} style={{color:COLORS.accent}}>{w} </span>)}</div>
                <div className="page-sub">{loadedPlanKey ? `Editing saved plan: ${loadedPlanKey}` : sub}</div>
              </div>
              {savedAt && <div className="last-saved">auto-saved {savedAt}</div>}
            </div>
          </div>

          <div className="page-body">
            {page === "inventory"    && <InventoryPage    inv={inv} setInv={setInv} />}
            {page === "construction" && <ConstructionPlanner inv={inv} setInv={setInv} />}
            {page === "rfc-planner"  && <RFCPlanner inv={inv} setInv={setInv} savedPlans={savedPlans} onSavePlan={handleSavePlan} onLoadPlan={handleLoadPlan} />}
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
