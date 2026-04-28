import React from "react";
import { Link, useNavigate } from "react-router-dom";

const C = new Proxy({}, { get(_, k) { return `var(--c-${k})`; } });
const mono = { fontFamily:"'Space Mono',monospace" };

const STRIPE_PRICE_MONTHLY = "price_1TQpwuQzuzgBlSTmLdoXI0YB";
const STRIPE_PRICE_ANNUAL  = "price_1TQpwuQzuzgBlSTmfjRc4cT5";

const FEATURES = [
  { icon:"☁️", label:"Cloud sync across all devices" },
  { icon:"👤", label:"Unlimited characters" },
  { icon:"🐾", label:"Full Pets tracking + save" },
  { icon:"🎯", label:"Full Experts tracking + save" },
  { icon:"🏝️", label:"Daybreak Island access" },
  { icon:"📦", label:"Inventory tracking" },
  { icon:"⚔️",  label:"Complete Upgrades tool" },
  { icon:"🦸", label:"Hero Gear — up to 6 teams + stat table" },
  { icon:"📅", label:"Full RFC Planner (28-day, SvS-linked)" },
  { icon:"🔄", label:"Priority feature updates" },
];

const FREE_FEATURES = [
  "All calculators (Chief Gear, War Academy, Research, Construction)",
  "All 9 Experts (calculator only, no save)",
  "All 14 Pets (calculator only, no save)",
  "Heroes stat lookup + submission",
  "SvS Calendar",
  "Simplified RFC refine estimator",
  "1 character",
];

export default function PricingPage({ subscribe, user, isPro, periodEnd, cancelAtPeriodEnd, manageSubscription }) {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = React.useState("annual");
  const [promoCode,    setPromoCode]    = React.useState("");
  const [loading,      setLoading]      = React.useState(false);

  const plans = [
    { id:"monthly", priceId:STRIPE_PRICE_MONTHLY, label:"Monthly",  price:"$4.99",  period:"/month",
      note:"Billed monthly · Cancel anytime" },
    { id:"annual",  priceId:STRIPE_PRICE_ANNUAL,  label:"Annual",   price:"$39.99", period:"/year",
      note:"~$3.33/month · Save 33%", badge:"BEST VALUE" },
  ];

  const handleSubscribe = async () => {
    if (!user) { navigate("/"); return; }
    const plan = plans.find(p => p.id === selectedPlan);
    setLoading(true);
    await subscribe?.(plan.priceId, promoCode || undefined);
    setLoading(false);
  };

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"Syne, sans-serif" }}>
      {/* Nav */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Link to="/" style={{ textDecoration:"none", fontFamily:"Syne,sans-serif",
          fontWeight:800, fontSize:16, color:C.accent }}>
          TUNDRA <span style={{color:C.textSec}}>COMMAND</span>
        </Link>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          {user
            ? <Link to="/app/chief" style={{textDecoration:"none",color:C.textSec,fontSize:12,...mono}}>← App</Link>
            : <Link to="/" style={{textDecoration:"none",color:C.textSec,fontSize:12,...mono}}>← Back</Link>}
        </div>
      </div>

      <div style={{ maxWidth:760, margin:"0 auto", padding:"40px 24px" }}>

        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:32, fontWeight:900, color:C.textPri,
            fontFamily:"Syne,sans-serif", marginBottom:8 }}>
            ⚡ Tundra Command <span style={{color:C.accent}}>Pro</span>
          </div>
          <div style={{ fontSize:14, color:C.textSec, maxWidth:480, margin:"0 auto" }}>
            The complete WoS planning toolkit. Track everything, sync across devices, plan every SvS cycle.
          </div>
        </div>

        {/* Pro subscription status if already Pro */}
        {isPro && (
          <div style={{ background:C.accentBg, border:`1px solid ${C.accentDim}`,
            borderRadius:12, padding:"20px 24px", marginBottom:32, textAlign:"center" }}>
            <div style={{ fontSize:18, fontWeight:800, color:C.accent,
              fontFamily:"Syne,sans-serif", marginBottom:8 }}>⚡ You're on Pro</div>
            <div style={{ fontSize:12, color:C.textSec, ...mono, marginBottom:12 }}>
              {periodEnd ? `Renews ${new Date(periodEnd).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}` : "Active subscription"}
              {cancelAtPeriodEnd ? " · Cancels at period end" : ""}
            </div>
            <button onClick={manageSubscription}
              style={{ padding:"8px 20px", borderRadius:7, border:`1px solid ${C.accentDim}`,
                background:"transparent", color:C.accent, fontSize:12, fontWeight:700,
                cursor:"pointer", fontFamily:"Syne,sans-serif" }}>
              Manage Subscription →
            </button>
          </div>
        )}

        {/* Layout: plans + features */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginBottom:32 }}>

          {/* Free tier */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`,
            borderRadius:12, padding:"20px" }}>
            <div style={{ fontSize:16, fontWeight:800, color:C.textPri,
              fontFamily:"Syne,sans-serif", marginBottom:4 }}>Free</div>
            <div style={{ fontSize:24, fontWeight:900, color:C.textPri,
              fontFamily:"Syne,sans-serif", marginBottom:12 }}>$0</div>
            <ul style={{ listStyle:"none", padding:0, margin:0 }}>
              {FREE_FEATURES.map((f,i) => (
                <li key={i} style={{ fontSize:12, color:C.textSec, padding:"4px 0",
                  display:"flex", alignItems:"flex-start", gap:8 }}>
                  <span style={{ color:C.green, flexShrink:0, marginTop:1 }}>✓</span>{f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro tier */}
          <div style={{ background:`linear-gradient(135deg,rgba(227,115,26,0.08),transparent)`,
            border:`2px solid ${C.accentDim}`, borderRadius:12, padding:"20px", position:"relative" }}>
            <div style={{ position:"absolute", top:-10, right:16, background:C.accent,
              color:"#0a0c10", fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:4, ...mono }}>
              RECOMMENDED
            </div>
            <div style={{ fontSize:16, fontWeight:800, color:C.accent,
              fontFamily:"Syne,sans-serif", marginBottom:4 }}>⚡ Pro</div>
            <div style={{ fontSize:11, color:C.textSec, ...mono, marginBottom:12 }}>
              Everything in Free, plus:
            </div>
            <ul style={{ listStyle:"none", padding:0, margin:0 }}>
              {FEATURES.map((f,i) => (
                <li key={i} style={{ fontSize:12, color:C.textSec, padding:"4px 0",
                  display:"flex", alignItems:"flex-start", gap:8 }}>
                  <span style={{ flexShrink:0, marginTop:1 }}>{f.icon}</span>{f.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Subscribe widget — only show if not already Pro */}
        {!isPro && (
          <div style={{ background:C.card, border:`1px solid ${C.border}`,
            borderRadius:12, padding:"24px" }}>
            <div style={{ fontSize:16, fontWeight:800, color:C.textPri,
              fontFamily:"Syne,sans-serif", marginBottom:16 }}>Choose a plan</div>

            {/* Plan selector */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
              {plans.map(plan => (
                <div key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                  style={{ padding:"14px 16px", borderRadius:10, cursor:"pointer",
                    border:`2px solid ${selectedPlan === plan.id ? C.accent : C.border}`,
                    background: selectedPlan === plan.id ? "rgba(227,115,26,0.1)" : C.surface,
                    transition:"all 0.15s", position:"relative" }}>
                  {plan.badge && (
                    <div style={{ position:"absolute", top:-8, right:8, background:C.accent,
                      color:"#0a0c10", fontSize:8, fontWeight:800, padding:"2px 6px",
                      borderRadius:4, ...mono }}>{plan.badge}</div>
                  )}
                  <div style={{ fontSize:14, fontWeight:800, color:C.textPri,
                    fontFamily:"Syne,sans-serif", marginBottom:2 }}>{plan.label}</div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:2, marginBottom:2 }}>
                    <span style={{ fontSize:22, fontWeight:900, color:C.accent,
                      fontFamily:"Syne,sans-serif" }}>{plan.price}</span>
                    <span style={{ fontSize:11, color:C.textDim, ...mono }}>{plan.period}</span>
                  </div>
                  <div style={{ fontSize:10, color:C.textDim, ...mono }}>{plan.note}</div>
                </div>
              ))}
            </div>

            {/* Promo code */}
            <input type="text" placeholder="Promo / Access code (optional)"
              value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
              style={{ width:"100%", padding:"9px 12px", borderRadius:7,
                border:`1px solid ${C.border}`, background:C.surface, color:C.textPri,
                fontSize:12, ...mono, outline:"none", boxSizing:"border-box", marginBottom:14 }}
            />

            <button onClick={handleSubscribe} disabled={loading}
              style={{ width:"100%", padding:"13px", borderRadius:9,
                cursor:loading?"wait":"pointer", border:"none",
                background:loading ? C.border : "linear-gradient(135deg,#E3731A,#f5a623)",
                color:"#fff", fontSize:14, fontWeight:900, fontFamily:"Syne,sans-serif",
                opacity:loading ? 0.7 : 1, transition:"all 0.15s",
                boxShadow:loading ? "none" : "0 4px 16px rgba(227,115,26,0.4)" }}>
              {!user ? "Sign in to subscribe →" : loading ? "Redirecting to checkout…" : "Subscribe with Stripe →"}
            </button>

            <div style={{ textAlign:"center", marginTop:10, fontSize:10, color:C.textDim, ...mono }}>
              Secure payment via Stripe · Cancel anytime · No hidden fees
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
