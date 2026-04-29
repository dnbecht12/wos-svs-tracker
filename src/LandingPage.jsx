import React, { useState } from "react";
import { Link } from "react-router-dom";

const C = new Proxy({}, { get(_, k) { return `var(--c-${k})`; } });
const mono = { fontFamily:"'Space Mono',monospace" };

const MODULES = [
  { icon:"🏔️", name:"Chief Profile",       path:"/app/chief",        desc:"Live power calculator — tech, gear, heroes, troops, buildings in one place." },
  { icon:"⚔️",  name:"Chief Gear & Charms", path:"/app/chief-gear",   desc:"Track current vs goal levels, see material costs to reach your upgrade target." },
  { icon:"🎯",  name:"Experts",             path:"/app/experts",      desc:"Level and skill planning for all 9 experts with affinity and sigil breakdowns." },
  { icon:"🐾",  name:"Pets",               path:"/app/pets",         desc:"Stat tracking and upgrade cost calculator for all 14 pets." },
  { icon:"🦸",  name:"Heroes & Hero Gear",  path:"/app/heroes",       desc:"Roster manager, team gear planner, and stat submission for hero data." },
  { icon:"🏗️",  name:"Construction Planner",path:"/app/construction", desc:"Building upgrade cost calculator with RFC and resource requirements." },
  { icon:"📅",  name:"RFC Planner",         path:"/app/rfc-planner",  desc:"4-week refine estimator — see your estimated RFC earned and FC burned per day." },
  { icon:"⚗️",  name:"Research Center",     path:"/app/research",     desc:"Cost and time calculator across Growth, Economy, and Battle trees." },
  { icon:"📖",  name:"War Academy",         path:"/app/war-academy",  desc:"Per-troop research levels with shards, steel, and time cost tracking." },
  { icon:"📅",  name:"SvS Calendar",        path:"/app/svs-calendar", desc:"Full SvS event schedule with KOI, prep weeks, and cycle timing." },
];

const TIER_TABLE = [
  { feature:"All calculators",          guest:true,  free:true,  pro:true  },
  { feature:"Heroes stat lookup",        guest:true,  free:true,  pro:true  },
  { feature:"SvS Calendar",             guest:true,  free:true,  pro:true  },
  { feature:"RFC refine estimator",     guest:true,  free:true,  pro:true  },
  { feature:"Chief Profile tracking",   guest:false, free:true,  pro:true  },
  { feature:"Construction Planner",     guest:false, free:true,  pro:true  },
  { feature:"Research Center tracking", guest:false, free:true,  pro:true  },
  { feature:"War Academy tracking",     guest:false, free:true,  pro:true  },
  { feature:"Experts tracking + save",  guest:false, free:false, pro:true  },
  { feature:"Pets tracking + save",     guest:false, free:false, pro:true  },
  { feature:"Inventory",               guest:false, free:false, pro:true  },
  { feature:"Daybreak Island",          guest:false, free:false, pro:true  },
  { feature:"Full 28-day RFC Planner",  guest:false, free:false, pro:true  },
  { feature:"Hero Gear — 6 teams",      guest:false, free:false, pro:true  },
  { feature:"Complete Upgrades tool",   guest:false, free:false, pro:true  },
  { feature:"Cloud sync",              guest:false, free:true,  pro:true  },
  { feature:"Unlimited characters",    guest:false, free:false, pro:true  },
];

function AuthModal({ onClose, signUp, signIn, signInWithDiscord, authError, clearError }) {
  const [mode,     setMode]     = useState("signup");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [busy,     setBusy]     = useState(false);

  const switchMode = (m) => { setMode(m); clearError?.(); setEmail(""); setPassword(""); setName(""); };

  const handleSubmit = async () => {
    if (!email || !password) return;
    setBusy(true);
    if (mode === "signup") await signUp(email, password, name || undefined);
    else await signIn(email, password);
    setBusy(false);
  };
  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:9999,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14,
        width:"100%", maxWidth:400, padding:"24px", boxShadow:"0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif" }}>
            {mode === "signup" ? "Create free account" : "Sign in"}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.textDim,
            fontSize:20, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={signInWithDiscord}
            style={{ background:"#5865F2", color:"#fff", border:"none", borderRadius:7,
              padding:"10px", fontSize:13, fontWeight:700, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              fontFamily:"Syne,sans-serif" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            Continue with Discord
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:8, margin:"4px 0" }}>
            <div style={{ flex:1, height:1, background:C.border }}/>
            <span style={{ fontSize:10, color:C.textDim, ...mono }}>or</span>
            <div style={{ flex:1, height:1, background:C.border }}/>
          </div>

          {mode === "signup" && (
            <input style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:7,
              padding:"9px 12px", fontSize:12, color:C.textPri, outline:"none", ...mono }}
              placeholder="Display name (optional)" value={name}
              onChange={e => setName(e.target.value)} onKeyDown={handleKey} />
          )}
          <input type="email" style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:7,
            padding:"9px 12px", fontSize:12, color:C.textPri, outline:"none", ...mono }}
            placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} onKeyDown={handleKey} autoComplete="email" />
          <input type="password" style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:7,
            padding:"9px 12px", fontSize:12, color:C.textPri, outline:"none", ...mono }}
            placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} onKeyDown={handleKey}
            autoComplete={mode === "signup" ? "new-password" : "current-password"} />

          {authError && (
            <div style={{ fontSize:11, color:C.red, background:C.redBg, borderRadius:5,
              border:`1px solid ${C.redDim}`, padding:"6px 10px", ...mono }}>{authError}</div>
          )}

          <button onClick={handleSubmit} disabled={busy || !email || !password}
            style={{ background:C.accent, color:"#0a0c10", border:"none", borderRadius:7,
              padding:"10px", fontSize:13, fontWeight:700, cursor:busy?"wait":"pointer",
              fontFamily:"Syne,sans-serif", opacity:(busy||!email||!password)?0.5:1 }}>
            {busy ? "…" : mode === "signup" ? "Create Account" : "Sign In"}
          </button>

          <div style={{ fontSize:11, color:C.textSec, textAlign:"center" }}>
            {mode === "login"
              ? <>No account? <span onClick={() => switchMode("signup")}
                  style={{ color:C.accent, cursor:"pointer", textDecoration:"underline" }}>Sign up free</span></>
              : <>Have an account? <span onClick={() => switchMode("login")}
                  style={{ color:C.accent, cursor:"pointer", textDecoration:"underline" }}>Sign in</span></>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ signUp, signIn, signInWithDiscord, authError, clearError, authLoading }) {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signup");

  const openAuth = (mode) => { setAuthMode(mode); setShowAuth(true); };

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"Syne,sans-serif", color:C.textPri }}>

      {/* Nav */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"14px 32px", display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:10 }}>
        <div style={{ fontSize:18, fontWeight:800, color:C.accent, letterSpacing:1 }}>
          TUNDRA <span style={{ color:C.textSec, fontSize:14, fontWeight:600, letterSpacing:4 }}>COMMAND</span>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <a href="https://www.whiteoutsurvival.wiki/"
            target="_blank" rel="noopener noreferrer"
            style={{ color:C.textSec, fontSize:11, textDecoration:"none", ...mono,
              padding:"5px 10px", borderRadius:6, border:`1px solid ${C.border}` }}>
            WoS Wiki ↗
          </a>
          <Link to="/pricing" style={{ color:C.textSec, fontSize:11, textDecoration:"none",
            ...mono, padding:"5px 10px", borderRadius:6, border:`1px solid ${C.border}` }}>
            Pricing
          </Link>
          <button onClick={() => openAuth("login")}
            style={{ background:"transparent", color:C.textSec, border:`1px solid ${C.border}`,
              borderRadius:7, padding:"7px 16px", fontSize:12, fontWeight:700, cursor:"pointer",
              fontFamily:"Syne,sans-serif" }}>
            Sign In
          </button>
          <button onClick={() => openAuth("signup")}
            style={{ background:C.accent, color:"#0a0c10", border:"none",
              borderRadius:7, padding:"7px 16px", fontSize:12, fontWeight:700, cursor:"pointer",
              fontFamily:"Syne,sans-serif" }}>
            Sign Up Free
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth:860, margin:"0 auto", padding:"64px 32px 48px", textAlign:"center" }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"3px", textTransform:"uppercase",
          color:C.accent, ...mono, marginBottom:16 }}>
          Whiteout Survival · SvS Planning
        </div>
        <h1 style={{ fontSize:48, fontWeight:900, lineHeight:1.1, marginBottom:20,
          fontFamily:"Syne,sans-serif" }}>
          Plan every cycle.<br/>
          <span style={{ color:C.accent }}>Win every SvS.</span>
        </h1>
        <p style={{ fontSize:15, color:C.textSec, lineHeight:1.7, maxWidth:560, margin:"0 auto 32px" }}>
          Tundra Command is the all-in-one tracker for Whiteout Survival players —
          RFC planning, power calculations, troop tracking, research goals, and more.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={() => openAuth("signup")}
            style={{ background:`linear-gradient(135deg,#E3731A,#f5a623)`, color:"#fff",
              border:"none", borderRadius:9, padding:"14px 32px", fontSize:15, fontWeight:800,
              cursor:"pointer", fontFamily:"Syne,sans-serif",
              boxShadow:"0 4px 20px rgba(227,115,26,0.4)" }}>
            Get Started Free →
          </button>
          <button onClick={() => openAuth("login")}
            style={{ background:"transparent", color:C.textSec,
              border:`1px solid ${C.border}`, borderRadius:9, padding:"14px 32px",
              fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Syne,sans-serif" }}>
            Sign In
          </button>
        </div>
      </div>

      {/* Modules grid */}
      <div style={{ background:C.surface, borderTop:`1px solid ${C.border}`,
        borderBottom:`1px solid ${C.border}`, padding:"48px 32px" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"3px", textTransform:"uppercase",
            color:C.textSec, ...mono, textAlign:"center", marginBottom:32 }}>
            Everything You Need
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
            {MODULES.map(m => (
              <Link key={m.name} to={m.path}
                style={{ textDecoration:"none", display:"block",
                  background:C.card, border:`1px solid ${C.border}`,
                  borderRadius:10, padding:"16px 18px",
                  transition:"border-color 0.15s, transform 0.1s",
                  cursor:"pointer" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="var(--c-accent)"; e.currentTarget.style.transform="translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="var(--c-border)";  e.currentTarget.style.transform="translateY(0)"; }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:20 }}>{m.icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:C.textPri }}>{m.name}</span>
                </div>
                <div style={{ fontSize:12, color:C.textSec, lineHeight:1.6, marginBottom:10 }}>{m.desc}</div>
                <div style={{ fontSize:10, fontWeight:700, color:C.accent, ...mono, letterSpacing:"0.5px" }}>
                  Try it free →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tier table */}
      <div style={{ maxWidth:760, margin:"0 auto", padding:"48px 32px" }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"3px", textTransform:"uppercase",
          color:C.textSec, ...mono, textAlign:"center", marginBottom:24 }}>
          Plans &amp; Features
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:C.surface }}>
                <th style={{ padding:"12px 16px", textAlign:"left", fontSize:10,
                  fontWeight:700, letterSpacing:"1px", textTransform:"uppercase",
                  color:C.textSec, ...mono, borderBottom:`1px solid ${C.border}` }}>Feature</th>
                {["Guest","Free","⚡ Pro"].map(h => (
                  <th key={h} style={{ padding:"12px 16px", textAlign:"center", fontSize:10,
                    fontWeight:700, letterSpacing:"1px", textTransform:"uppercase",
                    color: h.includes("Pro") ? C.accent : C.textSec, ...mono,
                    borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIER_TABLE.map((row, i) => (
                <tr key={row.feature} style={{ borderBottom:`1px solid ${C.border}`,
                  background: i%2===0 ? "transparent" : C.surface }}>
                  <td style={{ padding:"9px 16px", color:C.textPri }}>{row.feature}</td>
                  {[row.guest, row.free, row.pro].map((v, ci) => (
                    <td key={ci} style={{ padding:"9px 16px", textAlign:"center",
                      color: v ? (ci===2 ? C.accent : C.green) : C.textDim,
                      fontWeight:700, fontSize:14 }}>
                      {v ? "✓" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ textAlign:"center", marginTop:24 }}>
          <Link to="/pricing" style={{ color:C.accent, fontSize:13, fontWeight:700,
            textDecoration:"none", ...mono }}>
            See full pricing →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop:`1px solid ${C.border}`, padding:"20px 32px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:12, background:C.surface }}>
        <div style={{ fontSize:10, color:C.textDim, ...mono }}>
          © 2026 Tundra Command · Fan-made · Not affiliated with Century Games
        </div>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <Link to="/terms" style={{ color:C.textDim, fontSize:11, textDecoration:"none", ...mono }}>
            Terms
          </Link>
          <Link to="/pricing" style={{ color:C.textDim, fontSize:11, textDecoration:"none", ...mono }}>
            Pricing
          </Link>
          <a href="https://whiteout-survival.fandom.com/wiki/Whiteout_Survival_Wiki"
            target="_blank" rel="noopener noreferrer"
            style={{ color:C.textDim, fontSize:11, textDecoration:"none", ...mono }}>
            WoS Wiki ↗
          </a>
        </div>
      </div>

      {/* Auth modal */}
      {showAuth && (
        <AuthModal
          onClose={() => { setShowAuth(false); clearError?.(); }}
          signUp={signUp} signIn={signIn} signInWithDiscord={signInWithDiscord}
          authError={authError} clearError={clearError}
        />
      )}
    </div>
  );
}
