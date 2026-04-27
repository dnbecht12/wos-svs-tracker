import React, { createContext, useContext } from "react";

// ─── Context ──────────────────────────────────────────────────────────────────

export const TierContext = createContext(null);

export function useTierContext() {
  const ctx = useContext(TierContext);
  if (!ctx) throw new Error("useTierContext must be used inside TierProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TierProvider({
  children,
  user,
  tier,
  isPro,
  loading,
  subscribe,
  manageSubscription,
  openUpgradeModal,
  openAuth,
}) {
  const isGuest = !user;
  const isFree  = !!user && !isPro;

  return (
    <TierContext.Provider value={{
      user, tier, isPro, isGuest, isFree, loading,
      subscribe, manageSubscription,
      openUpgradeModal,
      openAuth,
    }}>
      {children}
    </TierContext.Provider>
  );
}

// ─── Upgrade Prompt ───────────────────────────────────────────────────────────

function UpgradePrompt({ variant, message }) {
  const { openUpgradeModal, openAuth } = useTierContext();

  const isPro    = variant === "pro" || variant === "pro-guest";
  const isGuest  = variant === "guest" || variant === "pro-guest";

  const icon  = isPro ? "⭐" : "🔒";
  const color = isPro ? "var(--c-accent)" : "var(--c-blue)";
  const bg    = isPro ? "var(--c-accentBg)" : "var(--c-blueBg)";
  const bdr   = isPro ? "var(--c-accentDim)" : "var(--c-blueDim)";

  const heading = isPro ? "Pro Feature" : "Account Required";
  const body    = message || (
    variant === "guest"     ? "Create a free account to access this feature." :
    variant === "pro"       ? "Upgrade to Pro to unlock this feature." :
    /* pro-guest */           "Sign up and upgrade to Pro to unlock this feature."
  );
  const btnLabel = isGuest ? "Sign Up Free" : "Upgrade to Pro";
  const btnAction = isGuest ? openAuth : openUpgradeModal;

  return (
    <div style={{
      background: bg,
      border: `1px solid ${bdr}`,
      borderRadius: 10,
      padding: "28px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 10,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 26, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color, fontFamily: "Syne, sans-serif" }}>
        {heading}
      </div>
      <div style={{ fontSize: 12, color: "var(--c-textSec)", maxWidth: 280, lineHeight: 1.65, fontFamily: "Syne, sans-serif" }}>
        {body}
      </div>
      {btnAction && (
        <button
          onClick={btnAction}
          style={{
            marginTop: 4,
            padding: "8px 20px",
            borderRadius: 7,
            border: "none",
            fontFamily: "Syne, sans-serif",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            background: color,
            color: "#0a0c10",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          {btnLabel}
        </button>
      )}
    </div>
  );
}

// ─── Guest Banner ─────────────────────────────────────────────────────────────
// Consistent guest info strip used across restricted modules.

export function GuestBanner({ message }) {
  const { openAuth } = useTierContext();
  return (
    <div style={{
      background:"var(--c-blueBg)", border:"1px solid var(--c-blueDim)",
      borderRadius:8, padding:"10px 16px", marginBottom:16,
      display:"flex", alignItems:"center", justifyContent:"space-between",
      gap:12, flexWrap:"wrap",
    }}>
      <span style={{fontSize:12, color:"var(--c-blue)", fontFamily:"Syne, sans-serif", lineHeight:1.5}}>
        🔒 {message}
      </span>
      <button
        onClick={openAuth}
        style={{
          padding:"5px 14px", borderRadius:6, border:"none",
          background:"var(--c-blue)", color:"#0a0c10",
          fontSize:11, fontWeight:700, cursor:"pointer",
          fontFamily:"Syne, sans-serif", whiteSpace:"nowrap",
          flexShrink:0,
        }}
      >
        Sign Up Free
      </button>
    </div>
  );
}

// ─── Gate Components ──────────────────────────────────────────────────────────

// Renders children only for Pro users. All others see an upgrade prompt.
export function ProGate({ children, message }) {
  const { isPro, isGuest } = useTierContext();
  if (isPro) return children;
  const variant = isGuest ? "pro-guest" : "pro";
  return <UpgradePrompt variant={variant} message={message} />;
}

// Renders children for any logged-in user (Free or Pro). Guests see a sign-up prompt.
export function FreeGate({ children, message }) {
  const { isGuest } = useTierContext();
  if (!isGuest) return children;
  return <UpgradePrompt variant="guest" message={message} />;
}

// Renders children only when the user is a guest (not logged in).
export function GuestOnly({ children }) {
  const { isGuest } = useTierContext();
  return isGuest ? children : null;
}
