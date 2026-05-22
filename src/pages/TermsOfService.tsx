import React from 'react';
import { Link } from 'react-router-dom';
import SEO from "../components/SEO";

const TermsOfService: React.FC = () => {
  return (
    <>
      <SEO
        title="Terms of Service"
        description="Terms of Service for WanderLuxe: the rules and guidelines for using our travel planning platform."
        canonicalPath="/terms"
      />
      <div className="bg-background min-h-screen pt-[var(--app-nav-h,4rem)]">
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="mx-auto max-w-3xl">
            <header className="mb-12 md:mb-16">
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-earth-400 mb-4">
                Legal
              </p>
              <h1 className="font-display text-4xl md:text-5xl text-earth-600 leading-[1.05]">
                Terms of Service.
              </h1>
              <p className="mt-4 font-sans text-sm text-earth-400">
                Last updated May 2026.
              </p>
            </header>

            <section className="space-y-12 text-sm leading-relaxed text-muted-foreground">
              <div className="pb-8 border-b border-border/60">
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  1. Overview of Services
                </h2>
                <p>
                  Welcome to <strong>WanderLuxe</strong> (the "Site"), owned and operated by <strong>Wanderluxe Travel LLC</strong> ("we," "us," or "our"). By accessing or using the Site, you agree to be bound by these Terms of Service ("Terms"). If you do not agree, please do not use the Site.
                </p>
                <p className="mt-3">
                  WanderLuxe provides travel-related services, content, and features including trip planning tools, travel itineraries, AI-powered travel assistance, and integration with third‑party services. We use <strong>Supabase</strong> for authentication and data storage, and offer <strong>Google Sign‑In</strong> as an option. Additional third‑party APIs (such as weather data, location services, and AI services) may also be used.
                </p>
              </div>

              <div className="pb-8 border-b border-border/60">
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  2. Eligibility and Accounts
                </h2>
                <p>
                  You must be at least the age of majority in your jurisdiction to use the Site. By creating an account, you represent that all information provided is accurate and complete. You are responsible for maintaining the confidentiality of your account credentials and for any activities that occur under your account.
                </p>
                <p className="mt-3">
                  If you sign in via Google, you agree to Google's terms and authorize us to access your basic account information.
                </p>
              </div>

              <div className="pb-8 border-b border-border/60">
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  3. Privacy and Data Collection
                </h2>
                <p>
                  We collect only the data necessary to provide our services, including basic account details and analytics via Google Analytics and PostHog (which also captures consent-gated session recordings). We do not sell your personal information. For full details on what is collected, how it is used, and how to manage your preferences, please review our{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>.
                </p>
              </div>

              <div className="pb-8 border-b border-border/60">
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  4. AI-Powered Services and Document Processing
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-display text-lg md:text-xl mb-2 text-foreground">
                      AI Travel Assistant
                    </h3>
                    <p>
                      WanderLuxe provides an AI-powered travel assistant powered by <strong>Google's Gemini 2.5 Flash</strong> model to provide personalized travel recommendations, suggestions, and information. Your conversations with the AI assistant, along with trip context (destination, dates, itinerary) used to ground the responses, are sent to Google's Gemini API and are subject to Google's terms of use and privacy policies. Per Google's paid API terms, your prompts and responses are not used to train their models.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-display text-lg md:text-xl mb-2 text-foreground">
                      Receipt and Document Analysis
                    </h3>
                    <p>
                      Our platform includes receipt analysis functionality powered by <strong>Google's Gemini 2.5 Flash</strong> vision model. When you upload receipts, booking confirmations, or other travel documents, they are:
                    </p>
                    <ul className="list-disc ml-6 mt-3 space-y-1.5">
                      <li>Securely stored on our servers using Supabase storage infrastructure</li>
                      <li>Processed by Google's Gemini API to extract travel-related information</li>
                      <li>Accessible only to you and authorized WanderLuxe systems</li>
                      <li>Subject to both our privacy practices and Google's data usage policies for the Gemini API</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-display text-lg md:text-xl mb-2 text-foreground">
                      Data Processing and Storage
                    </h3>
                    <p>By uploading documents or using AI features, you acknowledge that:</p>
                    <ul className="list-disc ml-6 mt-3 space-y-1.5">
                      <li>Uploaded documents are stored securely on our servers with encryption</li>
                      <li>Document content may be shared with AI service providers for processing</li>
                      <li>We implement appropriate security measures but cannot guarantee absolute security</li>
                      <li>You should not upload documents containing highly sensitive information like social security numbers or full financial account details</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pb-8 border-b border-border/60">
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  5. Third‑Party APIs and Services
                </h2>
                <p>
                  Our Site integrates with various third‑party services and APIs including but not limited to Google (Gemini API, Places API, and mapping providers), Stripe (payments), SendGrid (transactional email), PostHog and Google Analytics (analytics and session replay), and Unsplash (imagery). Your use of these services is subject to their respective terms and conditions. We do not control these third‑party services and are not responsible for their availability, accuracy, or practices.
                </p>
              </div>

              <div className="pb-8 border-b border-border/60">
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  6. User Conduct
                </h2>
                <p>
                  You agree to use the Site in a lawful manner and not to engage in any activity that could harm the Site or other users. We reserve the right to suspend or terminate your account for violations of these Terms.
                </p>
              </div>

              <div className="pb-8 border-b border-border/60">
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  7. Intellectual Property
                </h2>
                <p>
                  All content on the Site, excluding user‑submitted content, is owned by or licensed to Wanderluxe Travel LLC. You may not reproduce, distribute, or create derivative works without our explicit permission.
                </p>
                <p className="mt-3">
                  "WanderLuxe" and associated logos are trademarks of Wanderluxe Travel LLC.
                </p>
              </div>

              <div className="pb-8 border-b border-border/60">
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  8. Disclaimer of Warranties
                </h2>
                <p>
                  The Site and all its services are provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind. We do not guarantee the accuracy, reliability, or availability of the Site.
                </p>
              </div>

              <div className="pb-8 border-b border-border/60">
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  9. Limitation of Liability
                </h2>
                <p>
                  To the fullest extent permitted by law, Wanderluxe Travel LLC shall not be liable for any direct, indirect, incidental, or consequential damages arising out of your use of the Site. Our total liability is limited to any fees paid by you in the six months preceding the claim, if any.
                </p>
              </div>

              <div className="pb-8 border-b border-border/60">
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  10. Indemnification
                </h2>
                <p>
                  You agree to indemnify and hold harmless Wanderluxe Travel LLC and its affiliates from any claims, damages, or expenses arising from your use of the Site or breach of these Terms.
                </p>
              </div>

              <div className="pb-8 border-b border-border/60">
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  11. Termination
                </h2>
                <p>
                  We reserve the right to suspend or terminate your access to the Site at any time, without notice, for any reason including violation of these Terms. Upon termination, you must immediately cease using the Site.
                </p>
              </div>

              <div className="pb-8 border-b border-border/60">
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  12. Changes to These Terms
                </h2>
                <p>
                  We may modify these Terms at any time. Changes will be posted on the Site, and your continued use of the Site after such changes constitutes your acceptance of the updated Terms.
                </p>
              </div>

              <div className="pb-8 border-b border-border/60">
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  13. Governing Law
                </h2>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the state and federal courts located in Albany County, New York.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl md:text-3xl mb-4 text-foreground leading-snug">
                  14. Contact Us
                </h2>
                <p>
                  Questions or concerns about these Terms? Reach us at{' '}
                  <a href="mailto:info@wanderluxe.io" className="text-primary hover:underline">
                    info@wanderluxe.io
                  </a>.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsOfService;
