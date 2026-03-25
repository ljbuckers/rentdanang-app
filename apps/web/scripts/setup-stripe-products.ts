/**
 * Setup script to create Stripe products and prices for RentDaNang API tiers.
 * Run with: npx tsx scripts/setup-stripe-products.ts
 * 
 * Uses STRIPE_SECRET_KEY from environment or .env.local
 */

import Stripe from "stripe";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error("STRIPE_SECRET_KEY not found");
  process.exit(1);
}

const stripe = new Stripe(stripeKey);

async function setup() {
  console.log("Creating Stripe products and prices for RentDaNang API...\n");
  console.log(`Using key: ${stripeKey!.substring(0, 12)}...`);
  console.log("");

  // Create the product
  const product = await stripe.products.create({
    name: "RentDaNang API",
    description: "Access to the RentDaNang rental listings API",
  });
  console.log(`Product created: ${product.id}`);

  // Free tier - $0/month
  const freePrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 0,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: "free", requests_per_day: "50" },
    nickname: "Free - 50 requests/day",
  });
  console.log(`Free price: ${freePrice.id}`);

  // Pro tier - $49/month
  const proPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 4900,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: "pro", requests_per_day: "5000" },
    nickname: "Pro - 5,000 requests/day",
  });
  console.log(`Pro price:  ${proPrice.id}`);

  // Enterprise tier - $199/month
  const enterprisePrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 19900,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: "enterprise", requests_per_day: "unlimited" },
    nickname: "Enterprise - Unlimited requests",
  });
  console.log(`Enterprise price: ${enterprisePrice.id}`);

  console.log("\n--- Add these to your .env.local ---");
  console.log(`STRIPE_PRICE_FREE=${freePrice.id}`);
  console.log(`STRIPE_PRICE_PRO=${proPrice.id}`);
  console.log(`STRIPE_PRICE_ENTERPRISE=${enterprisePrice.id}`);
  console.log(`STRIPE_PRODUCT_ID=${product.id}`);
}

setup().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
