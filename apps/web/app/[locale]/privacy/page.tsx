import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — RentDaNang",
  description: "Privacy Policy for RentDaNang rental search platform.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: March 6, 2026</p>
        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">1. Who We Are</h2>
            <p>RentDaNang (rentdanang.app) is a rental listing aggregator for Da Nang, Vietnam, operated by RentDaNang Team. We collect publicly available rental listings from multiple platforms and present them in a searchable format.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">2. Information We Collect</h2>
            <p><strong>Account information:</strong> If you create an account, we collect your name, email address, and optionally your phone number.</p>
            <p><strong>Usage data:</strong> We use Google Analytics to collect anonymized data about how visitors use the site, including pages visited, time on site, and general location (country/city level).</p>
            <p><strong>Cookies:</strong> We use essential cookies for site functionality and third-party cookies from Google Analytics and Google AdSense for analytics and advertising purposes.</p>
            <p><strong>Lead form data:</strong> If you submit a recommendation request, we collect the information you provide (name, email, budget, preferred area, move-in date).</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and improve the rental search service</li>
              <li>To send personalized rental recommendations if you request them</li>
              <li>To send saved search alerts via email, SMS, or WhatsApp if you opt in</li>
              <li>To analyze site usage and improve the user experience</li>
              <li>To display relevant advertisements through Google AdSense</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">4. Third-Party Services</h2>
            <p>We use the following third-party services that may collect data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google Analytics</strong> (usage analytics)</li>
              <li><strong>Google AdSense</strong> (advertising)</li>
              <li><strong>Cloudflare</strong> (CDN and security)</li>
              <li><strong>Mapbox</strong> (interactive maps)</li>
            </ul>
            <p>Each service operates under its own privacy policy.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">5. Data Sharing</h2>
            <p>We do not sell your personal information. We share data only with the third-party services listed above, as necessary to operate the site. We may disclose information if required by law.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">6. Data Retention</h2>
            <p>Account data is retained as long as your account is active. You may request deletion of your account and associated data at any time by contacting us.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">7. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You may opt out of marketing communications at any time. To exercise these rights, contact us at contact@rentdanang.app.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">8. Children</h2>
            <p>RentDaNang is not directed at children under 13. We do not knowingly collect personal information from children.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">9. Changes</h2>
            <p>We may update this policy from time to time. Changes will be posted on this page with an updated date.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">10. Contact</h2>
            <p>For questions about this privacy policy, contact us at contact@rentdanang.app.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
