import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { useTierContext, GuestBanner } from "./TierContext.jsx";

// ─── COLORS (CSS variable references — theme applied by App.jsx on :root) ─────
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

// ─── Expert Data & Components ─────────────────────────────────────────────────
// fmt, fmtFull, clsx defined in the utility block below (from original App.jsx)
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
  body { background: var(--c-bg); color: var(--c-textPri); font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--c-surface); }
  ::-webkit-scrollbar-thumb { background: var(--c-borderHi); border-radius: 3px; }
  input[type=number] { -moz-appearance: textfield; }
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }

  .app { display: flex; min-height: 100vh; }

  /* Sidebar */
  .sidebar { width: 220px; min-width: 220px; background: var(--c-surface); border-right: 1px solid var(--c-border); display: flex; flex-direction: column; padding: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .sidebar-logo { padding: 0; border-bottom: 1px solid var(--c-border); overflow: hidden; position: relative; background: #0D1B2A; }
  .sidebar-logo .tc-top-bar { height: 3px; background: #4A9EBF; width: 100%; }
  .sidebar-logo .tc-body { padding: 14px 16px 14px; position: relative; }
  .sidebar-logo .tc-corner { position: absolute; width: 8px; height: 8px; border-color: #4A9EBF; border-style: solid; opacity: 0.7; }
  .sidebar-logo .tc-corner.tl { top: 6px; left: 8px; border-width: 1px 0 0 1px; }
  .sidebar-logo .tc-corner.tr { top: 6px; right: 8px; border-width: 1px 1px 0 0; }
  .sidebar-logo .tc-corner.bl { bottom: 6px; left: 8px; border-width: 0 0 1px 1px; }
  .sidebar-logo .tc-corner.br { bottom: 6px; right: 8px; border-width: 0 1px 1px 0; }
  .sidebar-logo .tc-badge { display: flex; justify-content: center; margin-bottom: 8px; }
  .sidebar-logo .tc-rule { height: 0.5px; background: #1E3A52; margin: 0 4px 10px; }
  .sidebar-logo .tc-tundra { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; color: #E8F4F8; letter-spacing: 2px; text-align: center; line-height: 1; margin-bottom: 4px; }
  .sidebar-logo .tc-command { font-family: 'Syne', sans-serif; font-size: 10px; font-weight: 600; color: #4A9EBF; letter-spacing: 5px; text-align: center; }
  .sidebar-nav { padding: 12px 8px; flex: 1; }
  .nav-section { font-size: 10px; font-weight: 700; color: var(--c-textSec); letter-spacing: 2px; text-transform: uppercase; padding: 12px 12px 6px; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--c-textPri); transition: all 0.15s; border: 1px solid transparent; margin-bottom: 1px; }
  .nav-item:hover { color: var(--c-textPri); background: var(--c-card); }
  .nav-item.active { color: var(--c-accent); background: var(--c-accentBg); border-color: var(--c-accentDim); }
  .nav-item .nav-icon { font-size: 15px; width: 18px; text-align: center; font-family: 'Space Mono', monospace; }
  .nav-badge { margin-left: auto; font-size: 10px; font-family: 'Space Mono', monospace; background: var(--c-accentBg); color: var(--c-accent); border: 1px solid var(--c-accentDim); padding: 1px 6px; border-radius: 3px; }
  .sidebar-footer { padding: 16px 20px; border-top: 1px solid var(--c-border); font-size: 11px; color: var(--c-textDim); font-family: 'Space Mono', monospace; }

  /* Main content */
  .main { flex: 1; overflow-x: hidden; }
  .page-header { padding: 28px 32px 20px; border-bottom: 1px solid var(--c-border); background: var(--c-surface); position: sticky; top: 0; z-index: 10; }
  .page-header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .page-title { font-size: 22px; font-weight: 800; color: var(--c-textPri); }
  .page-title span { color: var(--c-accent); }
  .page-sub { font-size: 13px; color: var(--c-textPri); margin-top: 4px; }
  .last-saved { font-size: 11px; font-family: 'Space Mono', monospace; color: var(--c-textSec); }
  .page-body { padding: 28px 32px; }

  /* Cards */
  .card { background: var(--c-card); border: 1px solid var(--c-border); border-radius: 10px; }
  .card-header { padding: 16px 20px; border-bottom: 1px solid var(--c-border); display: flex; align-items: center; justify-content: space-between; }
  .card-title { font-size: 13px; font-weight: 700; color: var(--c-textPri); letter-spacing: 0.5px; text-transform: uppercase; }
  .card-sub { font-size: 12px; color: var(--c-textPri); margin-top: 2px; }
  .card-body { padding: 20px; }

  /* Stat grid */
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .stat-card { background: var(--c-card); border: 1px solid var(--c-border); border-radius: 8px; padding: 14px 16px; transition: border-color 0.15s; }
  .stat-card:hover { border-color: var(--c-borderHi); }
  .stat-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--c-textSec); margin-bottom: 8px; }
  .stat-value { font-size: 24px; font-weight: 800; font-family: 'Space Mono', monospace; color: var(--c-textPri); line-height: 1; }
  .stat-value.positive { color: var(--c-green); }
  .stat-value.negative { color: var(--c-red); }
  .stat-value.accent { color: var(--c-accent); }
  .stat-sub { font-size: 11px; color: var(--c-textSec); margin-top: 5px; font-family: 'Space Mono', monospace; }

  /* Resource input row */
  .res-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
  .res-item { display: flex; align-items: center; gap: 10px; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 8px; padding: 10px 14px; transition: border-color 0.15s; }
  .res-item:focus-within { border-color: var(--c-accent); }
  .res-icon { font-size: 18px; width: 24px; text-align: center; flex-shrink: 0; font-family: 'Space Mono', monospace; font-size: 13px; color: var(--c-textSec); }
  .res-label { font-size: 12px; font-weight: 600; color: var(--c-textPri); flex: 1; min-width: 0; }
  .res-input { width: 90px; background: transparent; border: none; outline: none; font-family: 'Space Mono', monospace; font-size: 14px; font-weight: 700; color: var(--c-textPri); text-align: right; }
  .res-input::placeholder { color: var(--c-textSec); }

  /* Section divider */
  .section-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--c-textSec); margin-bottom: 12px; margin-top: 24px; display: flex; align-items: center; gap: 8px; }
  .section-label::after { content: ''; flex: 1; height: 1px; background: var(--c-border); }

  /* Construction table */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--c-textSec); border-bottom: 1px solid var(--c-border); white-space: nowrap; }
  td { padding: 11px 12px; border-bottom: 1px solid var(--c-border); color: var(--c-textPri); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--c-hover, rgba(0,0,0,0.03)); }
  td.mono { font-family: 'Space Mono', monospace; font-size: 12px; }
  td.pri { color: var(--c-textPri); font-weight: 600; }
  td.green { color: var(--c-green); font-family: 'Space Mono', monospace; }
  td.red { color: var(--c-red); font-family: 'Space Mono', monospace; }
  td.amber { color: var(--c-amber); font-family: 'Space Mono', monospace; }
  td.accent { color: var(--c-accent); font-family: 'Space Mono', monospace; }

  /* Badge */
  .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; font-family: 'Space Mono', monospace; }
  .badge-green { background: var(--c-greenBg); color: var(--c-green); border: 1px solid var(--c-greenDim); }
  .badge-red { background: var(--c-redBg); color: var(--c-red); border: 1px solid var(--c-redDim); }
  .badge-amber { background: var(--c-amberBg); color: var(--c-amber); }
  .badge-blue { background: var(--c-blueBg); color: var(--c-blue); border: 1px solid var(--c-blueDim); }
  .badge-accent { background: var(--c-accentBg); color: var(--c-accent); border: 1px solid var(--c-accentDim); }

  /* Progress bar */
  .progress-wrap { background: var(--c-border); border-radius: 4px; height: 6px; overflow: hidden; }
  .progress-bar { height: 100%; border-radius: 4px; transition: width 0.3s ease; }

  /* Toggle */
  .toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; gap: 8px; font-size: 13px; color: var(--c-textPri); }
  .toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .toggle-track { width: 36px; height: 20px; background: var(--c-border); border-radius: 10px; transition: background 0.2s; position: relative; flex-shrink: 0; }
  .toggle input:checked ~ .toggle-track { background: var(--c-accent); }
  .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: transform 0.2s; }
  .toggle input:checked ~ .toggle-track .toggle-thumb { transform: translateX(16px); }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; border: 1px solid; font-family: 'Syne', sans-serif; }
  .btn-accent { background: var(--c-accent); color: var(--c-btnText); border-color: var(--c-accent); }
  .btn-accent:hover { background: #3A8EAF; border-color: #3A8EAF; }
  .btn-ghost { background: transparent; color: var(--c-textSec); border-color: var(--c-border); }
  .btn-ghost:hover { color: var(--c-textPri); border-color: var(--c-borderHi); background: var(--c-surface); }

  /* Expert cards */
  .expert-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .expert-card { background: var(--c-card); border: 1px solid var(--c-border); border-radius: 10px; overflow: hidden; transition: border-color 0.15s; }
  .expert-card:hover { border-color: var(--c-borderHi); }
  .expert-head { padding: 14px 16px; border-bottom: 1px solid var(--c-border); display: flex; align-items: center; gap: 12px; }
  .expert-avatar { width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; font-family: 'Space Mono', monospace; background: var(--c-accentBg); color: var(--c-accent); border: 1px solid var(--c-accentDim); flex-shrink: 0; }
  .expert-name { font-size: 15px; font-weight: 700; color: var(--c-textPri); }
  .expert-bonus { font-size: 11px; color: var(--c-textSec); margin-top: 2px; }
  .expert-body { padding: 12px 16px; }
  .expert-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 12px; color: var(--c-textPri); border-bottom: 1px solid var(--c-border); }
  .expert-row:last-child { border-bottom: none; }
  .expert-val { font-family: 'Space Mono', monospace; font-size: 12px; color: var(--c-textPri); font-weight: 700; }

  /* SVS schedule */
  .svs-row { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--c-border); }
  .svs-row:last-child { border-bottom: none; }
  .svs-day { width: 90px; font-size: 13px; font-weight: 700; color: var(--c-textPri); flex-shrink: 0; }
  .svs-bar-wrap { flex: 1; }
  .svs-pts { font-family: 'Space Mono', monospace; font-size: 13px; color: var(--c-accent); width: 90px; text-align: right; flex-shrink: 0; }

  /* Responsive */
  @media (max-width: 768px) {
    .sidebar {
      position: fixed; top: 0; left: 0; height: 100vh; z-index: 150;
      transform: translateX(-100%); transition: transform 0.25s ease;
      box-shadow: 4px 0 24px rgba(0,0,0,0.5);
    }
    .sidebar.open { transform: translateX(0); }
    .sidebar-overlay { display: block !important; }
    .page-body { padding: 16px; }
    .page-header { padding: 14px 16px; }
    .stat-grid { grid-template-columns: repeat(2, 1fr); }
    .hamburger { display: flex !important; }
  }
  .sidebar-overlay {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    z-index: 149; cursor: pointer;
  }
  .hamburger {
    display: none; align-items: center; justify-content: center;
    width: 36px; height: 36px; background: var(--c-card); border: 1px solid var(--c-border);
    border-radius: 7px; cursor: pointer; flex-direction: column; gap: 5px; flex-shrink: 0;
  }
  .hamburger span {
    display: block; width: 18px; height: 2px;
    background: var(--c-textSec); border-radius: 2px; transition: all 0.2s;
  }
  .hamburger:hover span { background: var(--c-textPri); }

  /* Animations */
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn 0.25s ease forwards; }

  /* Auth panel */
  .auth-panel { padding: 14px 12px; border-top: 1px solid var(--c-border); }
  .auth-user-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; background: var(--c-card); border: 1px solid var(--c-border); margin-bottom: 8px; }
  .auth-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--c-accentBg); border: 1px solid var(--c-accentDim); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--c-accent); flex-shrink: 0; font-family: 'Space Mono', monospace; }
  .auth-email { font-size: 11px; color: var(--c-textSec); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .auth-signout { font-size: 10px; color: var(--c-textDim); cursor: pointer; padding: 2px 6px; border-radius: 4px; border: 1px solid var(--c-border); background: transparent; font-family: 'Space Mono', monospace; transition: all 0.15s; }
  .auth-signout:hover { color: var(--c-red); border-color: var(--c-redDim); }
  .auth-sync-badge { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--c-green); font-family: 'Space Mono', monospace; padding: 2px 0; margin-bottom: 4px; }
  .auth-sync-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c-green); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .auth-form { display: flex; flex-direction: column; gap: 7px; }
  .auth-inp { background: var(--c-card); border: 1px solid var(--c-border); border-radius: 6px; padding: 7px 10px; font-family: 'Space Mono', monospace; font-size: 12px; color: var(--c-textPri); outline: none; width: 100%; transition: border-color 0.15s; }
  .auth-inp:focus { border-color: var(--c-accent); }
  .auth-inp::placeholder { color: var(--c-textDim); font-size: 11px; }
  .auth-btn { padding: 8px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Syne', sans-serif; border: none; transition: all 0.15s; width: 100%; }
  .auth-btn-primary { background: var(--c-accent); color: var(--c-btnText); }
  .auth-btn-primary:hover { opacity: 0.9; }
  .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-btn-ghost { background: transparent; color: var(--c-textSec); border: 1px solid var(--c-border); font-size: 11px; padding: 5px; }
  .auth-btn-ghost:hover { color: var(--c-textSec); border-color: var(--c-borderHi); }
  .auth-error { font-size: 10px; color: var(--c-red); font-family: 'Space Mono', monospace; padding: 5px 8px; background: var(--c-redBg); border-radius: 4px; border: 1px solid var(--c-redDim); line-height: 1.4; }
  .auth-toggle { font-size: 11px; color: var(--c-textSec); text-align: center; }
  .auth-toggle span { color: var(--c-accent); text-decoration: underline; cursor: pointer; }
  .auth-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--c-textSec); margin-bottom: 8px; font-family: 'Space Mono', monospace; }

  /* Character switcher */
  .char-switcher { padding: 10px 10px 0; }
  .char-select { width: 100%; background: var(--c-card); border: 1px solid var(--c-border); border-radius: 7px; color: var(--c-textPri); font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; padding: 8px 10px; cursor: pointer; outline: none; transition: border-color 0.15s; }
  .char-select:focus { border-color: var(--c-accent); }
  .char-select option { background: var(--c-card); }

  /* Modal overlay */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: var(--c-card); border: 1px solid var(--c-borderHi); border-radius: 14px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,0.6); }
  .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--c-border); display: flex; align-items: center; justify-content: space-between; }
  .modal-title { font-size: 15px; font-weight: 800; color: var(--c-textPri); }
  .modal-close { background: none; border: none; color: var(--c-textDim); cursor: pointer; font-size: 18px; line-height: 1; padding: 4px; }
  .modal-close:hover { color: var(--c-textPri); }
  .modal-body { padding: 20px 24px; }
  .modal-section { margin-bottom: 24px; }
  .modal-section:last-child { margin-bottom: 0; }
  .modal-section-title { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--c-textDim); margin-bottom: 12px; font-family: 'Space Mono', monospace; }
  .modal-inp { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 7px; padding: 8px 12px; font-family: 'Space Mono', monospace; font-size: 12px; color: var(--c-textPri); outline: none; width: 100%; transition: border-color 0.15s; box-sizing: border-box; }
  .modal-inp:focus { border-color: var(--c-accent); }
  .modal-inp::placeholder { color: var(--c-textDim); }
  .modal-btn { padding: 9px 16px; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Syne', sans-serif; border: none; transition: all 0.15s; }
  .modal-btn-primary { background: var(--c-accent); color: var(--c-btnText); }
  .modal-btn-primary:hover { opacity: 0.88; }
  .modal-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
  .modal-btn-ghost { background: transparent; color: var(--c-textSec); border: 1px solid var(--c-border); }
  .modal-btn-ghost:hover { border-color: var(--c-borderHi); color: var(--c-textPri); }
  .modal-btn-danger { background: var(--c-redBg); color: var(--c-red); border: 1px solid var(--c-redDim); }
  .modal-btn-danger:hover { background: var(--c-red); color: #fff; }
  .modal-error { font-size: 11px; color: var(--c-red); font-family: 'Space Mono', monospace; padding: 7px 10px; background: var(--c-redBg); border-radius: 5px; border: 1px solid var(--c-redDim); margin-top: 8px; }
  .modal-success { font-size: 11px; color: var(--c-green); font-family: 'Space Mono', monospace; padding: 7px 10px; background: var(--c-greenBg); border-radius: 5px; border: 1px solid var(--c-greenDim); margin-top: 8px; }
  .char-list-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 8px; margin-bottom: 8px; }
  .char-list-item.is-active { border-color: var(--c-accentDim); background: var(--c-accentBg); }
  .char-avatar-sm { width: 30px; height: 30px; border-radius: 50%; background: var(--c-card); border: 1px solid var(--c-border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--c-accent); flex-shrink: 0; font-family: 'Space Mono', monospace; }
  .char-name-text { font-size: 13px; font-weight: 700; color: var(--c-textPri); }
  .char-state-text { font-size: 10px; color: var(--c-textDim); font-family: 'Space Mono', monospace; }
  .profile-btn-wrap { display: flex; align-items: center; gap: 8px; padding: 12px 12px; cursor: pointer; border-top: 1px solid var(--c-border); transition: background 0.15s; }
  .profile-btn-wrap:hover { background: var(--c-hover, rgba(0,0,0,0.03)); }
  .profile-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--c-accentBg); border: 1px solid var(--c-accentDim); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--c-accent); flex-shrink: 0; font-family: 'Space Mono', monospace; }
`;

// ─── Profile Management Modal ─────────────────────────────────────────────────

function ProfileModal({ open, onClose, initialSection="account",
  user, characters, activeCharId,
  addCharacter, removeCharacter, renameCharacter, makeDefault, switchCharacter,
  changePassword, requestDeleteAccount, confirmDeleteAccount,
  charError, clearCharError, authError, clearAuthError,
  theme, setTheme, resetToSystem,
  notifications=[], setNotifications,
}) {
  const [section, setSection]       = useState(initialSection);
  const [msg, setMsg]               = useState("");
  const [msgType, setMsgType]       = useState("success"); // "success"|"error"
  // New character form
  const [newName,  setNewName]      = useState("");
  const [newState, setNewState]     = useState("");
  const [newAlliance, setNewAlliance] = useState("");
  // Edit character
  const [editId,   setEditId]       = useState(null);
  const [editName, setEditName]     = useState("");
  const [editState,setEditState]    = useState("");
  const [editAlliance, setEditAlliance] = useState("");
  // Delete account
  const [deleteStep, setDeleteStep] = useState(0); // 0=idle,1=email sent,2=otp entry
  const [otp, setOtp]               = useState("");
  const [busy, setBusy]             = useState(false);
  // My Submissions
  const [mySubs,    setMySubs]      = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  // Issues submitted by this user
  const [myIssues,     setMyIssues]    = useState([]);
  const [issuesLoading,setIssuesLoading] = useState(false);
  // Locally tracked "read" stat submissions (stored in localStorage per user)
  const [readSubIds,   setReadSubIds]  = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("read-sub-ids") || "[]")); }
    catch { return new Set(); }
  });

  const markSubRead = (id) => {
    setReadSubIds(prev => {
      const next = new Set(prev); next.add(id);
      try { localStorage.setItem("read-sub-ids", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // Submissions tab — closed folder toggle
  const [closedFolderOpen, setClosedFolderOpen] = useState(false);

  useEffect(() => { if (open) setSection(initialSection); }, [open, initialSection]);
  useEffect(() => { clearCharError?.(); clearAuthError?.(); setMsg(""); }, [section]);
  useEffect(() => {
    if (open && section === "account" && user) {
      setSubsLoading(true);
      supabase.from("stat_submissions")
        .select("*")
        .eq("submitted_by", user.id)
        .order("submitted_at", { ascending: false })
        .then(({ data }) => { setMySubs(data || []); setSubsLoading(false); });
    }
    if (open && section === "submissions" && user) {
      // Load stat submissions
      setSubsLoading(true);
      supabase.from("stat_submissions")
        .select("*")
        .eq("submitted_by", user.id)
        .order("submitted_at", { ascending: false })
        .then(({ data }) => { setMySubs(data || []); setSubsLoading(false); });
      // Load issue reports
      setIssuesLoading(true);
      supabase.from("issue_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .then(({ data }) => { setMyIssues(data || []); setIssuesLoading(false); });
    }
  }, [open, section, user]);

  const flash = (text, type="success") => { setMsg(text); setMsgType(type); setTimeout(()=>setMsg(""),4000); };

  if (!open) return null;

  const C = COLORS;

  const handleAddChar = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    const c = await addCharacter(newName.trim(), newState ? parseInt(newState) : null, newAlliance.trim() || null);
    setBusy(false);
    if (c) { setNewName(""); setNewState(""); setNewAlliance(""); flash(`Character "${c.name}" added!`); }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setBusy(true);
    await renameCharacter(editId, editName.trim(), editState ? parseInt(editState) : null, editAlliance.trim() || null);
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

  const unreadCount = notifications.filter(n => !n.read).length;
  const tabs = [
    { id:"characters",   label:"Characters" },
    { id:"account",      label:"Account"    },
    { id:"submissions",  label:"Submissions & Issues", badge: unreadCount },
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
                transition:"all 0.15s",marginBottom:-1,
                display:"flex",alignItems:"center",gap:6}}>
              {t.label}
              {t.badge > 0 && (
                <span style={{background:C.red,color:"#fff",borderRadius:10,
                  padding:"1px 6px",fontSize:10,fontWeight:800}}>{t.badge}</span>
              )}
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
                          <input className="modal-inp" value={editAlliance} onChange={e=>setEditAlliance(e.target.value.toUpperCase().slice(0,3))} placeholder="Alliance tag (e.g. ABC)" />
                          <div style={{display:"flex",gap:6,marginTop:2}}>
                            <button className="modal-btn modal-btn-primary" onClick={handleSaveEdit} disabled={busy}>Save</button>
                            <button className="modal-btn modal-btn-ghost" onClick={()=>setEditId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="char-name-text">
                            {c.alliance ? <span style={{color:C.textDim,fontFamily:"'Space Mono',monospace"}}>[{c.alliance}] </span> : null}{c.name}
                          </div>
                          <div className="char-state-text">
                            {c.state_number ? `State ${c.state_number}` : <span style={{color:C.red,fontWeight:600}}>No state set</span>}
                            {!c.alliance && <span style={{color:C.red,fontWeight:600}}> · No alliance set</span>}
                          </div>
                        </>
                      )}
                    </div>
                    {editId !== c.id && (
                      <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                        {c.is_default && <span style={{fontSize:9,fontWeight:700,letterSpacing:1,background:C.accentBg,color:C.accent,border:`1px solid ${C.accentDim}`,padding:"2px 6px",borderRadius:3}}>DEFAULT</span>}
                        <div style={{display:"flex",gap:4}}>
                          <button className="modal-btn modal-btn-ghost" style={{padding:"3px 8px",fontSize:10}}
                            onClick={()=>{ setEditId(c.id); setEditName(c.name); setEditState(c.state_number||""); setEditAlliance(c.alliance||""); }}>Edit</button>
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
                    <input className="modal-inp" value={newAlliance} onChange={e=>setNewAlliance(e.target.value.toUpperCase().slice(0,3))} placeholder="Alliance tag (e.g. ABC)" />
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
                <div className="modal-section-title">Appearance</div>
                <p style={{fontSize:12,color:C.textSec,marginBottom:12}}>Choose your preferred color theme. Auto follows your system setting.</p>
                <div style={{display:"flex",gap:8}}>
                  {[
                    {id:"auto",  label:"Auto"},
                    {id:"dark",  label:"🌙 Dark"},
                    {id:"light", label:"☀️ Light"},
                  ].map(opt => {
                    const isActive = opt.id === "auto"
                      ? !localStorage.getItem("wos-theme")
                      : theme === opt.id && localStorage.getItem("wos-theme") === opt.id;
                    return (
                      <button key={opt.id}
                        className="modal-btn"
                        onClick={() => opt.id === "auto" ? resetToSystem() : setTheme(opt.id)}
                        style={{
                          background: isActive ? C.accent : "transparent",
                          color: isActive ? "#0a0c10" : C.textSec,
                          border: `1px solid ${isActive ? C.accent : C.border}`,
                          flex:1,
                        }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

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

          {/* ── Submissions & Issues tab ── */}
          {section === "submissions" && (() => {
            const fmtDT = s => s ? new Date(s).toLocaleString([], {dateStyle:"short",timeStyle:"short"}) : "—";

            // Stat submissions split
            const activeSubs  = mySubs.filter(s => !readSubIds.has(s.id) && s.status !== "accepted");
            const closedSubs  = mySubs.filter(s => readSubIds.has(s.id) || s.status === "accepted");

            // Issues split — active = not closed; archived = closed AND read notification
            const activeIssues = myIssues.filter(i => i.status !== "closed");
            const closedIssues = myIssues.filter(i => i.status === "closed");

            // Notifications split
            const unreadNotifs = notifications.filter(n => !n.read);
            const readNotifs   = notifications.filter(n => n.read);

            // Anything in closed folder
            const hasClosed = closedSubs.length > 0 || closedIssues.length > 0 || readNotifs.length > 0;

            const issueStatusStyle = (status) => {
              if (status === "submitted")    return { bg:C.redBg,    color:C.red,    border:C.redDim };
              if (status === "acknowledged") return { bg:C.blueBg,   color:C.blue,   border:C.blueDim };
              if (status === "in_progress")  return { bg:C.amberBg,  color:C.amber,  border:"#7d5a0d" };
              if (status === "resolved")     return { bg:C.greenBg,  color:C.green,  border:C.greenDim };
              return { bg:C.surface, color:C.textDim, border:C.border };
            };

            const isEmpty = unreadNotifs.length === 0 && activeIssues.length === 0 && activeSubs.length === 0;

            return (
              <div style={{display:"flex",flexDirection:"column",gap:16}}>

                {/* ── Notifications (top) ── */}
                {unreadNotifs.length > 0 && (
                  <div>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
                      color:C.red,fontFamily:"Space Mono,monospace",marginBottom:8,
                      display:"flex",alignItems:"center",gap:6}}>
                      🔔 Notifications
                      <span style={{background:C.red,color:"#fff",borderRadius:10,
                        padding:"1px 6px",fontSize:10,fontWeight:800}}>{unreadNotifs.length}</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {unreadNotifs.map(notif => (
                        <div key={notif.id} style={{background:C.accentBg,
                          border:`1px solid ${C.accentDim}`,borderRadius:8,padding:"10px 12px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                            <span style={{fontSize:9,fontWeight:800,color:C.accent,
                              fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>● NEW</span>
                            <span style={{fontSize:10,fontWeight:700,color:C.accent,
                              fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>
                              {notif.issue_type}
                            </span>
                            <span style={{fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace"}}>
                              {notif.module}
                            </span>
                            <span style={{fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace",marginLeft:"auto"}}>
                              {fmtDT(notif.created_at)}
                            </span>
                          </div>
                          <div style={{fontSize:12,color:C.textPri,marginBottom:8,lineHeight:1.5}}>
                            {notif.admin_note}
                          </div>
                          <button onClick={async () => {
                            await markNotificationRead(notif.id);
                            setNotifications(p => p.map(n => n.id===notif.id ? {...n,read:true} : n));
                          }} style={{fontSize:10,fontWeight:700,cursor:"pointer",
                            padding:"2px 8px",borderRadius:4,fontFamily:"Space Mono,monospace",
                            background:"transparent",color:C.textDim,border:`1px solid ${C.border}`}}>
                            Mark as read
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Active Issues ── */}
                {(issuesLoading || activeIssues.length > 0) && (
                  <div>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
                      color:C.textSec,fontFamily:"Space Mono,monospace",marginBottom:8}}>
                      Issue Reports
                    </div>
                    {issuesLoading ? (
                      <div style={{fontSize:12,color:C.textDim,fontFamily:"Space Mono,monospace"}}>Loading…</div>
                    ) : (
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {activeIssues.map(issue => {
                          const sc = issueStatusStyle(issue.status);
                          const lastChange = issue.updated_at || issue.submitted_at;
                          return (
                            <div key={issue.id} style={{background:C.surface,
                              border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px"}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                                <span style={{fontSize:10,fontWeight:700,color:C.textDim,
                                  fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>
                                  {issue.issue_type}
                                </span>
                                <span style={{fontSize:10,color:C.accent,fontFamily:"Space Mono,monospace"}}>
                                  {issue.module}
                                </span>
                                <span style={{marginLeft:"auto",fontSize:10,fontWeight:700,
                                  padding:"2px 8px",borderRadius:4,fontFamily:"Space Mono,monospace",
                                  background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`}}>
                                  {(issue.status||"acknowledged").replace("_"," ").toUpperCase()}
                                </span>
                              </div>
                              <div style={{fontSize:12,color:C.textPri,marginBottom:6,lineHeight:1.5}}>
                                {issue.description}
                              </div>
                              <div style={{fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace"}}>
                                Submitted: {fmtDT(issue.submitted_at)}
                                {lastChange && lastChange !== issue.submitted_at &&
                                  ` · Last update: ${fmtDT(lastChange)}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Active Stat Submissions ── */}
                {(subsLoading || activeSubs.length > 0) && (
                  <div>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
                      color:C.textSec,fontFamily:"Space Mono,monospace",marginBottom:8}}>
                      Hero Stat Submissions
                    </div>
                    {subsLoading ? (
                      <div style={{fontSize:12,color:C.textDim,fontFamily:"Space Mono,monospace"}}>Loading…</div>
                    ) : (
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {activeSubs.map(sub => {
                          const status = sub.status || "pending";
                          const statusColor = status === "rejected" ? C.red : C.amber;
                          const statusBg    = status === "rejected" ? C.redBg : C.amberBg;
                          return (
                            <div key={sub.id} style={{background:C.surface,
                              border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px"}}>
                              <div style={{display:"flex",alignItems:"center",
                                justifyContent:"space-between",marginBottom:4}}>
                                <span style={{fontSize:13,fontWeight:700,color:C.textPri}}>
                                  {sub.hero_name}
                                </span>
                                <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,
                                  background:statusBg,color:statusColor,
                                  border:`1px solid ${statusColor}40`,
                                  fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>
                                  {status}
                                </span>
                              </div>
                              <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace",marginBottom:4}}>
                                Stars: {sub.stars} · Level: {sub.level} · Widget: {sub.widget ?? "N/A"}
                              </div>
                              <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace",marginBottom:4}}>
                                Submitted: {fmtDT(sub.submitted_at)}
                              </div>
                              {status === "rejected" && sub.admin_note && (
                                <div style={{marginTop:4,fontSize:11,color:C.red,
                                  background:C.redBg,borderRadius:5,padding:"5px 8px",
                                  fontFamily:"Space Mono,monospace",marginBottom:6}}>
                                  Note: {sub.admin_note}
                                </div>
                              )}
                              <button onClick={() => markSubRead(sub.id)}
                                style={{fontSize:10,fontWeight:700,cursor:"pointer",marginTop:4,
                                  padding:"2px 8px",borderRadius:4,fontFamily:"Space Mono,monospace",
                                  background:"transparent",color:C.textDim,border:`1px solid ${C.border}`}}>
                                Dismiss
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {isEmpty && !subsLoading && !issuesLoading && (
                  <div style={{fontSize:12,color:C.textDim,fontFamily:"Space Mono,monospace",
                    padding:"20px 0",textAlign:"center"}}>
                    Nothing active — all clear! 🎉
                  </div>
                )}

                {/* ── 📁 Closed folder ── */}
                {hasClosed && (
                  <div style={{marginTop:4}}>
                    <button onClick={() => setClosedFolderOpen(o => !o)}
                      style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",
                        cursor:"pointer",padding:"8px 0",width:"100%",textAlign:"left"}}>
                      <span style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",
                        textTransform:"uppercase",color:C.textSec,fontFamily:"Space Mono,monospace"}}>
                        📁 Closed / Dismissed ({closedSubs.length + closedIssues.length + readNotifs.length})
                      </span>
                      <span style={{fontSize:11,color:C.textDim,marginLeft:"auto"}}>
                        {closedFolderOpen ? "▲" : "▼"}
                      </span>
                    </button>
                    {closedFolderOpen && (
                      <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8,opacity:0.7}}>
                        {/* Read notifications */}
                        {readNotifs.map(notif => (
                          <div key={notif.id} style={{background:C.surface,
                            border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px"}}>
                            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:3}}>
                              <span style={{fontSize:10,fontWeight:700,color:C.textDim,
                                fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>
                                {notif.issue_type}
                              </span>
                              <span style={{fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace"}}>
                                {notif.module}
                              </span>
                              <span style={{fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace",marginLeft:"auto"}}>
                                {fmtDT(notif.created_at)}
                              </span>
                            </div>
                            <div style={{fontSize:11,color:C.textSec}}>{notif.admin_note}</div>
                          </div>
                        ))}
                        {/* Closed issues */}
                        {closedIssues.map(issue => (
                          <div key={issue.id} style={{background:C.surface,
                            border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px"}}>
                            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:3}}>
                              <span style={{fontSize:10,fontWeight:700,color:C.textDim,
                                fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>
                                {issue.issue_type}
                              </span>
                              <span style={{fontSize:10,color:C.textDim,fontFamily:"Space Mono,monospace"}}>
                                {issue.module}
                              </span>
                              <span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:4,
                                background:C.surface,color:C.textDim,border:`1px solid ${C.border}`,
                                fontFamily:"Space Mono,monospace",textTransform:"uppercase",marginLeft:"auto"}}>
                                CLOSED
                              </span>
                            </div>
                            <div style={{fontSize:11,color:C.textSec,marginBottom:4}}>{issue.description}</div>
                            {issue.admin_note && (
                              <div style={{fontSize:11,color:C.green,fontFamily:"Space Mono,monospace",
                                background:C.greenBg,borderRadius:4,padding:"3px 7px"}}>
                                Admin: {issue.admin_note}
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Dismissed/accepted stat submissions */}
                        {closedSubs.map(sub => {
                          const status = sub.status || "pending";
                          const color  = status === "accepted" ? C.green : C.textDim;
                          const bg     = status === "accepted" ? C.greenBg : C.surface;
                          return (
                            <div key={sub.id} style={{background:C.surface,
                              border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px"}}>
                              <div style={{display:"flex",alignItems:"center",
                                justifyContent:"space-between",marginBottom:3}}>
                                <span style={{fontSize:12,fontWeight:700,color:C.textSec}}>
                                  {sub.hero_name}
                                </span>
                                <span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:4,
                                  background:bg,color:color,
                                  border:`1px solid ${color}40`,
                                  fontFamily:"Space Mono,monospace",textTransform:"uppercase"}}>
                                  {status}
                                </span>
                              </div>
                              <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace"}}>
                                Stars: {sub.stars} · Level: {sub.level} · {fmtDT(sub.submitted_at)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

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

function ResInput({ label, icon, field, value, onChange, color, tabIndex }) {
  const [localVal, setLocalVal] = useState(value);
  const [focused,  setFocused]  = useState(false);

  const prevValue = useRef(value);
  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      setLocalVal(value);
    }
  }, [value]);

  const handleFocus = () => setFocused(true);

  const handleBlur = () => {
    setFocused(false);
    prevValue.current = localVal;
    onChange(field, localVal);
  };

  const handleChange = e => {
    const n = parseInt(e.target.value, 10);
    setLocalVal(isNaN(n) ? 0 : Math.max(0, n));
  };

  return (
    <div className="res-item" style={color ? { borderColor: color + "40" } : {}}>
      <div className="res-icon">{icon}</div>
      <div className="res-label">{label}</div>
      <input
        className="res-input"
        type={focused ? "number" : "text"}
        min={0}
        tabIndex={tabIndex}
        value={focused ? localVal : (localVal === 0 ? "0" : Number(localVal).toLocaleString())}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            // Move to next focusable element (same behavior as Tab)
            const focusable = Array.from(document.querySelectorAll('input[tabindex]')).sort((a,b) => (Number(a.tabIndex)||0) - (Number(b.tabIndex)||0));
            const cur = focusable.indexOf(e.target);
            if (cur >= 0 && cur < focusable.length - 1) focusable[cur+1].focus();
            else e.target.blur();
          }
        }}
        style={color ? { color } : {}}
      />
    </div>
  );
}

// Resource input with M/B unit selector for large numbers (Meat, Wood, Coal, Iron, Steel)
function ResBigInput({ label, icon, field, value, unit, onChangeVal, onChangeUnit, color, tabIndex }) {
  const [localVal, setLocalVal] = useState(value);
  const [focused,  setFocused]  = useState(false);
  const prevValue = useRef(value);
  useEffect(() => {
    if (prevValue.current !== value) { prevValue.current = value; setLocalVal(value); }
  }, [value]);
  const handleBlur = () => {
    setFocused(false);
    prevValue.current = localVal;
    onChangeVal(field, localVal);
  };
  const COLORS_MAP = { M:"M", B:"B" };
  const displayVal = focused ? localVal : (localVal === 0 ? "0" : localVal);
  return (
    <div className="res-item" style={color ? { borderColor: color + "40" } : {}}>
      <div className="res-icon">{icon}</div>
      <div className="res-label">{label}</div>
      <div style={{display:"flex",alignItems:"center",gap:4,flex:1,justifyContent:"flex-end"}}>
        <input
          className="res-input"
          type="number"
          min={0}
          step="0.01"
          tabIndex={tabIndex}
          value={displayVal}
          style={{...(color?{color}:{}), width:80, textAlign:"right"}}
          onFocus={()=>setFocused(true)}
          onBlur={handleBlur}
          onChange={e => setLocalVal(parseFloat(e.target.value)||0)}
          onKeyDown={e => { if(e.key==="Enter") e.target.blur(); }}
        />
        <select value={unit} onChange={e=>onChangeUnit(field+"Unit", e.target.value)}
          style={{background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:5,
            padding:"2px 4px",fontSize:11,color:"var(--c-textSec)",cursor:"pointer",outline:"none",fontFamily:"Space Mono,monospace"}}>
          <option value="M">M</option>
          <option value="B">B</option>
        </select>
      </div>
    </div>
  );
}

// Standalone single-value speedup input (Hours or Minutes mode)
// Must be top-level — never defined inside a render — to prevent remount on every keystroke
function SpeedupSingleInput({ totalMins, unit, onCommit, color, numStyle, tabIndex }) {
  const toDisplay = () => unit === "hrs"
    ? (totalMins > 0 ? +(totalMins / 60).toFixed(2) : 0)
    : (totalMins > 0 ? totalMins : 0);

  const [focused, setFocused] = React.useState(false);
  const [local, setLocal] = React.useState(toDisplay());

  // Sync from parent when totalMins changes externally (e.g. mode switch)
  const prevMins = React.useRef(totalMins);
  React.useEffect(() => {
    if (!focused && prevMins.current !== totalMins) {
      prevMins.current = totalMins;
      setLocal(toDisplay());
    }
  }, [totalMins, focused]);

  const displayVal = focused
    ? local
    : (Number(local) > 0 ? Number(local).toLocaleString() : "");

  return (
    <input
      type={focused ? "number" : "text"}
      inputMode="numeric"
      min={0}
      step={unit === "hrs" ? "0.5" : "1"}
      tabIndex={tabIndex}
      placeholder="0"
      value={displayVal}
      style={{...numStyle, width:120}}
      onFocus={() => {
        setFocused(true);
        setLocal(toDisplay());
      }}
      onBlur={e => {
        setFocused(false);
        const raw = parseFloat(String(e.target.value).replace(/,/g, "")) || 0;
        setLocal(raw);
        prevMins.current = unit === "hrs" ? Math.round(raw * 60) : Math.round(raw);
        onCommit(raw);
      }}
      onChange={e => setLocal(e.target.value)}
    />
  );
}

// Speed-up input: Days / Hours / Minutes with total display
// mode: "dhm" = 3 fields, "hrs" = single hours field, "mins" = single minutes field
function SpeedupInput({ label, icon, dField, hField, mField, dVal, hVal, mVal, onChange, color, tabIndexBase, mode="dhm" }) {
  const [localD, setLocalD] = useState(dVal||0);
  const [localH, setLocalH] = useState(hVal||0);
  const [localM, setLocalM] = useState(mVal||0);

  // Sync from parent when values change externally
  const prevD = useRef(dVal); const prevH = useRef(hVal); const prevM = useRef(mVal);
  useEffect(() => { if (prevD.current !== dVal) { prevD.current = dVal; setLocalD(dVal||0); } }, [dVal]);
  useEffect(() => { if (prevH.current !== hVal) { prevH.current = hVal; setLocalH(hVal||0); } }, [hVal]);
  useEffect(() => { if (prevM.current !== mVal) { prevM.current = mVal; setLocalM(mVal||0); } }, [mVal]);

  const totalMins = localD*1440 + localH*60 + localM;
  const dispD = Math.floor(totalMins/1440);
  const dispH = Math.floor((totalMins%1440)/60);
  const dispM = totalMins%60;
  const fmtTotal = totalMins===0 ? "—"
    : [dispD>0?`${dispD}d`:"", dispH>0?`${dispH}h`:"", dispM>0?`${dispM}m`:""].filter(Boolean).join(" ");

  // Commit a total-minutes value back to D/H/M fields
  const commitMins = (mins) => {
    const m = Math.max(0, Math.round(mins));
    const d = Math.floor(m / 1440);
    const h = Math.floor((m % 1440) / 60);
    const mn = m % 60;
    setLocalD(d); setLocalH(h); setLocalM(mn);
    onChange(dField, d); onChange(hField, h); onChange(mField, mn);
  };

  const numStyle = {
    background:"var(--c-card)",border:"1px solid var(--c-border)",borderRadius:5,
    padding:"5px 8px",fontSize:13,color:color||"var(--c-textPri)",outline:"none",
    fontFamily:"Space Mono,monospace",textAlign:"right",fontWeight:700,
    transition:"border-color .15s",
  };
  const sepStyle = { fontSize:11, color:"var(--c-textDim)", fontFamily:"Space Mono,monospace", flexShrink:0 };

  return (
    <div style={{
      display:"flex",alignItems:"center",gap:10,
      background:"var(--c-surface)",border:"1px solid var(--c-border)",
      borderRadius:8,padding:"10px 14px",transition:"border-color .15s",
    }}
    onFocus={e=>e.currentTarget.style.borderColor="var(--c-accent)"}
    onBlur={e=>{ e.currentTarget.style.borderColor="var(--c-border)"; }}
    >
      <span style={{fontSize:13,color:"var(--c-textSec)",fontFamily:"Space Mono,monospace",flexShrink:0,width:24,textAlign:"center"}}>{icon}</span>
      <span style={{fontSize:12,fontWeight:600,color:"var(--c-textPri)",flexShrink:0,minWidth:100}}>{label}</span>

      {mode === "dhm" && (<>
        <input type="number" min={0} style={{...numStyle,width:64}} tabIndex={tabIndexBase}
          value={localD}
          onChange={e=>{const v=Math.max(0,parseInt(e.target.value)||0);setLocalD(v);}}
          onBlur={()=>onChange(dField,localD)}
          onFocus={e=>e.target.select()} />
        <span style={sepStyle}>d</span>
        <input type="number" min={0} max={23} style={{...numStyle,width:64}} tabIndex={tabIndexBase+1}
          value={localH}
          onChange={e=>{const v=Math.max(0,parseInt(e.target.value)||0);setLocalH(v);}}
          onBlur={()=>onChange(hField,localH)}
          onFocus={e=>e.target.select()} />
        <span style={sepStyle}>h</span>
        <input type="number" min={0} max={59} style={{...numStyle,width:64}} tabIndex={tabIndexBase+2}
          value={localM}
          onChange={e=>{const v=Math.max(0,parseInt(e.target.value)||0);setLocalM(v);}}
          onBlur={()=>onChange(mField,localM)}
          onFocus={e=>e.target.select()} />
        <span style={sepStyle}>m</span>
      </>)}

      {mode === "hrs" && (<>
        <SpeedupSingleInput
          totalMins={totalMins}
          unit="hrs"
          onCommit={raw => commitMins(raw * 60)}
          color={color}
          numStyle={numStyle}
          tabIndex={tabIndexBase}
        />
        <span style={sepStyle}>hrs</span>
      </>)}

      {mode === "mins" && (<>
        <SpeedupSingleInput
          totalMins={totalMins}
          unit="mins"
          onCommit={raw => commitMins(raw)}
          color={color}
          numStyle={numStyle}
          tabIndex={tabIndexBase}
        />
        <span style={sepStyle}>mins</span>
      </>)}

      <span style={{fontSize:12,fontFamily:"Space Mono,monospace",marginLeft:"auto",flexShrink:0,
        color:totalMins>0?(color||"var(--c-blue)"):"var(--c-textDim)"}}>
        {fmtTotal}
      </span>
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
  const [speedMode, setSpeedMode] = useState("dhm"); // "dhm" | "hrs" | "mins"
  const toggleSpeedMode = (m) => {
    const y = window.scrollY;
    setSpeedMode(m);
    requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
  };

  const Section = ({ title, sub, children }) => (
    <div className="card" style={{marginBottom:16}}>
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          {sub && <div className="card-sub">{sub}</div>}
        </div>
      </div>
      <div className="card-body">
        <div className="res-grid">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="fade-in">

      <Section title="Construction Resources" sub="Fire Crystals & Refined FC — your core building currency">
        <ResInput label="Fire Crystals" icon="FC" field="fireCrystals" value={inv.fireCrystals} onChange={update} color={COLORS.accent} tabIndex={1} />
        <ResInput label="Refined FC"    icon="RF" field="refinedFC"    value={inv.refinedFC}    onChange={update} color={COLORS.accent} tabIndex={2} />
      </Section>

      <Section title="Research" sub="Shards, Steel & daily accumulation rates">
        <ResInput label="Shards"               icon="SH" field="shards"          value={inv.shards}               onChange={update} color={COLORS.blue} tabIndex={3} />
        <ResBigInput label="Steel"             icon="SL" field="steel"           value={inv.steel??0} unit={inv.steelUnit||"M"} onChangeVal={update} onChangeUnit={update} color={COLORS.blue} tabIndex={4} />
        <ResInput label="Daily Intel (shards)" icon="IN" field="dailyIntel"      value={inv.dailyIntel}           onChange={update} tabIndex={5} />
        <ResInput label="Steel / Hour"         icon="S/" field="steelHourlyRate" value={inv.steelHourlyRate ?? 0} onChange={update} tabIndex={6} />
      </Section>

      <Section title="Hero Level & Gear Materials" sub="Stones, Mithril & Mythic materials">
        <ResInput label="Stones"                 icon="ST" field="stones"          value={inv.stones}                onChange={update} color={COLORS.blue} tabIndex={7} />
        <ResInput label="Mithril"                icon="MI" field="mithril"         value={inv.mithril}               onChange={update} color={COLORS.blue} tabIndex={8} />
        <ResInput label="Consumable Mythic Gear" icon="MG" field="mythicGear"      value={inv.mythicGear}            onChange={update} color={COLORS.blue} tabIndex={9} />
        <ResInput label="Mythic General Shards"  icon="MS" field="mythicGenShards" value={inv.mythicGenShards ?? 0}  onChange={update} color={COLORS.blue} tabIndex={10} />
      </Section>

      <Section title="Chief Gear Materials" sub="Plans, Polish, Alloy & Amber">
        <ResInput label="Plans"  icon="PL" field="chiefPlans"  value={inv.chiefPlans}  onChange={update} tabIndex={11} />
        <ResInput label="Polish" icon="PO" field="chiefPolish" value={inv.chiefPolish} onChange={update} tabIndex={12} />
        <ResInput label="Alloy"  icon="AL" field="chiefAlloy"  value={inv.chiefAlloy}  onChange={update} tabIndex={13} />
        <ResInput label="Amber"  icon="AM" field="chiefAmber"  value={inv.chiefAmber}  onChange={update} tabIndex={14} />
      </Section>

      <Section title="Chief Charm Materials" sub="Designs, Guides & Secrets">
        <ResInput label="Designs" icon="DS" field="charmDesigns" value={inv.charmDesigns} onChange={update} tabIndex={15} />
        <ResInput label="Guides"  icon="GD" field="charmGuides"  value={inv.charmGuides}  onChange={update} tabIndex={16} />
        <ResInput label="Secrets" icon="SC" field="charmSecrets" value={inv.charmSecrets} onChange={update} tabIndex={17} />
      </Section>

      <Section title="Expert Resources" sub="Books of Knowledge & Expert Sigils">
        <ResInput label="Books of Knowledge" icon="BK" field="books"          value={inv.books}                onChange={update} color={COLORS.amber} tabIndex={18} />
        <ResInput label="General Sigils"     icon="GS" field="generalSigils"  value={inv.generalSigils}        onChange={update} color={COLORS.amber} tabIndex={19} />
        <ResInput label="Cyrille Sigils"     icon="CY" field="cyrilleSigils"  value={inv.cyrilleSigils  ?? 0}  onChange={update} color={COLORS.amber} tabIndex={20} />
        <ResInput label="Agnes Sigils"       icon="AN" field="agnesSigils"    value={inv.agnesSigils    ?? 0}  onChange={update} color={COLORS.amber} tabIndex={21} />
        <ResInput label="Romulus Sigils"     icon="RO" field="romulusSigils"  value={inv.romulusSigils  ?? 0}  onChange={update} color={COLORS.amber} tabIndex={22} />
        <ResInput label="Holger Sigils"      icon="HO" field="holgerSigils"   value={inv.holgerSigils   ?? 0}  onChange={update} color={COLORS.amber} tabIndex={23} />
        <ResInput label="Fabian Sigils"      icon="FA" field="fabianSigils"   value={inv.fabianSigils   ?? 0}  onChange={update} color={COLORS.amber} tabIndex={24} />
        <ResInput label="Baldur Sigils"      icon="BA" field="baldurSigils"   value={inv.baldurSigils   ?? 0}  onChange={update} color={COLORS.amber} tabIndex={25} />
        <ResInput label="Valeria Sigils"     icon="VA" field="valeriaSigils"  value={inv.valeriaSigils  ?? 0}  onChange={update} color={COLORS.amber} tabIndex={26} />
        <ResInput label="Ronne Sigils"       icon="RN" field="ronneSigils"    value={inv.ronneSigils    ?? 0}  onChange={update} color={COLORS.amber} tabIndex={27} />
        <ResInput label="Kathy Sigils"       icon="KT" field="kathySigils"    value={inv.kathySigils    ?? 0}  onChange={update} color={COLORS.amber} tabIndex={28} />
      </Section>

      <Section title="Raw Materials" sub="Basic resources — Meat, Wood, Coal, Iron">
        <ResBigInput label="Meat" icon="MT" field="meat" value={inv.meat??0} unit={inv.meatUnit||"M"} onChangeVal={update} onChangeUnit={update} color={COLORS.green} tabIndex={28} />
        <ResBigInput label="Wood" icon="WD" field="wood" value={inv.wood??0} unit={inv.woodUnit||"M"} onChangeVal={update} onChangeUnit={update} color={COLORS.green} tabIndex={29} />
        <ResBigInput label="Coal" icon="CL" field="coal" value={inv.coal??0} unit={inv.coalUnit||"M"} onChangeVal={update} onChangeUnit={update} color={COLORS.green} tabIndex={30} />
        <ResBigInput label="Iron" icon="IR" field="iron" value={inv.iron??0} unit={inv.ironUnit||"M"} onChangeVal={update} onChangeUnit={update} color={COLORS.green} tabIndex={31} />
      </Section>

      <Section title="Other / Misc. Items" sub="Stamina & Speed-ups">
        <ResInput label="Stamina (cans)" icon="🥤" field="stamina" value={inv.stamina??0} onChange={update} color={COLORS.green} tabIndex={32} />
        <div style={{gridColumn:"1/-1",display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
        <div style={{gridColumn:"1/-1",display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--c-textSec)",fontFamily:"Space Mono,monospace"}}>Speed-ups</div>
            <div style={{display:"flex",gap:4}}>
              {[["dhm","D/H/M"],["hrs","Hours"],["mins","Minutes"]].map(([m,lbl]) => (
                <button key={m} type="button" onClick={e=>{e.preventDefault();e.stopPropagation();toggleSpeedMode(m);}}
                  style={{padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:700,
                    cursor:"pointer",fontFamily:"Space Mono,monospace",
                    background: speedMode===m ? "var(--c-accentBg)" : "transparent",
                    color: speedMode===m ? "var(--c-accent)" : "var(--c-textDim)",
                    border: `1px solid ${speedMode===m ? "var(--c-accentDim)" : "var(--c-border)"}` }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <SpeedupInput label="General"        icon="GN" dField="speedGenD"      hField="speedGenH"      mField="speedGenM"      dVal={inv.speedGenD}      hVal={inv.speedGenH}      mVal={inv.speedGenM}      onChange={update} color={COLORS.blue}   tabIndexBase={33} mode={speedMode} />
          <SpeedupInput label="Troop Training" icon="TR" dField="speedTroopD"    hField="speedTroopH"    mField="speedTroopM"    dVal={inv.speedTroopD}    hVal={inv.speedTroopH}    mVal={inv.speedTroopM}    onChange={update} color={COLORS.green}  tabIndexBase={36} mode={speedMode} />
          <SpeedupInput label="Construction"   icon="CN" dField="speedConstD"    hField="speedConstH"    mField="speedConstM"    dVal={inv.speedConstD}    hVal={inv.speedConstH}    mVal={inv.speedConstM}    onChange={update} color={COLORS.accent} tabIndexBase={39} mode={speedMode} />
          <SpeedupInput label="Research"       icon="RS" dField="speedResearchD" hField="speedResearchH" mField="speedResearchM" dVal={inv.speedResearchD} hVal={inv.speedResearchH} mVal={inv.speedResearchM} onChange={update} color={COLORS.amber}  tabIndexBase={42} mode={speedMode} />
          <SpeedupInput label="Learning"       icon="LN" dField="speedLearningD" hField="speedLearningH" mField="speedLearningM" dVal={inv.speedLearningD} hVal={inv.speedLearningH} mVal={inv.speedLearningM} onChange={update} color={COLORS.blue}   tabIndexBase={45} mode={speedMode} />
          <SpeedupInput label="Healing"        icon="HL" dField="speedHealingD"  hField="speedHealingH"  mField="speedHealingM"  dVal={inv.speedHealingD}  hVal={inv.speedHealingH}  mVal={inv.speedHealingM}  onChange={update} color={COLORS.green}  tabIndexBase={48} mode={speedMode} />
        </div>
        </div>
      </Section>

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

function ExpertsPage({ inv, setInv, onCompleteSvs }) {
  const C = COLORS;
  const { isGuest } = useTierContext();

  // ── Expert Data Tables ──────────────────────────────────────────────────────

  // Per-level affinity costs for each expert (index = level, value = affinity points to reach that level)
  const EXPERT_LEVEL_AFFINITY = {
    Cyrille: [0,1000,200,210,220,230,240,260,280,300,320,340,360,380,400,420,440,460,480,500,520,540,560,580,600,620,640,660,680,700,730,760,790,820,850,880,910,940,970,1000,1040,1080,1120,1160,1200,1240,1280,1320,1360,1400,1450,1500,1550,1600,1650,1700,1750,1800,1850,1900,1950,2000,2050,2100,2150,2200,2250,2300,2350,2400,2450,2500,2550,2600,2650,2700,2750,2800,2850,2900,2950,3000,3050,3100,3150,3200,3250,3300,3350,3400,3450,3500,3550,3600,3650,3700,3750,3800,3850,3900,3950],
    Agnes:   [0,1000,240,260,270,280,290,320,340,360,390,410,440,460,480,510,530,560,580,600,630,650,680,700,720,750,770,800,820,840,880,920,950,990,1020,1060,1100,1130,1170,1210,1250,1300,1350,1400,1440,1490,1540,1590,1640,1680,1740,1800,1860,1920,1980,2040,2100,2160,2220,2280,2340,2400,2460,2520,2580,2640,2700,2760,2820,2880,2940,3000,3060,3120,3180,3240,3300,3360,3420,3480,3540,3600,3660,3720,3780,3840,3900,3960,4020,4080,4140,4200,4260,4320,4380,4440,4500,4560,4620,4680,4740],
    Romulus: [0,1000,1100,1160,1210,1270,1320,1430,1540,1650,1760,1870,1980,2090,2200,2310,2420,2530,2640,2750,2860,2970,3080,3190,3300,3520,3620,3720,3820,3920,4020,4180,4350,4510,4680,4840,5000,5170,5330,5500,5720,5940,6160,6380,6600,6820,7040,7260,7480,7700,7980,8250,8530,8800,9080,9350,9630,9900,10180,10450,10730,11000,11280,11560,11830,12110,12380,12660,12930,13210,13480,13750,14030,14300,14580,14850,15130,15400,15680,15950,16230,16500,16780,17050,17330,17600,17880,18150,18430,18700,18980,19250,19530,19800,20080,20350,20630,20900,21180,21450,21730],
    Holger:  [0,1000,600,630,660,690,720,780,840,900,960,1020,1080,1140,1200,1260,1320,1380,1440,1500,1560,1620,1680,1740,1800,1860,1920,1980,2040,2100,2190,2280,2370,2460,2550,2640,2730,2820,2910,3000,3120,3240,3360,3480,3600,3720,3840,3960,4080,4200,4350,4500,4650,4800,4950,5100,5250,5400,5550,5700,5850,6000,6150,6300,6450,6600,6750,6900,7050,7200,7350,7500,7650,7800,7950,8100,8250,8400,8550,8700,8850,9000,9150,9300,9450,9600,9750,9900,10050,10200,10350,10500,10650,10800,10950,11100,11250,11400,11550,11700,11850],
    Fabian:  [0,1000,1000,1050,1100,1150,1200,1300,1400,1500,1600,1700,1800,1900,2000,2100,2200,2300,2400,2500,2600,2700,2800,2900,3000,3100,3200,3300,3400,3500,3650,3800,3950,4100,4250,4400,4550,4700,4850,5000,5200,5400,5600,5800,6000,6200,6400,6600,6800,7000,7250,7500,7750,8000,8250,8500,8750,9000,9250,9500,9750,10000,10250,10500,10750,11000,11250,11500,11750,12000,12250,12500,12750,13000,13250,13500,13750,14000,14250,14500,14750,15000,15250,15500,15750,16000,16250,16500,16750,17000,17250,17500,17750,18000,18250,18500,18750,19000,19250,19500,19750],
    Baldur:  [0,1000,400,420,440,460,480,520,560,600,640,680,720,760,800,840,880,920,960,1000,1040,1080,1120,1160,1200,1240,1280,1320,1360,1400,1460,1520,1580,1640,1700,1760,1820,1880,1940,2000,2080,2160,2240,2320,2400,2480,2560,2640,2720,2800,2900,3000,3100,3200,3300,3400,3500,3600,3700,3800,3900,4000,4100,4200,4300,4400,4500,4600,4700,4800,4900,5000,5100,5200,5300,5400,5500,5600,5700,5800,5900,6000,6100,6200,6300,6400,6500,6600,6700,6800,6900,7000,7100,7200,7300,7400,7500,7600,7700,7800,7900],
    Valeria: [0,1000,1840,1940,2030,2120,2210,2400,2580,2760,2950,3130,3320,3500,3680,3870,4050,4240,4420,4600,4790,4970,5160,5340,5520,5710,5890,6080,6260,6440,6720,7000,7270,7550,7820,8100,8380,8650,8930,9200,9570,9940,10310,10680,11040,11410,11780,12150,12520,12880,13340,13800,14260,14720,15180,15640,16100,16560,17020,17480,17940,18400,18860,19320,19780,20240,20700,21160,21620,22080,22540,23000,23460,23920,24380,24840,25300,25760,26220,26680,27140,27600,28060,28520,28980,29440,29900,30360,30820,31280,31740,32200,32660,33120,33580,34040,34500,34960,35420,35880,36340],
    Ronne:   [0,1000,600,630,660,690,720,780,840,900,960,1020,1080,1140,1200,1260,1320,1380,1440,1500,1560,1620,1680,1740,1800,1860,1920,1980,2040,2100,2190,2280,2370,2460,2550,2640,2730,2820,2910,3000,3120,3240,3360,3480,3600,3720,3840,3960,4080,4200,4350,4500,4650,4800,4950,5100,5250,5400,5550,5700,5850,6000,6150,6300,6450,6600,6750,6900,7050,7200,7350,7500,7650,7800,7950,8100,8250,8400,8550,8700,8850,9000,9150,9300,9450,9600,9750,9900,10050,10200,10350,10500,10650,10800,10950,11100,11250,11400,11550,11700,11850],
    Kathy:   [0,1000,900,950,990,1040,1080,1170,1260,1350,1440,1530,1620,1710,1800,1890,1980,2070,2160,2250,2340,2430,2520,2610,2700,2790,2880,2970,3060,3150,3290,3420,3560,3690,3830,3960,4100,4230,4370,4500,4680,4860,5040,5220,5400,5580,5760,5940,6120,6300,6530,6750,6980,7200,7430,7650,7880,8100,8330,8550,8780,9000,9230,9450,9680,9900,10130,10350,10580,10800,11030,11250,11480,11700,11930,12150,12380,12600,12830,13050,13280,13500,13730,13950,14180,14400,14630,14850,15080,15300,15530,15750,15980,16200,16430,16650,16880,17100,17330,17550,17780],
  };

  // Skill book costs: [books_to_reach_S1, S2, S3, ... S20] — 0-indexed so index=skill level
  // null = that level doesn't exist for this expert/skill
  const SKILL_BOOK_COSTS = {
    Cyrille: {
      sk1: [0,0,70,140,210,280,350,420,490,560,630,null,null,null,null,null,null,null,null,null,null],
      sk2: [0,0,400,800,1600,3200,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sk3: [0,0,500,1000,2000,4000,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sk4: [0,0,100,200,300,400,500,600,700,800,900,null,null,null,null,null,null,null,null,null,null],
    },
    Agnes: {
      sk1: [0,0,500,1000,2000,4000,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sk2: [0,0,400,800,1600,3200,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sk3: [0,0,200,400,800,1600,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sk4: [0,0,100,200,300,400,500,600,700,800,900,null,null,null,null,null,null,null,null,null,null],
    },
    Romulus: {
      sk1: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      sk2: [0,0,500,1000,1500,2000,2500,3000,3500,4000,4500,5000,5500,6000,7000,8000,8000,9000,9000,10000,10000],
      sk3: [0,0,800,1500,2200,3000,3800,4500,5200,6000,6800,7500,8200,9000,10500,12000,12000,13500,13500,15000,15000],
      sk4: [0,0,800,1500,2200,3000,3800,4500,5200,6000,6800,7500,8200,9000,10500,12000,12000,13500,13500,15000,15000],
    },
    Holger: {
      // Arena Elite (Lv 10) — wiki: 600/1200/1800/2400/3000/3600/4200/4800/5400
      sk1: [0,0,600,1200,1800,2400,3000,3600,4200,4800,5400,null,null,null,null,null,null,null,null,null,null],
      // Crowd Pleaser (Lv 10) — wiki: 300/600/900/1200/1500/1800/2100/2400/2700
      sk2: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Arena Star (Lv 10) — wiki: 300/600/900/1200/1500/1800/2100/2400/2700
      sk3: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Legacy (Lv 10) — wiki: 600/1200/1800/2400/3000/3600/4200/4800/5400
      sk4: [0,0,600,1200,1800,2400,3000,3600,4200,4800,5400,null,null,null,null,null,null,null,null,null,null],
    },
    Fabian: {
      // Salvager (Lv 10) — wiki: 300/600/900/1200/1500/1800/2100/2400/2700
      sk1: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Crisis Rescue (Lv 10) — wiki: 500/1000/1500/2000/2500/3000/3500/4000/4500
      sk2: [0,0,500,1000,1500,2000,2500,3000,3500,4000,4500,null,null,null,null,null,null,null,null,null,null],
      // Heightened Firepower (Lv 20) — wiki: 200/500/700/1000/1200/1500/1700/2000/2300/2500/2700/3000/3500/4000/4000/4500/4500/5100/5100
      sk3: [0,0,200,500,700,1000,1200,1500,1700,2000,2300,2500,2700,3000,3500,4000,4000,4500,4500,5100,5100],
      // Battle Bulwark (Lv 20) — wiki: 300/700/1000/1400/1800/2100/2400/2800/3200/3500/3800/4200/4900/5700/5700/6400/6400/7100/7100
      sk4: [0,0,300,700,1000,1400,1800,2100,2400,2800,3200,3500,3800,4200,4900,5700,5700,6400,6400,7100,7100],
    },
    Baldur: {
      // Blazing Sunrise (Lv 10) — wiki: 300/600/900/1200/1500/1800/2100/2400/2700
      sk1: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Honored Conquest (Lv 10) — wiki: 300/600/900/1200/1500/1800/2100/2400/2700
      sk2: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Bounty Hunter (Lv 10) — wiki: 300/600/900/1200/1500/1800/2100/2400/2700
      sk3: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Dawn Hymn (Lv 10) — wiki: 500/1000/1500/2000/2500/3000/3500/4000/4500
      sk4: [0,0,500,1000,1500,2000,2500,3000,3500,4000,4500,null,null,null,null,null,null,null,null,null,null],
    },
    Valeria: {
      // Well Prepared (Lv 10) — wiki: 500/1000/1500/2000/2500/3000/3500/4000/4500
      sk1: [0,0,500,1000,1500,2000,2500,3000,3500,4000,4500,null,null,null,null,null,null,null,null,null,null],
      // Radiant Honor (Lv 10) — wiki: 500/1000/1500/2000/2500/3000/3500/4000/4500
      sk2: [0,0,500,1000,1500,2000,2500,3000,3500,4000,4500,null,null,null,null,null,null,null,null,null,null],
      // Battle Concerto (Lv 20) — wiki: 800/1500/2200/3000/3800/4500/5200/6000/6800/7500/8200/9000/10500/12000/12000/13500/13500/15000/15000
      sk3: [0,0,800,1500,2200,3000,3800,4500,5200,6000,6800,7500,8200,9000,10500,12000,12000,13500,13500,15000,15000],
      // Crushing Force (Lv 20) — wiki: 800/1500/2200/3000/3800/4500/5200/6000/6800/7500/8200/9000/10500/12000/12000/13500/13500/15000/15000
      sk4: [0,0,800,1500,2200,3000,3800,4500,5200,6000,6800,7500,8200,9000,10500,12000,12000,13500,13500,15000,15000],
    },
    Ronne: {
      // Cartographic Memory (Lv 10)
      sk1: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Treasure Scent (Lv 10)
      sk2: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Giving Back (Lv 10)
      sk3: [0,0,600,1200,1800,2400,3000,3600,4200,4800,5400,null,null,null,null,null,null,null,null,null,null],
      // Gold Class (Lv 10)
      sk4: [0,0,1200,2400,3600,4800,6000,7200,8400,9600,10800,null,null,null,null,null,null,null,null,null,null],
    },
    Kathy: {
      // Icefire Hunter (Lv 10): books per level from wiki
      sk1: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Valorous Cold (Lv 10): books per level from wiki
      sk2: [0,0,300,600,900,1200,1500,1800,2100,2400,2700,null,null,null,null,null,null,null,null,null,null],
      // Winter Treasures (Lv 10): books per level from wiki
      sk3: [0,0,1000,2000,3000,4000,5000,6000,7000,8000,9000,null,null,null,null,null,null,null,null,null,null],
      // Efficient Mining (Lv 10): books per level from wiki
      sk4: [0,0,1200,2400,3600,4800,6000,7200,8400,9600,10800,null,null,null,null,null,null,null,null,null,null],
    },
  };

  // Affinity (Bonus) levels — sigils needed to reach each B level
  const AFFINITY_SIGILS = {
    Cyrille: [0,0,5,10,15,20,25,30,35,40,45,50],
    Agnes:   [0,0,5,10,15,20,25,30,35,40,45,50],
    Romulus: [0,0,20,40,80,120,160,200,240,280,320,360],
    Holger:  [0,0,8,16,24,32,40,48,56,64,72,80],
    Fabian:  [0,0,12,24,36,48,60,72,84,96,108,120],
    Baldur:  [0,0,6,12,18,24,30,36,42,48,54,60],
    Valeria: [0,0,20,40,60,80,100,120,140,160,180,200],
    Ronne:   [0,0,8,16,24,32,40,48,56,64,72,80],
    Kathy:   [0,0,10,20,30,40,50,60,70,80,90,100],
  };

  const AFFINITY_NAMES = ["0","1","2","3","4","5","6","7","8","9","10","11"];
  const AFFINITY_LABELS = ["—","Stranger","Acquaintance 1","Acquaintance 2","Acquaintance 3","Casual 1","Casual 2","Casual 3","Close 1","Close 2","Close 3","Intimate"];

  // Bonus (affinity) skill values per expert per B-level
  const BONUS_VALUES = {
    Cyrille: ["0%","2%","4%","6%","9%","12%","15%","18%","21%","24%","27%","30%"],
    Agnes:   ["—","1 (max 10)","1 (max 12)","1 (max 14)","2 (max 16)","2 (max 18)","3 (max 20)","3 (max 22)","4 (max 24)","4 (max 26)","5 (max 28)","5 (max 30)"],
    Romulus: ["—","+300","+600","+1,000","+1,500","+200","+3,000","+4,000","+5,500","+7,000","+8,500","+10,000"],
    Holger:  ["—","50% | 1","55% | 1","60% | 1","65% | 1","70% | 1","75% | 2","80% | 2","85% | 2","90% | 2","95% | 2","100% | 3"],
    Fabian:  ["0%","2%","4%","6%","9%","12%","15%","18%","21%","24%","27%","30%"],
    Baldur:  ["5% | 20%","5% | 20%","5% | 28%","5% | 36%","5% | 44%","5% | 52%","10% | 60%","10% | 68%","10% | 76%","10% | 84%","10% | 92%","15% | 100%"],
    Valeria: ["0%","2%","4%","6%","9%","12%","15%","18%","21%","24%","27%","30%"],
    Ronne:   ["0%","2%","4%","6%","9%","12%","15%","18%","21%","24%","27%","30%"],
    Kathy:   ["—","—","—","—","—","—","—","—","—","—","—","—"],
  };

  // Expert roster definition
  const EXPERTS = [
    {
      name: "Cyrille", invKey: "cyrilleSigils", color: "#4A9EBF",
      bonus: "Hunter's Heart", bonusDesc: "Increases Bear Damage",
      skills: [
        { name: "Entrapment",    desc: "Bear trap rally cap",          maxSk: 10 },
        { name: "Scavenging",    desc: "Additional XP components",     maxSk: 5  },
        { name: "Weapon Master", desc: "Additional Essence Stones",    maxSk: 5  },
        { name: "Ursa's Bane",   desc: "Deployment capacity",          maxSk: 10 },
      ],
    },
    {
      name: "Agnes", invKey: "agnesSigils", color: "#7B9E6B",
      bonus: "Earthbreaker", bonusDesc: "Chests from gathering",
      skills: [
        { name: "Efficient Recon",  desc: "Extra Intel missions/day",          maxSk: 5  },
        { name: "Optimization",     desc: "Additional Stamina",                maxSk: 5  },
        { name: "Project Mgmt",     desc: "Construction speed on new builds",  maxSk: 5  },
        { name: "Covert Knowledge", desc: "Mystery Badges + Shop refreshes",   maxSk: 10 },
      ],
    },
    {
      name: "Romulus", invKey: "romulusSigils", color: "#C0392B",
      bonus: "Commander's Crest", bonusDesc: "Increases Expedition Army size (Deployment Capacity)",
      skills: [
        { name: "Call of War",      desc: "+600 free troops/day from Camp + 10 daily Loyalty Tags", maxSk: 10 },
        { name: "Last Line",        desc: "Troops' Attack & Defense +10%",                          maxSk: 20 },
        { name: "Spirit of Aeetes", desc: "Troops' Lethality & Health +10%",                       maxSk: 20 },
        { name: "One Heart",        desc: "+100,000 Rally Capacity",                                maxSk: 20 },
      ],
    },
    {
      name: "Holger", invKey: "holgerSigils", color: "#8E44AD",
      bonus: "Blade Dancing", bonusDesc: "100% chance of 3 Arena Star Chests from audience",
      skills: [
        { name: "Arena Elite",   desc: "Arena heroes Attack & Health +20%",              maxSk: 10 },
        { name: "Crowd Pleaser", desc: "+50% daily & weekly Arena Tokens earned",        maxSk: 10 },
        { name: "Arena Star",    desc: "+3 Arena Shop items at 50% discount",            maxSk: 10 },
        { name: "Legacy",        desc: "Arena heroes Attack & Health +20% (in Arena)",   maxSk: 10 },
      ],
    },
    {
      name: "Fabian", invKey: "fabianSigils", color: "#D4A017",
      bonus: "Craftsman of War", bonusDesc: "+30% Troops Attack & Defense in Foundry Battle & Hellfire",
      skills: [
        { name: "Salvager",             desc: "+100% Arsenal Tokens",                                       maxSk: 10 },
        { name: "Crisis Rescue",        desc: "Instant recovery of 1,000,000 troops per Foundry/Hellfire",  maxSk: 10 },
        { name: "Heightened Firepower", desc: "+30% Troops Lethality & Health in Foundry/Hellfire",         maxSk: 20 },
        { name: "Battle Bulwark",       desc: "+150,000 Rally Capacity in Foundry/Hellfire",                maxSk: 20 },
      ],
    },
    {
      name: "Baldur", invKey: "baldurSigils", color: "#16A085",
      bonus: "Master Negotiator", bonusDesc: "-15% Alliance Shop prices, +100% Triumph Chest rewards",
      skills: [
        { name: "Blazing Sunrise",  desc: "+20% Alliance Mobilization Points, +3 milestone tiers", maxSk: 10 },
        { name: "Honored Conquest", desc: "+50% Alliance Championship Badges, +3 AC Shop items",   maxSk: 10 },
        { name: "Bounty Hunter",    desc: "+50% Crazy Joe points, +1 chest per 200K pts (max 10)", maxSk: 10 },
        { name: "Dawn Hymn",        desc: "+50% Alliance Showdown points, +3 daily milestone tiers", maxSk: 10 },
      ],
    },
    {
      name: "Valeria", invKey: "valeriaSigils", color: "#E3731A",
      bonus: "Conqueror's Spirit", bonusDesc: "Troops Attack & Defense +30% in SvS Battle Phase",
      skills: [
        { name: "Well Prepared",   desc: "+20% SvS prep point gains, +3 Personal Point reward tiers", maxSk: 10 },
        { name: "Radiant Honor",   desc: "+50 Sunfire Tokens from Medal Rewards, +3 SvS Shop items",  maxSk: 10 },
        { name: "Battle Concerto", desc: "Troops Lethality & Health +30% in SvS Battle Phase",        maxSk: 20 },
        { name: "Crushing Force",  desc: "Rally Capacity +150,000 in SvS Battle Phase",               maxSk: 20 },
      ],
    },
    {
      name: "Ronne", invKey: "ronneSigils", color: "#2980B9",
      bonus: "Trade Dominion", bonusDesc: "+30% Troops Attack & Defense during raids",
      skills: [
        { name: "Cartographic Memory", desc: "+20% arrival speed, +3 free refreshes/truck", maxSk: 10 },
        { name: "Treasure Scent",      desc: "+100% chance of raiding 1 extra cargo",       maxSk: 10 },
        { name: "Giving Back",         desc: "+50% chance recovering 1 cargo + 2 Elite Guardboxes", maxSk: 10 },
        { name: "Gold Class",          desc: "Legendary escort every 4 missions, +1 truck at Lv 10", maxSk: 10 },
      ],
    },
    {
      name: "Kathy", invKey: "kathySigils", color: "#636e72",
      bonus: "Child of Frost", bonusDesc: "Troops Lethality & Health in Frostfire Mine",
      skills: [
        { name: "Icefire Hunter",  desc: "50% extra XP from Mine Patrol defeats",         maxSk: 10 },
        { name: "Valorous Cold",   desc: "+50,000 troop cap, -60% hero recovery time",    maxSk: 10 },
        { name: "Winter Treasures",desc: "+60 Charm Designs per 200K Orichalcum",         maxSk: 10 },
        { name: "Efficient Mining",desc: "5,000 Orichalcum/min + 100 Charm Guides",       maxSk: 10 },
      ],
    },
  ];

  // Guests see the first 3 experts only
  const visibleExperts = isGuest ? EXPERTS.slice(0, 3) : EXPERTS;

  // ── State ────────────────────────────────────────────────────────────────────
  const [expertData, setExpertData] = useLocalStorage("experts-data", {});
  const [openCard, setOpenCard] = React.useState(null);

  const getExpert = (name) => expertData[name] || {};
  const setExpert = (name, updates) => {
    setExpertData(prev => ({ ...prev, [name]: { ...(prev[name] || {}), ...updates } }));
  };

  // ── Calculation helpers ──────────────────────────────────────────────────────

  const calcLevelAffinity = (expertName, curLv, goalLv) => {
    const costs = EXPERT_LEVEL_AFFINITY[expertName];
    if (!costs || goalLv <= curLv) return 0;
    let total = 0;
    for (let i = curLv + 1; i <= goalLv; i++) {
      total += costs[i] ?? 0;
    }
    return total;
  };

  const calcSkillBooks = (expertName, skKey, curSk, goalSk) => {
    const skCosts = SKILL_BOOK_COSTS[expertName]?.[skKey];
    if (!skCosts || goalSk <= curSk) return 0;
    let total = 0;
    for (let i = curSk + 1; i <= goalSk; i++) {
      total += skCosts[i] ?? 0;
    }
    return total;
  };

  const calcAffinitySigils = (expertName, curB, goalB) => {
    const costs = AFFINITY_SIGILS[expertName];
    if (!costs || goalB <= curB) return 0;
    let total = 0;
    for (let i = curB + 1; i <= goalB; i++) {
      total += costs[i] ?? 0;
    }
    return total;
  };

  const getExpertTotals = (expert) => {
    const d = getExpert(expert.name);
    const curLv = Number(d.level ?? 0);
    const goalLv = Number(d.goalLevel ?? curLv);
    const curB   = Number(d.affinity ?? 0);
    const goalB  = Number(d.goalAffinity ?? curB);

    const levelAffinity = calcLevelAffinity(expert.name, curLv, goalLv);
    const affinitySigils = calcAffinitySigils(expert.name, curB, goalB);

    let skillBooks = 0;
    ['sk1','sk2','sk3','sk4'].forEach((sk, i) => {
      const curSk  = Number(d[`${sk}Level`]  ?? 0);
      const goalSk = Number(d[`${sk}Goal`]   ?? curSk);
      skillBooks += calcSkillBooks(expert.name, sk, curSk, goalSk);
    });

    return {
      affinity: levelAffinity,
      sigils: affinitySigils,
      books: skillBooks,
      levelAffinity,
      affinitySigils,
    };
  };

  const getSkillMax = (expert, skKey) => {
    const costs = SKILL_BOOK_COSTS[expert.name]?.[skKey];
    if (!costs) return null;
    // Find last non-null index
    let max = 0;
    for (let i = costs.length - 1; i >= 0; i--) {
      if (costs[i] !== null) { max = i; break; }
    }
    return max;
  };

  const isComingSoon = (expert) => false; // All experts now have full data

  // ── Sigil inventory updater (syncs back to inv) ──────────────────────────────
  const updateSigils = (invKey, val) => {
    const numVal = Math.max(0, Number(val) || 0);
    setInv(prev => ({ ...prev, [invKey]: numVal }));
  };

  // ── Sub-components ───────────────────────────────────────────────────────────

  const AffinityTag = ({ level }) => {
    const labels = ["—","Stranger","Acq. 1","Acq. 2","Acq. 3","Casual 1","Casual 2","Casual 3","Close 1","Close 2","Close 3","Intimate"];
    const colors = ["#444","#666","#2980B9","#2980B9","#2980B9","#16A085","#16A085","#16A085","#8E44AD","#8E44AD","#8E44AD","#E3731A"];
    return (
      <span style={{
        fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10,
        background: colors[level] + "33", color: colors[level] || "#888",
        border:`1px solid ${colors[level] || "#888"}55`,
        fontFamily:"'Space Mono',monospace", letterSpacing:"0.3px",
      }}>{labels[level] || "—"}</span>
    );
  };

  const SkillRow = ({ expert, skKey, label, desc, skIdx }) => {
    const d = getExpert(expert.name);
    const maxSk = getSkillMax(expert, skKey);
    if (maxSk === null) {
      return (
        <div style={{ padding:"10px 0", borderBottom:`1px solid ${C.border}`, opacity:0.5 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textSec }}>{label}</div>
          <div style={{ fontSize:11, color:C.textDim, fontFamily:"'Space Mono',monospace" }}>{desc} — coming soon</div>
        </div>
      );
    }

    const curSk = Number(d[`${skKey}Level`] ?? 0);
    const goalSk = Number(d[`${skKey}Goal`] ?? curSk);
    const booksNeeded = calcSkillBooks(expert.name, skKey, curSk, goalSk);
    const atMax = curSk >= maxSk;

    const setCur = (v) => {
      const newCur = Math.min(maxSk, Math.max(0, Number(v)));
      const newGoal = Math.max(newCur, Math.min(maxSk, goalSk));
      setExpert(expert.name, { [`${skKey}Level`]: newCur, [`${skKey}Goal`]: newGoal });
    };
    const setGoal = (v) => {
      const newGoal = Math.min(maxSk, Math.max(curSk, Number(v)));
      setExpert(expert.name, { [`${skKey}Goal`]: newGoal });
    };

    const skLevels = Array.from({ length: maxSk + 1 }, (_, i) => i);

    return (
      <div style={{ padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.textPri }}>{label}</div>
            <div style={{ fontSize:10, color:C.textDim, fontFamily:"'Space Mono',monospace", marginTop:1 }}>{desc}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
              <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Current</span>
              <select value={curSk} onChange={e => setCur(e.target.value)}
                style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:5,
                  color:C.textPri, padding:"3px 4px", fontSize:12, fontFamily:"'Space Mono',monospace",
                  width:56, textAlign:"center" }}>
                {skLevels.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <span style={{ color:C.textDim, fontSize:14, marginTop:12 }}>→</span>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
              <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Goal</span>
              <select value={goalSk} onChange={e => setGoal(e.target.value)}
                style={{ background:C.surface, border:`1px solid ${atMax ? C.green : C.border}`, borderRadius:5,
                  color: atMax ? C.green : C.textPri, padding:"3px 4px", fontSize:12,
                  fontFamily:"'Space Mono',monospace", width:56, textAlign:"center" }}>
                {skLevels.filter(i => i >= curSk).map(i => (
                  <option key={i} value={i}>{i === maxSk ? `${i} ★` : `${i}`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {goalSk > curSk && (
          <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:10, color:C.amber, fontFamily:"'Space Mono',monospace" }}>
              📚 {booksNeeded.toLocaleString()} Books needed
            </span>
          </div>
        )}
        {atMax && (
          <div style={{ marginTop:4 }}>
            <span style={{ fontSize:10, color:C.green, fontFamily:"'Space Mono',monospace" }}>✓ MAX</span>
          </div>
        )}
      </div>
    );
  };

  const ExpertPowerDisplay = ({ expert, d, C }) => {
    const name = expert.name;
    const curLv = Number(d.level    ?? 0);
    const curB  = Number(d.affinity ?? 0);

    const lpCfg = EXPERT_LEVEL_POWER[name];
    const levelPower    = lpCfg ? Math.round(lpCfg.rate * (curLv + lpCfg.offset)) : null;
    const levelApprox   = lpCfg && !["Cyrille","Agnes","Romulus"].includes(name);
    const affRate       = EXPERT_AFFINITY_POWER_RATE[name];
    const affinityPower = affRate ? affRate * curB : null;
    const talRate       = EXPERT_TALENT_POWER_RATE[name];
    const talentPower   = talRate ? talRate * curB : null;

    const skPower = EXPERT_SKILL_POWER[name];
    let skillPower = 0, skillKnown = false;
    if (skPower) {
      skillKnown = true;
      ["sk1","sk2","sk3","sk4"].forEach(sk => {
        skillPower += (skPower[sk] ?? 0) * Number(d[`${sk}Level`] ?? 0);
      });
    }

    const resProg   = Number(d.researchProgress ?? 0);
    const resPower   = (curLv >= 100 && curB >= 11) ? RESEARCH_POWER(resProg) : 0;
    const total = (levelPower ?? 0) + (affinityPower ?? 0) + (talentPower ?? 0) + skillPower + resPower;
    if (!levelPower && !affinityPower) return null;
    const fmt = n => Math.round(n).toLocaleString();
    const PRow = ({ label, value, approx, unknown }) => (
      <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0",
        borderBottom:`1px solid ${C.border}` }}>
        <span style={{ fontSize:12, color: unknown ? C.textDim : C.textSec }}>{label}</span>
        <span style={{ fontSize:12, fontFamily:"'Space Mono',monospace", fontWeight:700,
          color: unknown ? C.textDim : C.textPri }}>
          {unknown ? "—" : fmt(value)}
          {approx && !unknown && <span style={{ fontSize:9, color:C.amber, marginLeft:3 }}>~</span>}
        </span>
      </div>
    );
    return (
      <div style={{ paddingTop:14, borderTop:`1px solid ${C.border}`, marginTop:10 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.textDim, textTransform:"uppercase",
          letterSpacing:"1.5px", fontFamily:"'Space Mono',monospace", marginBottom:8 }}>
          Power Estimate
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"7px 10px", borderRadius:7, marginBottom:6,
          background:(C.accentBg || C.surface), border:`1px solid ${C.accentDim || C.border}` }}>
          <span style={{ fontSize:13, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif" }}>Total</span>
          <span style={{ fontSize:14, fontWeight:800, color:C.accent, fontFamily:"'Space Mono',monospace" }}>
            {fmt(total)}
          </span>
        </div>
        <PRow label="Level Power"    value={levelPower}    approx={levelApprox} unknown={!levelPower} />
        <PRow label="Affinity Power" value={affinityPower} unknown={!affinityPower} />
        <PRow label="Talent Power"   value={talentPower}   unknown={!talentPower} />
        <PRow label="Skill Power"    value={skillPower}    unknown={!skillKnown} />
        {resPower > 0 && (
          <PRow label="Research Power" value={resPower} />
        )}
        {(levelApprox || !skillKnown || (curLv===100 && curB===11)) && (
          <div style={{ fontSize:9, color:C.textDim, fontFamily:"'Space Mono',monospace",
            paddingTop:4, lineHeight:1.5 }}>
            {levelApprox && "~ Level power is approximate. "}
            {!skillKnown && "Skill power formula pending in-game data. "}
            {resPower === 0 && curLv===100 && curB===11 && "Research Power available — set class & progress in Research section above."}
          </div>
        )}
      </div>
    );
  };

  const ExpertDrawer = ({ expert }) => {
    const d = getExpert(expert.name);
    const curLv  = Number(d.level ?? 0);
    const goalLv = Number(d.goalLevel ?? curLv);
    const curB   = Number(d.affinity ?? 0);
    const goalB  = Number(d.goalAffinity ?? curB);
    const totals = getExpertTotals(expert);
    const ownSigils = inv[expert.invKey] ?? 0;
    const sigShortfall = totals.sigils - ownSigils;
    const bookShortfall = totals.books - (inv.books ?? 0);

    const MAX_LEVEL = 100;
    const MAX_AFFINITY = 11;
    const levels = Array.from({ length: MAX_LEVEL + 1 }, (_, i) => i);
    const bLevels = Array.from({ length: MAX_AFFINITY + 1 }, (_, i) => i);

    const comingSoon = isComingSoon(expert);

    return (
      <div style={{
        background:C.surface, border:`1px solid ${expert.color}44`,
        borderTop:`3px solid ${expert.color}`,
        borderRadius:"0 0 10px 10px", padding:"0 16px 16px",
        marginTop:-1,
      }}>
        {comingSoon && (
          <div style={{ padding:"16px 0 8px", textAlign:"center", color:C.textDim,
            fontSize:12, fontFamily:"'Space Mono',monospace" }}>
            ⏳ Full data coming soon — basic tracking only
          </div>
        )}

        {/* ── Sigil Inventory for this expert ── */}
        <div style={{ padding:"14px 0 10px", borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:C.textPri }}>Expert Sigils (Owned)</div>
            <div style={{ fontSize:10, color:C.textDim, fontFamily:"'Space Mono',monospace" }}>
              Synced with Inventory tab
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <input
              type="number" min={0}
              value={ownSigils}
              onChange={e => updateSigils(expert.invKey, e.target.value)}
              style={{ width:80, textAlign:"right", background:C.card,
                border:`1px solid ${C.border}`, borderRadius:5,
                color:C.textPri, padding:"4px 8px", fontSize:13, outline:"none",
                fontFamily:"'Space Mono',monospace" }}
            />
            <span style={{ fontSize:11, color:C.textDim }}>sigils</span>
          </div>
        </div>

        {/* ── Expert Level ── */}
        <div style={{ padding:"12px 0 10px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textPri, marginBottom:8 }}>Expert Level</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Current</span>
              <select value={curLv} onChange={e => {
                  const nv = Math.min(MAX_LEVEL, Number(e.target.value));
                  setExpert(expert.name, { level: nv, goalLevel: Math.max(nv, goalLv) });
                }}
                style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:5,
                  color:C.textPri, padding:"4px 6px", fontSize:13, fontFamily:"'Space Mono',monospace", width:70 }}>
                {levels.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <span style={{ color:C.textDim, fontSize:18, marginTop:14 }}>→</span>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Goal</span>
              <select value={goalLv} onChange={e => setExpert(expert.name, { goalLevel: Number(e.target.value) })}
                style={{ background:C.card, border:`1px solid ${goalLv === MAX_LEVEL ? C.green : C.border}`, borderRadius:5,
                  color: goalLv === MAX_LEVEL ? C.green : C.textPri, padding:"4px 6px", fontSize:13,
                  fontFamily:"'Space Mono',monospace", width:70 }}>
                {levels.filter(i => i >= curLv).map(i => (
                  <option key={i} value={i}>{i === MAX_LEVEL ? "100 ★" : i}</option>
                ))}
              </select>
            </div>
            {goalLv > curLv && (
              <div style={{ marginLeft:8, fontSize:12, color:C.amber, fontFamily:"'Space Mono',monospace" }}>
                🔐 {totals.levelAffinity.toLocaleString()} affinity
              </div>
            )}
            {curLv === MAX_LEVEL && (
              <span style={{ marginLeft:8, fontSize:11, color:C.green, fontFamily:"'Space Mono',monospace" }}>✓ MAX</span>
            )}
          </div>
        </div>

        {/* ── Affinity Level ── */}
        <div style={{ padding:"12px 0 10px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textPri, marginBottom:8 }}>Relationship Level</div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Current</span>
              <select value={curB} onChange={e => {
                  const nv = Math.min(MAX_AFFINITY, Number(e.target.value));
                  setExpert(expert.name, { affinity: nv, goalAffinity: Math.max(nv, goalB) });
                }}
                style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:5,
                  color:C.textPri, padding:"4px 6px", fontSize:12, fontFamily:"'Space Mono',monospace", width:110 }}>
                {bLevels.map(i => <option key={i} value={i}>{AFFINITY_NAMES[i]} — {AFFINITY_LABELS[i]}</option>)}
              </select>
            </div>
            <span style={{ color:C.textDim, fontSize:18, marginTop:14 }}>→</span>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Goal</span>
              <select value={goalB} onChange={e => setExpert(expert.name, { goalAffinity: Number(e.target.value) })}
                style={{ background:C.card, border:`1px solid ${goalB === MAX_AFFINITY ? C.green : C.border}`, borderRadius:5,
                  color: goalB === MAX_AFFINITY ? C.green : C.textPri, padding:"4px 6px", fontSize:12,
                  fontFamily:"'Space Mono',monospace", width:110 }}>
                {bLevels.filter(i => i >= curB).map(i => (
                  <option key={i} value={i}>{AFFINITY_NAMES[i]}{i === MAX_AFFINITY ? " ★" : ""} — {AFFINITY_LABELS[i]}</option>
                ))}
              </select>
            </div>
          </div>
          {goalB > curB && (
            <div style={{ marginTop:6, fontSize:12, color:C.amber, fontFamily:"'Space Mono',monospace" }}>
              🔶 {totals.affinitySigils.toLocaleString()} sigils (advancement) · Bonus: {BONUS_VALUES[expert.name]?.[curB]} → {BONUS_VALUES[expert.name]?.[goalB]}
            </div>
          )}
          {curB === MAX_AFFINITY && (
            <div style={{ marginTop:4, fontSize:11, color:C.green, fontFamily:"'Space Mono',monospace" }}>✓ INTIMATE (MAX)</div>
          )}
        </div>

        {/* ── Skills ── */}
        <div style={{ padding:"12px 0 0" }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textPri, marginBottom:4 }}>Skills</div>
          {expert.skills.map((sk, i) => (
            <SkillRow
              key={sk.name}
              expert={expert}
              skKey={`sk${i+1}`}
              label={sk.name}
              desc={sk.desc}
              skIdx={i}
            />
          ))}
        </div>

        {/* ── Research (unlocks at L100 + B11 + all skills maxed) ── */}
        {(() => {
          const allSkillsMaxed = expert.skills.every((sk, i) => {
            const skKey = `sk${i+1}`;
            const max = getSkillMax(expert, skKey);
            return max !== null && Number(d[`${skKey}Level`] ?? 0) >= max;
          });
          const researchUnlocked = curLv >= 100 && curB >= 11 && allSkillsMaxed;
          if (!researchUnlocked) return null;

          const resClass = d.researchClass || "Proficient";
          const resProg  = Number(d.researchProgress ?? 0);

          // Compute path stat bonuses earned so far
          const pathCycle = RESEARCH_PATH_STATS[resClass];
          const pathBonuses = {};
          for (let m = 20; m <= resProg; m += 20) {
            const stat = pathCycle[((m / 20) - 1) % 3];
            pathBonuses[stat] = (pathBonuses[stat] || 0) + 0.006;
          }

          const selStyle = {
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.textPri, padding: "5px 8px", fontSize: 12,
            fontFamily: "'Space Mono',monospace", cursor: "pointer",
          };

          return (
            <div style={{ padding:"12px 0 0", borderTop:`1px solid ${C.border}`, marginTop:4 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.textPri, marginBottom:10 }}>
                🔬 Research
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10 }}>
                {/* Class */}
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase",
                    letterSpacing:"0.5px", fontFamily:"'Space Mono',monospace" }}>Class</span>
                  <select value={resClass}
                    onChange={e => setExpert(expert.name, { researchClass: e.target.value })}
                    style={selStyle}>
                    <option value="Proficient">Proficient</option>
                    <option value="Expert">Expert</option>
                    <option value="Ultimate">Ultimate</option>
                  </select>
                </div>
                {/* Progress */}
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase",
                    letterSpacing:"0.5px", fontFamily:"'Space Mono',monospace" }}>Progress</span>
                  <select value={resProg}
                    onChange={e => setExpert(expert.name, { researchProgress: Number(e.target.value) })}
                    style={selStyle}>
                    {Array.from({length:201},(_,i)=>i).map(i => (
                      <option key={i} value={i}>{i}{i===200?" ★":""}</option>
                    ))}
                  </select>
                </div>
                {/* Power badge */}
                {resProg > 0 && (
                  <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                    <span style={{ fontSize:9, color:C.textDim, textTransform:"uppercase",
                      letterSpacing:"0.5px", fontFamily:"'Space Mono',monospace" }}>Power</span>
                    <div style={{ padding:"5px 10px", borderRadius:6,
                      background: C.accentBg || C.surface, border:`1px solid ${C.accentDim || C.border}`,
                      fontSize:13, fontWeight:800, color:C.accent,
                      fontFamily:"'Space Mono',monospace" }}>
                      {RESEARCH_POWER(resProg).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats summary */}
              {resProg > 0 && (
                <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:7,
                  padding:"8px 10px", fontSize:11, fontFamily:"'Space Mono',monospace" }}>
                  <div style={{ color:C.textDim, marginBottom:4, fontSize:10 }}>
                    Accumulated bonuses at progress {resProg}:
                  </div>
                  <div style={{ color:C.green }}>
                    +{(resProg * 0.01).toFixed(2)}% Troops' Attack (base)
                  </div>
                  {Object.entries(pathBonuses).map(([stat, val]) => (
                    <div key={stat} style={{ color:C.blue }}>
                      +{(val * 100).toFixed(2)}% Troops' {stat} (path)
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Power Breakdown ── */}
        <ExpertPowerDisplay expert={expert} d={d} C={C} />

        {/* ── Summary Footer ── */}
        {(totals.affinity > 0 || totals.sigils > 0 || totals.books > 0) && (
          <div style={{
            marginTop:14, padding:"12px 14px", borderRadius:8,
            background:C.card, border:`1px solid ${C.border}`,
          }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textSec,
              textTransform:"uppercase", letterSpacing:"1.5px",
              fontFamily:"'Space Mono',monospace", marginBottom:10 }}>
              Upgrade Summary
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {totals.affinity > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:C.textPri }}>🔐 Affinity needed <span style={{ fontSize:10, color:C.textDim }}>(leveling)</span></span>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ fontSize:13, fontWeight:700, fontFamily:"'Space Mono',monospace", color:C.textPri }}>
                      {totals.affinity.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              {totals.sigils > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:C.textPri }}>🔶 Sigils needed <span style={{ fontSize:10, color:C.textDim }}>(advancement)</span></span>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ fontSize:13, fontWeight:700, fontFamily:"'Space Mono',monospace",
                      color: sigShortfall > 0 ? C.red : C.green }}>
                      {totals.sigils.toLocaleString()}
                    </span>
                    {sigShortfall > 0 && (
                      <div style={{ fontSize:10, color:C.red, fontFamily:"'Space Mono',monospace" }}>
                        ({sigShortfall.toLocaleString()} short)
                      </div>
                    )}
                    {sigShortfall <= 0 && (
                      <div style={{ fontSize:10, color:C.green, fontFamily:"'Space Mono',monospace" }}>
                        ✓ Enough sigils
                      </div>
                    )}
                  </div>
                </div>
              )}
              {totals.books > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:C.textPri }}>📚 Books needed</span>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ fontSize:13, fontWeight:700, fontFamily:"'Space Mono',monospace",
                      color: bookShortfall > 0 ? C.red : C.green }}>
                      {totals.books.toLocaleString()}
                    </span>
                    {bookShortfall > 0 && (
                      <div style={{ fontSize:10, color:C.red, fontFamily:"'Space Mono',monospace" }}>
                        ({bookShortfall.toLocaleString()} short)
                      </div>
                    )}
                    {bookShortfall <= 0 && (
                      <div style={{ fontSize:10, color:C.green, fontFamily:"'Space Mono',monospace" }}>
                        ✓ Enough books
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────────────

  // Total costs across all experts
  const grandTotalBooks    = EXPERTS.reduce((sum, e) => sum + getExpertTotals(e).books, 0);
  const grandTotalSigils   = EXPERTS.reduce((sum, e) => sum + getExpertTotals(e).sigils, 0);
  const grandTotalAffinity = EXPERTS.reduce((sum, e) => sum + getExpertTotals(e).affinity, 0);
  const generalSigils = inv.generalSigils ?? 0;
  const books = inv.books ?? 0;

  return (
    <div className="fade-in">

      {/* Complete Upgrades button */}
      {onCompleteSvs && (
        <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:6, marginBottom:12 }}>
          <button onClick={onCompleteSvs} style={{
            padding:"8px 16px", borderRadius:7, cursor:"pointer",
            border:"1px solid var(--c-accentDim)",
            background:"rgba(227,107,26,0.12)",
            color:"var(--c-accent)", fontSize:12, fontWeight:700,
            fontFamily:"Syne,sans-serif",
            display:"flex", alignItems:"center", gap:6,
          }}>⚔️ Complete Upgrades</button>
          <span className="info-tip" data-tip="Reviews all Expert goals (levels, relationship, skills). Lets you adjust what you actually achieved, then pushes those values to Current and deducts materials from inventory." style={{fontSize:14,color:"var(--c-textDim)",cursor:"default",userSelect:"none",lineHeight:1}}>ⓘ</span>
        </div>
      )}
      {/* ── Resource Summary Bar ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
        {[
          { label:"Books of Knowledge", value:books, sub:"Available", icon:"📚", color:C.blue,
            field:"books", invKey:"books" },
          { label:"General Sigils", value:generalSigils, sub:"Available", icon:"🔶", color:C.amber,
            field:"generalSigils", invKey:"generalSigils" },
        ].map(item => (
          <div key={item.label} style={{ background:C.card, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"14px 16px", display:"flex", alignItems:"center",
            justifyContent:"space-between", gap:12 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.textDim,
                textTransform:"uppercase", letterSpacing:"1.5px",
                fontFamily:"'Space Mono',monospace" }}>{item.icon} {item.label}</div>
              <input
                type="number" min={0}
                value={item.value}
                onChange={e => setInv(prev => ({ ...prev, [item.invKey]: Math.max(0, Number(e.target.value) || 0) }))}
                style={{ marginTop:4, background:"transparent", border:"none", outline:"none",
                  fontSize:24, fontWeight:800, color:item.color,
                  fontFamily:"Syne,sans-serif", width:"100%", padding:0 }}
              />
            </div>
            {(grandTotalBooks > 0 || grandTotalSigils > 0) && (
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:10, color:C.textDim, fontFamily:"'Space Mono',monospace" }}>All goals</div>
                <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Space Mono',monospace",
                  color: (item.label.includes("Books") ? grandTotalBooks > books : grandTotalSigils > generalSigils) ? C.red : C.green }}>
                  {item.label.includes("Books") ? grandTotalBooks.toLocaleString() : grandTotalSigils.toLocaleString()} needed
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Guest limit banner ── */}
      {isGuest && (
        <GuestBanner message={`${EXPERTS.slice(0,3).map(e=>e.name).join(", ")} available as guest (3 of 9) — sign up for free to access all 9 experts`} />
      )}

      {/* ── Expert Cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 }}>
        {visibleExperts.map(expert => {
          const d = getExpert(expert.name);
          const curLv  = Number(d.level ?? 0);
          const curB   = Number(d.affinity ?? 0);
          const totals = getExpertTotals(expert);
          const ownSigils = inv[expert.invKey] ?? 0;
          const pct = Math.round((curLv / 100) * 100);
          const comingSoon = isComingSoon(expert);
          const isOpen = openCard === expert.name;

          return (
            <div key={expert.name} style={{ borderRadius:10, overflow:"hidden",
              border:`1px solid ${isOpen ? expert.color : C.border}`,
              transition:"border-color 0.2s" }}>

              {/* Card Header */}
              <div
                onClick={() => setOpenCard(isOpen ? null : expert.name)}
                style={{ background:C.card, padding:"14px 16px", cursor:"pointer",
                  borderBottom: isOpen ? `1px solid ${expert.color}44` : "none",
                  display:"flex", alignItems:"center", gap:12,
                  transition:"background 0.15s",
                  userSelect:"none" }}
                onMouseEnter={e => e.currentTarget.style.background = C.surface}
                onMouseLeave={e => e.currentTarget.style.background = C.card}
              >
                {/* Avatar */}
                <div style={{
                  width:42, height:42, borderRadius:8, flexShrink:0,
                  background:expert.color + "22", border:`2px solid ${expert.color}66`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:14, fontWeight:800, color:expert.color,
                  fontFamily:"Syne,sans-serif",
                }}>
                  {expert.name.slice(0,2).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                    <span style={{ fontSize:14, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif" }}>
                      {expert.name}
                    </span>
                    {comingSoon && (
                      <span style={{ fontSize:9, padding:"1px 6px", borderRadius:8,
                        background:"#444", color:"#aaa", fontFamily:"'Space Mono',monospace" }}>
                        SOON
                      </span>
                    )}
                    <AffinityTag level={curB} />
                  </div>
                  <div style={{ fontSize:10, color:C.textDim, fontFamily:"'Space Mono',monospace",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {expert.bonus} · {expert.bonusDesc}
                  </div>
                  {/* Level bar */}
                  <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ flex:1, height:4, borderRadius:2, background:C.border, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`,
                        background: curLv >= 100 ? C.green : expert.color,
                        borderRadius:2, transition:"width 0.3s" }} />
                    </div>
                    <span style={{ fontSize:10, color:expert.color, fontFamily:"'Space Mono',monospace",
                      fontWeight:700, flexShrink:0 }}>
                      Lv {curLv}
                    </span>
                  </div>
                </div>

                {/* Right column: sigils + cost chip */}
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.amber,
                    fontFamily:"'Space Mono',monospace" }}>
                    {ownSigils.toLocaleString()} 🔶
                  </div>
                  {totals.affinity > 0 && (
                    <div style={{ fontSize:9, color:C.textDim,
                      fontFamily:"'Space Mono',monospace", marginTop:1 }}>
                      🔐 {totals.affinity.toLocaleString()} aff
                    </div>
                  )}
                  {totals.sigils > 0 && (
                    <div style={{ fontSize:9, color: totals.sigils > ownSigils ? C.red : C.green,
                      fontFamily:"'Space Mono',monospace", marginTop:1 }}>
                      {totals.sigils.toLocaleString()} sigils
                    </div>
                  )}
                  {totals.books > 0 && (
                    <div style={{ fontSize:9, color:C.blue,
                      fontFamily:"'Space Mono',monospace" }}>
                      📚 {totals.books.toLocaleString()} bks
                    </div>
                  )}
                  <div style={{ fontSize:14, color:C.textDim, marginTop:4 }}>
                    {isOpen ? "▲" : "▼"}
                  </div>
                </div>
              </div>

              {/* Drawer */}
              {isOpen && <ExpertDrawer expert={expert} />}
            </div>
          );
        })}
      </div>

      {/* ── Troop Stats Summary ── */}
      <ExpertStatsSummary expertData={expertData} />

    </div>
  );
}

// ─── Expert Troop Stats Summary ──────────────────────────────────────────────

const EXPERT_LEVEL_STATS = {
  // Cyrille: Troops' Attack % per level
  Cyrille: [0,0.0158,0.0165,0.0173,0.018,0.0188,0.0195,0.0203,0.021,0.0218,0.0225,0.0293,0.03,0.0308,0.0315,0.0323,0.033,0.0338,0.0345,0.0353,0.036,0.0428,0.0435,0.0443,0.045,0.0458,0.0465,0.0473,0.048,0.0488,0.0495,0.0563,0.057,0.0578,0.0585,0.0593,0.06,0.0608,0.0615,0.0623,0.063,0.0698,0.0705,0.0713,0.072,0.0728,0.0735,0.0743,0.075,0.0758,0.0765,0.0833,0.084,0.0848,0.0855,0.0863,0.087,0.0878,0.0885,0.0893,0.09,0.0968,0.0975,0.0983,0.099,0.0998,0.1005,0.1013,0.102,0.1028,0.1035,0.1103,0.111,0.1118,0.1125,0.1133,0.114,0.1148,0.1155,0.1163,0.117,0.1238,0.1245,0.1253,0.126,0.1268,0.1275,0.1283,0.129,0.1298,0.1305,0.1373,0.138,0.1388,0.1395,0.1403,0.141,0.1418,0.1425,0.1433,0.15],
  // Agnes: Troops' Defense % per level
  Agnes:   [0,0.0158,0.0165,0.0173,0.018,0.0188,0.0195,0.0203,0.021,0.0218,0.0228,0.0293,0.03,0.0308,0.0315,0.0323,0.033,0.0338,0.0345,0.0353,0.036,0.0428,0.0435,0.0443,0.045,0.0458,0.0465,0.0473,0.048,0.0488,0.0495,0.0563,0.057,0.0578,0.0585,0.0593,0.06,0.0608,0.0615,0.0623,0.063,0.0698,0.0705,0.0713,0.072,0.0728,0.0735,0.0743,0.075,0.0758,0.0765,0.0833,0.084,0.0848,0.0855,0.0863,0.087,0.0878,0.0885,0.0893,0.09,0.0968,0.0975,0.0983,0.099,0.0998,0.1005,0.1013,0.102,0.1028,0.1035,0.1103,0.111,0.1118,0.1125,0.1133,0.114,0.1148,0.1155,0.1163,0.117,0.1238,0.1245,0.1253,0.126,0.1268,0.1275,0.1283,0.129,0.1298,0.1305,0.1373,0.138,0.1388,0.1395,0.1403,0.141,0.1418,0.1425,0.1433,0.144],
  // Romulus: Troops' Lethality & Health % per level
  Romulus: [0,0.021,0.022,0.023,0.024,0.025,0.026,0.027,0.028,0.029,0.03,0.039,0.04,0.041,0.042,0.043,0.044,0.045,0.046,0.047,0.048,0.057,0.058,0.059,0.06,0.061,0.062,0.063,0.064,0.065,0.066,0.075,0.076,0.077,0.078,0.079,0.08,0.081,0.082,0.083,0.084,0.093,0.094,0.095,0.096,0.097,0.098,0.099,0.1,0.101,0.102,0.111,0.112,0.113,0.114,0.115,0.116,0.117,0.118,0.119,0.12,0.129,0.13,0.131,0.132,0.133,0.134,0.135,0.136,0.137,0.138,0.147,0.148,0.149,0.15,0.151,0.152,0.153,0.154,0.155,0.156,0.165,0.166,0.167,0.168,0.169,0.17,0.171,0.172,0.173,0.174,0.183,0.184,0.185,0.186,0.187,0.188,0.189,0.19,0.191,0.192],
  // Holger: Troops' Attack & Defense % per level (same curve as Cyrille per spreadsheet col F)
  Holger:  [0,0.0158,0.0165,0.0173,0.018,0.0188,0.0195,0.0203,0.021,0.0218,0.0225,0.0293,0.03,0.0308,0.0315,0.0323,0.033,0.0338,0.0345,0.0353,0.036,0.0428,0.0435,0.0443,0.045,0.0458,0.0465,0.0473,0.048,0.0488,0.0495,0.0563,0.057,0.0578,0.0585,0.0593,0.06,0.0608,0.0615,0.0623,0.063,0.0698,0.0705,0.0713,0.072,0.0728,0.0735,0.0743,0.075,0.0758,0.0765,0.0833,0.084,0.0848,0.0855,0.0863,0.087,0.0878,0.0885,0.0893,0.09,0.0968,0.0975,0.0983,0.099,0.0998,0.1005,0.1013,0.102,0.1028,0.1035,0.1103,0.111,0.1118,0.1125,0.1133,0.114,0.1148,0.1155,0.1163,0.117,0.1238,0.1245,0.1253,0.126,0.1268,0.1275,0.1283,0.129,0.1298,0.1305,0.1373,0.138,0.1388,0.1395,0.1403,0.141,0.1418,0.1425,0.1433,0.144],
  // Fabian: Troops' Lethality & Health % per level (wiki — same curve as Cyrille, max +15%)
  Fabian:  [0,0.0158,0.0165,0.0173,0.018,0.0188,0.0195,0.0203,0.021,0.0218,0.0225,0.0293,0.03,0.0308,0.0315,0.0323,0.033,0.0338,0.0345,0.0353,0.036,0.0428,0.0435,0.0443,0.045,0.0458,0.0465,0.0473,0.048,0.0488,0.0495,0.0563,0.057,0.0578,0.0585,0.0593,0.06,0.0608,0.0615,0.0623,0.063,0.0698,0.0705,0.0713,0.072,0.0728,0.0735,0.0743,0.075,0.0758,0.0765,0.0833,0.084,0.0848,0.0855,0.0863,0.087,0.0878,0.0885,0.0893,0.09,0.0968,0.0975,0.0983,0.099,0.0998,0.1005,0.1013,0.102,0.1028,0.1035,0.1103,0.111,0.1118,0.1125,0.1133,0.114,0.1148,0.1155,0.1163,0.117,0.1238,0.1245,0.1253,0.126,0.1268,0.1275,0.1283,0.129,0.1298,0.1305,0.1373,0.138,0.1388,0.1395,0.1403,0.141,0.1418,0.1425,0.1433,0.15],
  // Valeria: Troops' Lethality & Health % per level (wiki — unique curve, max +20%)
  Valeria: [0,0.021,0.022,0.023,0.024,0.025,0.026,0.027,0.028,0.029,0.038,0.039,0.04,0.041,0.042,0.043,0.044,0.045,0.046,0.047,0.056,0.057,0.058,0.059,0.06,0.061,0.062,0.063,0.064,0.065,0.074,0.075,0.076,0.077,0.078,0.079,0.08,0.081,0.082,0.083,0.092,0.093,0.094,0.095,0.096,0.097,0.098,0.099,0.1,0.101,0.11,0.111,0.112,0.113,0.114,0.115,0.116,0.117,0.118,0.119,0.128,0.129,0.13,0.131,0.132,0.133,0.134,0.135,0.136,0.137,0.146,0.147,0.148,0.149,0.15,0.151,0.152,0.153,0.154,0.155,0.164,0.165,0.166,0.167,0.168,0.169,0.17,0.171,0.172,0.173,0.182,0.183,0.184,0.185,0.186,0.187,0.188,0.189,0.19,0.191,0.2],
  // Ronne: Troops' Attack & Defense % per level (same stat curve as Cyrille per wiki, max +30% in raids)
  Ronne:   [0,0.0158,0.0165,0.0173,0.018,0.0188,0.0195,0.0203,0.021,0.0218,0.0225,0.0293,0.03,0.0308,0.0315,0.0323,0.033,0.0338,0.0345,0.0353,0.036,0.0428,0.0435,0.0443,0.045,0.0458,0.0465,0.0473,0.048,0.0488,0.0495,0.0563,0.057,0.0578,0.0585,0.0593,0.06,0.0608,0.0615,0.0623,0.063,0.0698,0.0705,0.0713,0.072,0.0728,0.0735,0.0743,0.075,0.0758,0.0765,0.0833,0.084,0.0848,0.0855,0.0863,0.087,0.0878,0.0885,0.0893,0.09,0.0968,0.0975,0.0983,0.099,0.0998,0.1005,0.1013,0.102,0.1028,0.1035,0.1103,0.111,0.1118,0.1125,0.1133,0.114,0.1148,0.1155,0.1163,0.117,0.1238,0.1245,0.1253,0.126,0.1268,0.1275,0.1283,0.129,0.1298,0.1305,0.1373,0.138,0.1388,0.1395,0.1403,0.141,0.1418,0.1425,0.1433,0.15],
  // Kathy: Troops' Lethality & Health % per level (same stat curve as Cyrille per wiki)
  Kathy:   [0,0.0158,0.0165,0.0173,0.018,0.0188,0.0195,0.0203,0.021,0.0218,0.0225,0.0293,0.03,0.0308,0.0315,0.0323,0.033,0.0338,0.0345,0.0353,0.036,0.0428,0.0435,0.0443,0.045,0.0458,0.0465,0.0473,0.048,0.0488,0.0495,0.0563,0.057,0.0578,0.0585,0.0593,0.06,0.0608,0.0615,0.0623,0.063,0.0698,0.0705,0.0713,0.072,0.0728,0.0735,0.0743,0.075,0.0758,0.0765,0.0833,0.084,0.0848,0.0855,0.0863,0.087,0.0878,0.0885,0.0893,0.09,0.0968,0.0975,0.0983,0.099,0.0998,0.1005,0.1013,0.102,0.1028,0.1035,0.1103,0.111,0.1118,0.1125,0.1133,0.114,0.1148,0.1155,0.1163,0.117,0.1238,0.1245,0.1253,0.126,0.1268,0.1275,0.1283,0.129,0.1298,0.1305,0.1373,0.138,0.1388,0.1395,0.1403,0.141,0.1418,0.1425,0.1433,0.15],
  // Baldur: Troops' Attack & Defense % per level (distinct lower curve)
  // Baldur: Troops' Attack & Defense % per level (wiki — unique lower curve, max +10%)
  Baldur:  [0,0.0105,0.011,0.0115,0.012,0.0125,0.013,0.0135,0.014,0.0145,0.019,0.0195,0.02,0.0205,0.021,0.0215,0.022,0.0225,0.023,0.0235,0.028,0.0285,0.029,0.0295,0.03,0.0305,0.031,0.0315,0.032,0.0325,0.037,0.0375,0.038,0.0385,0.039,0.0395,0.04,0.0405,0.041,0.0415,0.046,0.0465,0.047,0.0475,0.048,0.0485,0.049,0.0495,0.05,0.0505,0.055,0.0555,0.056,0.0565,0.057,0.0575,0.058,0.0585,0.059,0.0595,0.064,0.0645,0.065,0.0655,0.066,0.0665,0.067,0.0675,0.068,0.0685,0.073,0.0735,0.074,0.0745,0.075,0.0755,0.076,0.0765,0.077,0.0775,0.082,0.0825,0.083,0.0835,0.084,0.0845,0.085,0.0855,0.086,0.0865,0.091,0.0915,0.092,0.0925,0.093,0.0935,0.094,0.0945,0.095,0.0955,0.1],
};

const ROMULUS_BONUS_DEPLOY = [0,300,600,1000,1500,2000,3000,4000,5500,7000,8500,10000]; // Commander's Crest: Expedition Army size per affinity level
const ROMULUS_SK2_STAT  = [0,0.005,0.01,0.015,0.02,0.025,0.03,0.035,0.04,0.045,0.05,0.055,0.06,0.065,0.07,0.075,0.08,0.085,0.09,0.095,0.10];
const ROMULUS_SK3_STAT  = [0,0.005,0.01,0.015,0.02,0.025,0.03,0.035,0.04,0.045,0.05,0.055,0.06,0.065,0.07,0.075,0.08,0.085,0.09,0.095,0.10];
const ROMULUS_SK4_RALLY = [0,5000,10000,15000,20000,25000,30000,35000,40000,45000,50000,55000,60000,65000,70000,75000,80000,85000,90000,95000,100000];


// ─── Expert Power Constants ───────────────────────────────────────────────────
// Affinity Power per tier (B1–B11): power = rate × tier
const EXPERT_AFFINITY_POWER_RATE = {
  Cyrille:  43200,
  Agnes:    43200,
  Romulus:  144000,
  Holger:   86400,
  Fabian:   108000,
  Baldur:   57600,
  Valeria:  144000,  // screenshot ✅ (1,152,000 ÷ 8 tiers)
  Ronne:    null,
  Kathy:    108000,  // screenshot ✅ (108,000 per tier)
};

// Talent Power per bonus level: power = rate × talent_level
const EXPERT_TALENT_POWER_RATE = {
  Cyrille:  36000,
  Agnes:    36000,
  Romulus:  236000,
  Holger:   58000,
  Fabian:   86000,
  Baldur:   43000,
  Valeria:  143000,  // spreadsheet ✅
  Ronne:    58000,   // spreadsheet ✅
  Kathy:    72000,   // screenshot ✅ (72,000 per talent level)
};

// Level Power formula: power = rate × (level + offset)
// Confirmed exact: Cyrille, Agnes, Romulus. Others approximate.
const EXPERT_LEVEL_POWER = {
  Cyrille:  { rate: 6048,  offset: 0  },   // exact: 6,048 × level
  Agnes:    { rate: 5400,  offset: 12 },   // exact: 5,400 × (level+12)
  Romulus:  { rate: 20400, offset: 0  },   // exact: 20,400 × level
  Holger:   { rate: 12380, offset: 0  },   // approx from L82 data
  Fabian:   { rate: 16113, offset: 0  },   // approx from L62 data
  Baldur:   { rate: 8434,  offset: 0  },   // approx from L70 data
  Valeria:  { rate: 20700, offset: 0  },   // screenshot ✅ (20,700×80=1,656,000)
  Ronne:    null,
  Kathy:    { rate: 13500, offset: 12 },   // screenshot ✅ (13,500×(lv+12); L1=175,500)
};

// Research Power formula: n*1000 + floor(n/20)*60000  (verified all 200 data points)
// Path stats every 20 levels: +0.60% to cycling stat per class
const RESEARCH_POWER = n => n * 1000 + Math.floor(n / 20) * 60000;
const RESEARCH_PATH_STATS = {
  Proficient: ["Defense","Lethality","Health"],   // cycle starts at milestone 1 (level 20)
  Expert:     ["Lethality","Health","Defense"],
  Ultimate:   ["Health","Defense","Lethality"],
};

// Skill Power per skill per level — all verified against in-game screenshots
const EXPERT_SKILL_POWER = {
  Cyrille:  { sk1: 3000,   sk2: 13000,  sk3: 20000,  sk4: 7000   }, // spreadsheet ✅
  Agnes:    { sk1: 20000,  sk2: 16000,  sk3: 7000,   sk4: 7000   }, // spreadsheet ✅ (maxed=285k)
  Romulus:  { sk1: 18000,  sk2: 108000, sk3: 135000, sk4: 150000 }, // spreadsheet ✅
  Holger:   { sk1: 42000,  sk2: 18000,  sk3: 18000,  sk4: 42000  }, // spreadsheet ✅ (maxed=1.2M)
  Fabian:   { sk1: 18000,  sk2: 37000,  sk3: 52000,  sk4: 83000  }, // spreadsheet ✅ (2,099,000)
  Baldur:   { sk1: 18000,  sk2: 18000,  sk3: 18000,  sk4: 35000  }, // spreadsheet ✅ (714,000)
  Valeria:  { sk1: 30000,  sk2: 30000,  sk3: 156000, sk4: 156000 }, // spreadsheet ✅
  Ronne:    { sk1: 18000,  sk2: 18000,  sk3: 42000,  sk4: 98000  }, // spreadsheet ✅
  Kathy:    { sk1: 18000,  sk2: 18000,  sk3: 70000,  sk4: 98000  }, // screenshot ✅ (all 4 skills confirmed)
};

function ExpertStatsSummary({ expertData }) {
  const C = COLORS;
  const [collapsed, setCollapsed] = React.useState(false);
  const getD = (name) => expertData[name] || {};

  const expertColors = {
    Cyrille:"#4A9EBF", Agnes:"#7B9E6B", Romulus:"#C0392B",
    Holger:"#8E44AD", Fabian:"#D4A017", Baldur:"#16A085",
    Valeria:"#E3731A", Ronne:"#2980B9", Kathy:"#636e72",
  };

  const getStatRows = () => {
    const rows = [];
    const cyrLv = Number(getD("Cyrille").level ?? 0);
    if (cyrLv > 0) rows.push({ expert:"Cyrille", stat:"Troops' Attack",    value: EXPERT_LEVEL_STATS.Cyrille[cyrLv] ?? 0, source:`Lv ${cyrLv}` });
    const agnLv = Number(getD("Agnes").level ?? 0);
    if (agnLv > 0) rows.push({ expert:"Agnes",   stat:"Troops' Defense",   value: EXPERT_LEVEL_STATS.Agnes[agnLv]   ?? 0, source:`Lv ${agnLv}` });
    const dRom  = getD("Romulus");
    const romLv = Number(dRom.level  ?? 0);
    const romSk2 = Number(dRom.sk2Level ?? 0);
    const romSk3 = Number(dRom.sk3Level ?? 0);
    if (romLv > 0) {
      const v = EXPERT_LEVEL_STATS.Romulus[romLv] ?? 0;
      rows.push({ expert:"Romulus", stat:"Troops' Lethality", value: v, source:`Lv ${romLv}` });
      rows.push({ expert:"Romulus", stat:"Troops' Health",    value: v, source:`Lv ${romLv}` });
    }
    if (romSk2 > 0) {
      const v = ROMULUS_SK2_STAT[romSk2] ?? 0;
      rows.push({ expert:"Romulus", stat:"Troops' Attack",  value: v, source:`Sk2 (Last Line) Lv ${romSk2}` });
      rows.push({ expert:"Romulus", stat:"Troops' Defense", value: v, source:`Sk2 (Last Line) Lv ${romSk2}` });
    }
    if (romSk3 > 0) {
      const v = ROMULUS_SK3_STAT[romSk3] ?? 0;
      rows.push({ expert:"Romulus", stat:"Troops' Lethality", value: v, source:`Sk3 (Spirit) Lv ${romSk3}` });
      rows.push({ expert:"Romulus", stat:"Troops' Health",    value: v, source:`Sk3 (Spirit) Lv ${romSk3}` });
    }
    const fabLv = Number(getD("Fabian").level ?? 0);
    if (fabLv > 0) {
      const fabVal = EXPERT_LEVEL_STATS.Fabian[fabLv] ?? 0;
      rows.push({ expert:"Fabian", stat:"Troops' Lethality", value: fabVal, source:`Lv ${fabLv} (Foundry/Hellfire)` });
      rows.push({ expert:"Fabian", stat:"Troops' Health",    value: fabVal, source:`Lv ${fabLv} (Foundry/Hellfire)` });
    }
    // Holger: Troops' Attack & Defense
    const holLv = Number(getD("Holger").level ?? 0);
    if (holLv > 0) {
      const holVal = EXPERT_LEVEL_STATS.Holger[holLv] ?? 0;
      rows.push({ expert:"Holger", stat:"Troops' Attack",  value: holVal, source:`Lv ${holLv}` });
      rows.push({ expert:"Holger", stat:"Troops' Defense", value: holVal, source:`Lv ${holLv}` });
    }
    // Baldur: Troops' Attack & Defense (distinct curve, lower than others)
    const balLv = Number(getD("Baldur").level ?? 0);
    if (balLv > 0) {
      const balVal = EXPERT_LEVEL_STATS.Baldur[balLv] ?? 0;
      rows.push({ expert:"Baldur", stat:"Troops' Attack",  value: balVal, source:`Lv ${balLv}` });
      rows.push({ expert:"Baldur", stat:"Troops' Defense", value: balVal, source:`Lv ${balLv}` });
    }
    // Valeria: Troops' Lethality & Health (applies during SvS Battle Phase)
    const valLv = Number(getD("Valeria").level ?? 0);
    if (valLv > 0) {
      const valVal = EXPERT_LEVEL_STATS.Valeria[valLv] ?? 0;
      rows.push({ expert:"Valeria", stat:"Troops' Lethality", value: valVal, source:`Lv ${valLv} (SvS Battle Phase)` });
      rows.push({ expert:"Valeria", stat:"Troops' Health",    value: valVal, source:`Lv ${valLv} (SvS Battle Phase)` });
    }
    // Ronne: Troops' Attack & Defense (applies during raids/raiding)
    const ronneLv = Number(getD("Ronne").level ?? 0);
    if (ronneLv > 0) {
      const ronneVal = EXPERT_LEVEL_STATS.Ronne[ronneLv] ?? 0;
      rows.push({ expert:"Ronne", stat:"Troops' Attack",  value: ronneVal, source:`Lv ${ronneLv} (raid bonus)` });
      rows.push({ expert:"Ronne", stat:"Troops' Defense", value: ronneVal, source:`Lv ${ronneLv} (raid bonus)` });
    }
    // Kathy: Troops' Lethality & Health
    const kathyLv = Number(getD("Kathy").level ?? 0);
    if (kathyLv > 0) {
      const kathyVal = EXPERT_LEVEL_STATS.Kathy[kathyLv] ?? 0;
      rows.push({ expert:"Kathy", stat:"Troops' Lethality", value: kathyVal, source:`Lv ${kathyLv}` });
      rows.push({ expert:"Kathy", stat:"Troops' Health",    value: kathyVal, source:`Lv ${kathyLv}` });
    }
    return rows;
  };

  const STAT_ORDER = ["Troops' Attack","Troops' Defense","Troops' Lethality","Troops' Health"];
  const statRows = getStatRows();
  const totals = {};
  STAT_ORDER.forEach(s => { totals[s] = 0; });
  statRows.forEach(r => { if (totals[r.stat] !== undefined) totals[r.stat] += r.value; });

  const dRom = getD("Romulus");
  const romulusDeploy = ROMULUS_BONUS_DEPLOY[Number(dRom.affinity ?? 0)] ?? 0;
  const romulusRally  = ROMULUS_SK4_RALLY[Number(dRom.sk4Level ?? 0)] ?? 0;
  const pct = v => `${(v * 100).toFixed(2)}%`;

  return (
    <div style={{ marginTop:20 }}>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"12px 16px", background:C.card, border:`1px solid ${C.border}`,
          borderRadius: collapsed ? 10 : "10px 10px 0 0", cursor:"pointer", userSelect:"none" }}
        onMouseEnter={e => e.currentTarget.style.background = C.surface}
        onMouseLeave={e => e.currentTarget.style.background = C.card}
      >
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif" }}>
            Troop Stat Contributions
          </div>
          <div style={{ fontSize:11, color:C.textSec, fontFamily:"'Space Mono',monospace", marginTop:2 }}>
            Permanent buffs from expert levels & skills · feeds into Chief Profile
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {collapsed && STAT_ORDER.filter(s => totals[s] > 0).map(s => (
            <span key={s} style={{ fontSize:10, padding:"2px 8px", borderRadius:8,
              background:C.green+"22", color:C.green, border:`1px solid ${C.green}44`,
              fontFamily:"'Space Mono',monospace" }}>
              {s.replace("Troops' ","")}: +{pct(totals[s])}
            </span>
          ))}
          <span style={{ color:C.textDim, fontSize:14 }}>{collapsed ? "▼" : "▲"}</span>
        </div>
      </div>

      {!collapsed && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`,
          borderTop:"none", borderRadius:"0 0 10px 10px", overflow:"hidden" }}>

          {statRows.length === 0 ? (
            <div style={{ padding:"20px 16px", textAlign:"center", color:C.textDim,
              fontSize:12, fontFamily:"'Space Mono',monospace" }}>
              Set expert levels above to see stat contributions
            </div>
          ) : (
            <>
              <table style={{ borderCollapse:"collapse", width:"100%" }}>
                <thead>
                  <tr style={{ background:C.surface }}>
                    {["Expert","Stat","Value","Source"].map(h => (
                      <th key={h} style={{ padding:"8px 12px", fontSize:10, fontWeight:700,
                        color:C.textDim, textAlign:"left", borderBottom:`1px solid ${C.border}`,
                        fontFamily:"'Space Mono',monospace", textTransform:"uppercase", letterSpacing:"1px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statRows.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : C.surface }}>
                      <td style={{ padding:"8px 12px", fontSize:12, fontWeight:700,
                        color: expertColors[r.expert] ?? C.textPri }}>{r.expert}</td>
                      <td style={{ padding:"8px 12px", fontSize:12, color:C.textPri }}>{r.stat}</td>
                      <td style={{ padding:"8px 12px", fontSize:12, fontWeight:700,
                        color:C.green, fontFamily:"'Space Mono',monospace" }}>+{pct(r.value)}</td>
                      <td style={{ padding:"8px 12px", fontSize:11, color:C.textDim,
                        fontFamily:"'Space Mono',monospace" }}>{r.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding:"12px 16px", background:C.surface, borderTop:`2px solid ${C.border}` }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.textDim, textTransform:"uppercase",
                  letterSpacing:"1.5px", fontFamily:"'Space Mono',monospace", marginBottom:8 }}>Totals</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                  {STAT_ORDER.map(s => (
                    <div key={s} style={{ display:"flex", flexDirection:"column", padding:"8px 14px",
                      borderRadius:8, background: totals[s] > 0 ? C.green+"15" : C.card,
                      border:`1px solid ${totals[s] > 0 ? C.green+"44" : C.border}` }}>
                      <span style={{ fontSize:10, color:C.textDim, fontFamily:"'Space Mono',monospace" }}>{s}</span>
                      <span style={{ fontSize:16, fontWeight:800, fontFamily:"Syne,sans-serif",
                        color: totals[s] > 0 ? C.green : C.textDim }}>
                        {totals[s] > 0 ? `+${pct(totals[s])}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {(romulusDeploy > 0 || romulusRally > 0) && (
                <div style={{ padding:"10px 16px", background:C.card,
                  borderTop:`1px solid ${C.border}`, display:"flex", gap:16, flexWrap:"wrap" }}>
                  {romulusDeploy > 0 && (
                    <span style={{ fontSize:11, color:C.blue, fontFamily:"'Space Mono',monospace" }}>
                      🔵 Romulus Bonus (Expedition Army / Deploy Cap): +{romulusDeploy.toLocaleString()} → wired to Chief Profile
                    </span>
                  )}
                  {romulusRally > 0 && (
                    <span style={{ fontSize:11, color:C.blue, fontFamily:"'Space Mono',monospace" }}>
                      🔵 Romulus Sk4 Rally: +{romulusRally.toLocaleString()} → wired to Chief Profile
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────
export default ExpertsPage;
export {
  EXPERT_AFFINITY_POWER_RATE,
  EXPERT_TALENT_POWER_RATE,
  EXPERT_LEVEL_POWER,
  EXPERT_SKILL_POWER,
  RESEARCH_POWER,
  ROMULUS_SK4_RALLY,
  ROMULUS_BONUS_DEPLOY,
};
