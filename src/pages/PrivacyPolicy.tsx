import React from 'react';
import SEO from "../components/SEO";

const PrivacyPolicy: React.FC = () => {
  return (
    <>
      <SEO
        title="Privacy Policy"
        description="How WanderLuxe collects, uses, stores, and protects your personal data when you use our travel planning platform."
        canonicalPath="/privacy"
      />
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Privacy Policy
          </h1>
          <section className="space-y-10 text-sm leading-relaxed text-muted-foreground">
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Introduction</h2>
              <p>
                Welcome to <strong>WanderLuxe</strong>, operated by <strong>Wanderluxe Travel LLC</strong> ("we", "us", "our"). This Privacy Policy explains how we collect, use, store, share, and protect your personal data when you use our website and services at <strong>wanderluxe.io</strong>.
              </p>
              <p className="mt-2">
                We are committed to protecting your privacy and processing your data in accordance with the General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA/CPRA), and other applicable data protection laws.
              </p>
            </div>

            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Data Controller</h2>
              <p>
                Wanderluxe Travel LLC is the data controller for the personal data collected through our services. For questions about this policy or to exercise your rights, contact us at:{' '}
                <a href="mailto:privacy@wanderluxe.io" className="text-primary hover:underline">
                  privacy@wanderluxe.io
                </a>
              </p>
            </div>

            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Personal Data We Collect</h2>
              <p className="mb-3">We collect the following categories of personal data:</p>

              <h3 className="font-semibold text-foreground mt-4 mb-2">Data you provide directly</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Account information:</strong> name, email address, profile photo</li>
                <li><strong>Trip data:</strong> destinations, travel dates, itineraries, bookings, dining reservations, transportation details, and expenses</li>
                <li><strong>AI chat conversations:</strong> messages you send to our AI travel assistant, along with trip context used to generate responses</li>
                <li><strong>Payment information:</strong> processed by Stripe (we do not store your card details)</li>
                <li><strong>Shared trip data:</strong> email addresses and names of people you share trips with</li>
              </ul>

              <h3 className="font-semibold text-foreground mt-4 mb-2">Data collected automatically</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Usage analytics:</strong> page views, feature usage, and engagement events (e.g. trip created, AI message sent, PDF exported), including the trip destination, message length, and event timestamps</li>
                <li><strong>Session recordings:</strong> via PostHog, we capture replays of how users interact with the site (mouse movement, clicks, scrolls, and DOM changes) to diagnose UX issues. Password fields are always masked. Other form inputs are masked by default; email fields are not masked, so the email address you type into a form may appear in a recording. Session recordings are only captured after you opt in to analytics cookies.</li>
                <li><strong>Identity attributes shared with analytics:</strong> after you sign in and consent to analytics, we send your user ID, email address, sign-in provider (e.g. Google), and account creation date to PostHog so we can correlate events with your account.</li>
                <li><strong>Device information:</strong> browser type, operating system, screen resolution</li>
                <li><strong>Location data:</strong> approximate country (via IP address) for consent banner display only; not stored</li>
              </ul>
            </div>

            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">4. How We Use Your Data</h2>
              <p className="mb-3">We process your data for the following purposes and lawful bases:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Purpose</th>
                      <th className="text-left py-2 font-semibold text-foreground">Lawful Basis (GDPR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="py-2 pr-4">Providing and maintaining our services</td><td className="py-2">Contract performance</td></tr>
                    <tr><td className="py-2 pr-4">Processing payments</td><td className="py-2">Contract performance</td></tr>
                    <tr><td className="py-2 pr-4">AI-powered trip recommendations</td><td className="py-2">Contract performance</td></tr>
                    <tr><td className="py-2 pr-4">Sending service-related emails (trip shares, invites)</td><td className="py-2">Contract performance</td></tr>
                    <tr><td className="py-2 pr-4">Analytics and product improvement</td><td className="py-2">Consent</td></tr>
                    <tr><td className="py-2 pr-4">Marketing communications</td><td className="py-2">Consent</td></tr>
                    <tr><td className="py-2 pr-4">Fraud prevention and security</td><td className="py-2">Legitimate interest</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Third-Party Data Processors</h2>
              <p className="mb-3">We share your data with the following third-party service providers who process data on our behalf:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Provider</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Purpose</th>
                      <th className="text-left py-2 font-semibold text-foreground">Data Shared</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="py-2 pr-4">Supabase</td><td className="py-2 pr-4">Database and authentication</td><td className="py-2">Account data, trip data, all stored information</td></tr>
                    <tr><td className="py-2 pr-4">Google (Gemini API)</td><td className="py-2 pr-4">AI travel assistant + travel document OCR</td><td className="py-2">Chat messages, trip context (destination, dates, itinerary), and uploaded booking documents</td></tr>
                    <tr><td className="py-2 pr-4">Stripe</td><td className="py-2 pr-4">Payment processing</td><td className="py-2">Email, payment details</td></tr>
                    <tr><td className="py-2 pr-4">PostHog</td><td className="py-2 pr-4">Product analytics and session replay (consent-gated)</td><td className="py-2">User ID, email, sign-in provider, account creation date, usage events (including trip destination and event timestamps), device info, and session recordings with form inputs masked (passwords always; emails are not masked)</td></tr>
                    <tr><td className="py-2 pr-4">Google Analytics (gtag)</td><td className="py-2 pr-4">Aggregate site analytics</td><td className="py-2">Page views, feature events, pseudonymous client identifier, device info, and IP address (used by Google for geolocation and then discarded)</td></tr>
                    <tr><td className="py-2 pr-4">Google</td><td className="py-2 pr-4">Places API (location search)</td><td className="py-2">Search queries</td></tr>
                    <tr><td className="py-2 pr-4">SendGrid</td><td className="py-2 pr-4">Transactional email</td><td className="py-2">Recipient email, message content</td></tr>
                    <tr><td className="py-2 pr-4">Unsplash</td><td className="py-2 pr-4">Trip imagery</td><td className="py-2">Search queries (no personal data)</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3">
                We do not sell your personal data to any third party. Data shared with processors is limited to what is necessary for the specified purpose.
              </p>
            </div>

            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">6. International Data Transfers</h2>
              <p>
                Your data may be transferred to and processed in the United States, where our service providers are located. For transfers from the EU/EEA, we rely on Standard Contractual Clauses (SCCs) and processor agreements to ensure adequate protection of your data.
              </p>
            </div>

            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Data Retention</h2>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Account and trip data:</strong> retained while your account is active; deleted upon account deletion</li>
                <li><strong>AI chat history:</strong> retained while your account is active; deleted upon account deletion</li>
                <li><strong>Analytics data:</strong> retained for up to 12 months</li>
                <li><strong>Payment records:</strong> retained as required by applicable tax and financial regulations</li>
                <li><strong>Weather cache:</strong> automatically purged after 7 days</li>
              </ul>
            </div>

            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Your Rights</h2>
              <p className="mb-3">Under GDPR, CCPA/CPRA, and other applicable laws, you have the right to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Access:</strong> request a copy of your personal data</li>
                <li><strong>Portability:</strong> download your data in a structured, machine-readable format (JSON)</li>
                <li><strong>Rectification:</strong> correct inaccurate personal data</li>
                <li><strong>Erasure:</strong> permanently delete your account and all associated data</li>
                <li><strong>Restriction:</strong> restrict how we process your data</li>
                <li><strong>Objection:</strong> object to processing based on legitimate interest</li>
                <li><strong>Withdraw consent:</strong> withdraw consent for analytics and marketing cookies at any time</li>
                <li><strong>Opt-out of sale/sharing:</strong> we do not sell or share your personal information for cross-context behavioral advertising</li>
              </ul>
              <p className="mt-3">
                <strong>How to exercise your rights:</strong> You can download your data and delete your account directly from your{' '}
                <a href="/profile" className="text-primary hover:underline">Profile page</a>. You can manage cookie preferences via the "Manage Cookies" link in the footer. For other requests, email{' '}
                <a href="mailto:privacy@wanderluxe.io" className="text-primary hover:underline">privacy@wanderluxe.io</a>.
              </p>
              <p className="mt-2">
                We will respond to data subject requests within 30 days (GDPR) or 45 days (CCPA). You also have the right to lodge a complaint with your local supervisory authority.
              </p>
            </div>

            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">9. Cookies and Tracking</h2>
              <p className="mb-3">We use the following categories of cookies and similar tracking technologies:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Essential cookies:</strong> required for authentication and core functionality (always active)</li>
                <li><strong>Analytics cookies:</strong> Google Analytics (gtag) measures aggregate page views and feature usage. PostHog provides product analytics and session replay (recordings of page interactions, with form inputs masked except email fields). PostHog tracking and session replay are gated on your consent; you can opt in or out at any time.</li>
                <li><strong>Marketing cookies:</strong> used for personalized content (requires your consent)</li>
              </ul>
              <p className="mt-3">
                You can manage your cookie preferences at any time using the "Manage Cookies" link in the website footer. Non-US users are prompted to set preferences before optional cookies are activated.
              </p>
            </div>

            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">10. AI Data Processing</h2>
              <p>
                When you use our AI travel assistant, your trip details (destination, dates, itinerary, accommodations, and transportation) are sent to Google's Gemini API to generate personalized recommendations. Uploaded booking documents (images or PDFs) are also processed by Gemini for OCR-based field extraction. Your messages and documents are processed in real-time and, per Google's paid API terms, are not used to train their models. AI chat history is stored in your account and can be deleted at any time by deleting your account.
              </p>
            </div>

            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">11. Data Security</h2>
              <p>
                We implement security measures to protect your data, including: encrypted data transmission (HTTPS/TLS), database-level Row Level Security (RLS) policies ensuring you can only access your own data, secure authentication via Supabase Auth with Google OAuth support, and automatic session token refresh. No method of transmission over the internet is completely secure, and we cannot guarantee absolute security.
              </p>
            </div>

            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">12. Children's Privacy</h2>
              <p>
                Our services are not directed at children under 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, contact us and we will delete it.
              </p>
            </div>

            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">13. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Material changes will be communicated via email or an in-app notice. The "Last updated" date below indicates the most recent revision.
              </p>
            </div>

            <div className="pt-8 border-t text-center text-sm text-muted-foreground">
              Last updated: May 2026
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
