import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { query } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  // If webhook secret is configured, verify signature
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }
  } else {
    // No webhook secret configured: parse body directly (dev mode)
    event = JSON.parse(body);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const tier = session.metadata?.tier || "pro";
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const email = session.customer_email || session.customer_details?.email;

    // Generate API key
    const apiKey = `rdn_${tier}_${crypto.randomBytes(24).toString("hex")}`;

    await query(
      `INSERT INTO api_keys (key, tier, user_email, stripe_customer_id, stripe_subscription_id, active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [apiKey, tier, email, customerId, subscriptionId]
    );

    console.log(`API key provisioned for ${email} (${tier}): ${apiKey.substring(0, 12)}...`);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    // Deactivate API keys for this subscription
    await query(
      `UPDATE api_keys SET active = false WHERE stripe_subscription_id = $1`,
      [subscription.id]
    );
    console.log(`Subscription canceled, keys deactivated: ${subscription.id}`);
  }

  return NextResponse.json({ received: true });
}
