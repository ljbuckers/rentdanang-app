"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const tiers = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with the RentDaNang API",
    requests: "50 requests/day",
    features: [
      "50 API requests per day",
      "Basic listing data",
      "JSON response format",
      "Community support",
    ],
    cta: "Get Free Key",
    highlighted: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "For apps and integrations that need more data",
    requests: "5,000 requests/day",
    features: [
      "5,000 API requests per day",
      "Full listing data with images",
      "Filtering and search endpoints",
      "Map coordinates and area data",
      "Email support",
      "Webhook notifications",
    ],
    cta: "Subscribe",
    highlighted: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "$199",
    period: "/month",
    description: "For production applications at scale",
    requests: "Unlimited requests",
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
    cta: "Subscribe",
    highlighted: false,
  },
];

function PricingContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");
  const successTier = searchParams.get("tier");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    apiKey?: string;
  } | null>(null);

  async function handleSubscribe(tier: string) {
    if (!email) {
      setResult({ type: "error", message: "Please enter your email address." });
      return;
    }

    setLoading(tier);
    setResult(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ type: "error", message: data.error || "Something went wrong" });
        return;
      }

      // Free tier returns API key directly
      if (data.apiKey) {
        setResult({
          type: "success",
          message: "Your free API key has been created!",
          apiKey: data.apiKey,
        });
        return;
      }

      // Paid tiers redirect to Stripe
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setResult({ type: "error", message: "Network error. Please try again." });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              RentDaNang API Pricing
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Access Da Nang rental listing data through our REST API.
              Choose the plan that fits your needs.
            </p>
          </div>

          {/* Success/Cancel banners */}
          {success && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-800 font-medium">
                Payment successful! Your {successTier} API key has been provisioned.
                Check your email for details.
              </p>
            </div>
          )}
          {canceled && (
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <p className="text-yellow-800">
                Checkout was canceled. No charges were made.
              </p>
            </div>
          )}

          {/* Email input */}
          <div className="max-w-md mx-auto mb-12">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          {/* Result message */}
          {result && (
            <div
              className={`max-w-md mx-auto mb-8 p-4 rounded-lg border ${
                result.type === "success"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <p
                className={
                  result.type === "success" ? "text-green-800" : "text-red-800"
                }
              >
                {result.message}
              </p>
              {result.apiKey && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-1">Your API key:</p>
                  <code className="block p-3 bg-gray-900 text-green-400 rounded text-sm font-mono break-all">
                    {result.apiKey}
                  </code>
                  <p className="text-xs text-gray-500 mt-2">
                    Save this key. It will not be shown again.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tiers.map((tier) => (
              <div
                key={tier.key}
                className={`relative rounded-2xl p-8 flex flex-col ${
                  tier.highlighted
                    ? "bg-blue-600 text-white ring-4 ring-blue-600 ring-offset-2"
                    : "bg-white text-gray-900 border border-gray-200"
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-800 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                    Most Popular
                  </span>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                  <p
                    className={`text-sm ${
                      tier.highlighted ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {tier.description}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span
                    className={`text-sm ${
                      tier.highlighted ? "text-blue-200" : "text-gray-400"
                    }`}
                  >
                    {tier.period}
                  </span>
                </div>

                <div
                  className={`text-sm font-medium mb-4 px-3 py-1 rounded-full inline-block w-fit ${
                    tier.highlighted
                      ? "bg-blue-500 text-white"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {tier.requests}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <svg
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          tier.highlighted ? "text-blue-200" : "text-green-500"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(tier.key)}
                  disabled={loading !== null}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-center transition-colors ${
                    tier.highlighted
                      ? "bg-white text-blue-600 hover:bg-blue-50"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === tier.key ? "Loading..." : tier.cta}
                </button>
              </div>
            ))}
          </div>

          {/* API Documentation link */}
          <div className="text-center mt-16">
            <p className="text-gray-600">
              Need help getting started?{" "}
              <a
                href="/api"
                className="text-blue-600 hover:underline font-medium"
              >
                View API Documentation
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}
