import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

// Tier configuration
export const TIERS = {
  free: {
    name: "Free",
    price: 0,
    requestsPerDay: 50,
    features: [
      "50 API requests per day",
      "Basic listing data",
      "JSON response format",
      "Community support",
    ],
  },
  pro: {
    name: "Pro",
    price: 49,
    requestsPerDay: 5000,
    features: [
      "5,000 API requests per day",
      "Full listing data with images",
      "Filtering and search endpoints",
      "Map coordinates and area data",
      "Email support",
      "Webhook notifications",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 199,
    requestsPerDay: -1, // unlimited
    features: [
      "Unlimited API requests",
      "Full listing data with images",
      "All filtering and search endpoints",
      "Map coordinates and area data",
      "Priority email support",
      "Webhook notifications",
      "Bulk export endpoints",
      "Custom integrations support",
    ],
  },
} as const;

export type TierKey = keyof typeof TIERS;
