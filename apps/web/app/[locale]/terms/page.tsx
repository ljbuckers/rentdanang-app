import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — RentDaNang",
  description: "Terms of Service for RentDaNang rental search platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: March 6, 2026</p>
        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using RentDaNang (rentdanang.app), you agree to be bound by these Terms of Service. If you do not agree, do not use the site.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">2. Description of Service</h2>
            <p>RentDaNang is a rental listing aggregator. We collect publicly available rental listings from various platforms in Da Nang, Vietnam, and present them in a searchable, translated format. We do not own, manage, or rent any properties.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">3. No Guarantees</h2>
            <p>Listings are sourced from third-party platforms and may contain errors, be outdated, or become unavailable. We do not verify the accuracy of listings, prices, photos, or availability. RentDaNang is provided "as is" without warranties of any kind.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">4. User Accounts</h2>
            <p>You are responsible for maintaining the security of your account credentials. You agree to provide accurate information when creating an account.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Scrape, crawl, or systematically download content from the site without permission</li>
              <li>Use the site for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the site or its systems</li>
              <li>Interfere with the proper functioning of the site</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">6. API Access</h2>
            <p>Access to the RentDaNang API is subject to rate limits and usage tiers. API keys may be revoked for abuse or violation of these terms.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">7. Intellectual Property</h2>
            <p>The RentDaNang platform, design, and original content are the property of RentDaNang Team. Listing data is sourced from third-party platforms and remains the property of the respective owners.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">8. Limitation of Liability</h2>
            <p>RentDaNang and RentDaNang Team shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of the site or reliance on any listing information. Any rental transaction you enter into is solely between you and the property owner or agent.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">9. Third-Party Links</h2>
            <p>The site may contain links to third-party websites and services. We are not responsible for the content or practices of these external sites.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">10. Changes to Terms</h2>
            <p>We may update these terms at any time. Continued use of the site after changes constitutes acceptance of the new terms.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">11. Governing Law</h2>
            <p>These terms are governed by the laws of British Columbia, Canada.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">12. Contact</h2>
            <p>Questions about these terms can be directed to contact@rentdanang.app.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
