import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import crypto from "crypto";
import { query } from "@/lib/db";

const PRICE_MAP: Record<string, string | undefined> = {
  free: process.env.STRIPE_PRICE_FREE,
  pro: process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tier, email } = body;

    if (!tier || !email) {
      return NextResponse.json(
        { error: "tier and email are required" },
        { status: 400 }
      );
    }

    // Free tier: create API key directly without Stripe
    if (tier === "free") {
      const apiKey = `rdn_free_${crypto.randomBytes(24).toString("hex")}`;
      await query(
        `INSERT INTO api_keys (key, tier, user_email, active) VALUES ($1, $2, $3, true)`,
        [apiKey, "free", email]
      );
      return NextResponse.json({ apiKey, tier: "free" });
    }

    const priceId = PRICE_MAP[tier];
    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid tier. Use: free, pro, or enterprise" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rentdanang.app";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { tier },
      success_url: `${appUrl}/pricing?success=true&tier=${tier}`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err.message);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
