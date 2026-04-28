// useTier.js — reads subscription tier from Supabase
// Returns: { tier: "free"|"pro", status, loading, periodEnd, cancelAtPeriodEnd }
import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

export function useTier(user) {
  const [tier,              setTier]              = useState("free");
  const [status,            setStatus]            = useState("active");
  const [loading,           setLoading]           = useState(true);
  const [periodEnd,         setPeriodEnd]         = useState(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setTier("free");
      setLoading(false);
      return;
    }

    let unsub;

    async function fetchTier() {
      setLoading(true);
      const { data } = await supabase
        .from("subscriptions")
        .select("tier, status, current_period_end, cancel_at_period_end")
        .eq("user_id", user.id)
        .single();

      if (data) {
        const active = ["active", "trialing"].includes(data.status);
        setTier(active ? data.tier : "free");
        setStatus(data.status);
        setPeriodEnd(data.current_period_end);
        setCancelAtPeriodEnd(data.cancel_at_period_end ?? false);
      } else {
        setTier("free");
        setStatus("none");
      }
      setLoading(false);
    }

    fetchTier();

    // Realtime: update instantly when subscription changes
    unsub = supabase
      .channel(`tier-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "subscriptions",
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        const d = payload.new;
        if (d) {
          const active = ["active", "trialing"].includes(d.status);
          setTier(active ? d.tier : "free");
          setStatus(d.status);
          setPeriodEnd(d.current_period_end);
          setCancelAtPeriodEnd(d.cancel_at_period_end ?? false);
        }
      })
      .subscribe();

    return () => { if (unsub) supabase.removeChannel(unsub); };
  }, [user?.id]);

  const isPro = tier === "pro";

  // Helper: open Stripe Checkout
  async function subscribe(priceId, promoCode) {
    if (!user?.email) return;
    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, userEmail: user.email, priceId, promoCode }),
    });
    const { url, error } = await res.json();
    if (error) { alert("Error: " + error); return; }
    window.location.href = url;
  }

  // Helper: open Stripe Customer Portal
  async function manageSubscription() {
    const res = await fetch("/api/customer-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const { url, error, code } = await res.json();
    if (error) {
      if (code === "no_stripe_subscription") {
        alert("Your Pro access is complimentary — there is no billing to manage.");
      } else {
        alert("Error opening billing portal: " + error);
      }
      return;
    }
    window.location.href = url;
  }

  return { tier, isPro, status, loading, periodEnd, cancelAtPeriodEnd, subscribe, manageSubscription };
}
