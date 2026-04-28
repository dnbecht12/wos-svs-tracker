import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, userEmail, priceId, promoCode } = req.body;

    if (!userId || !userEmail || !priceId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate priceId is one of ours
    const validPrices = [
      process.env.STRIPE_PRICE_MONTHLY,
      process.env.STRIPE_PRICE_ANNUAL,
    ];
    if (!validPrices.includes(priceId)) {
      return res.status(400).json({ error: "Invalid price" });
    }

    // Check if user already has a Stripe customer ID
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    let customerId = existing?.stripe_customer_id;

    // Create Stripe customer if not exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
    }

    // Build checkout session params
    const sessionParams = {
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.SITE_URL || "https://tundracommand.com"}/app/chief?checkout=success`,
      cancel_url: `${process.env.SITE_URL || "https://tundracommand.com"}/pricing`,
      metadata: { supabase_user_id: userId },
      subscription_data: { metadata: { supabase_user_id: userId } },
      allow_promotion_codes: true, // lets users enter promo codes at checkout
    };

    // If a promo code was passed programmatically, apply it
    if (promoCode) {
      const codes = await stripe.promotionCodes.list({ code: promoCode, limit: 1 });
      if (codes.data.length > 0) {
        sessionParams.discounts = [{ promotion_code: codes.data[0].id }];
        delete sessionParams.allow_promotion_codes;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("create-checkout error:", err);
    return res.status(500).json({ error: err.message });
  }
}
