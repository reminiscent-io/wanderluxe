import React from 'react';
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";

const TermsOfService: React.FC = () => {
  return (
    <main className="min-h-screen flex flex-col">
      <Navigation />
      <div className="container mx-auto px-4 md:px-6 py-12 flex-grow">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Terms of Service for WanderLuxe
          </h1>

          <section className="space-y-10">
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. Overview of Services</h2>
              <p>
                Welcome to <strong>WanderLuxe</strong> (the "Site"), owned and operated by <strong>Reminiscent Technologies LLC</strong> ("we," "us," or "our"). By accessing or using the Site, you agree to be bound by these Terms of Service ("Terms"). If you do not agree, please do not use the Site.
              </p>
              <p>
                WanderLuxe provides travel-related services, content, and features including trip planning tools, travel itineraries, and integration with third‑party services. We use <strong>Supabase</strong> for authentication and data storage, and offer <strong>Google Sign‑In</strong> as an option. Additional third‑party APIs (such as weather data and location services) may also be used.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. Eligibility and Accounts</h2>
              <p>
                You must be at least the age of majority in your jurisdiction to use the Site. By creating an account, you represent that all information provided is accurate and complete. You are responsible for maintaining the confidentiality of your account credentials and for any activities that occur under your account.
              </p>
              <p>
                If you sign in via Google, you agree to Google’s terms and authorize us to access your basic account information.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. Privacy and Data Collection</h2>
              <p>
                We collect only the data necessary to provide our services, including basic account details and standard analytics via Google Analytics. We do not sell your personal information. For more details, please review our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. Third‑Party APIs and Services</h2>
              <p>
                Our Site integrates with various third‑party services and APIs. Your use of these services is subject to their respective terms and conditions. We do not control these third‑party services.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. User Conduct</h2>
              <p>
                You agree to use the Site in a lawful manner and not to engage in any activity that could harm the Site or other users. We reserve the right to suspend or terminate your account for violations of these Terms.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. Intellectual Property</h2>
              <p>
                All content on the Site, excluding user‑submitted content, is owned by or licensed to Reminiscent Technologies LLC. You may not reproduce, distribute, or create derivative works without our explicit permission.
              </p>
              <p>
                “WanderLuxe” and associated logos are trademarks of Reminiscent Technologies LLC.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. Disclaimer of Warranties</h2>
              <p>
                The Site and all its services are provided on an “AS IS” and “AS AVAILABLE” basis without warranties of any kind. We do not guarantee the accuracy, reliability, or availability of the Site.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, Reminiscent Technologies LLC shall not be liable for any direct, indirect, incidental, or consequential damages arising out of your use of the Site. Our total liability is limited to any fees paid by you in the six months preceding the claim, if any.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">9. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless Reminiscent Technologies LLC and its affiliates from any claims, damages, or expenses arising from your use of the Site or breach of these Terms.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">10. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your access to the Site at any time, without notice, for any reason including violation of these Terms. Upon termination, you must immediately cease using the Site.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">11. Changes to These Terms</h2>
              <p>
                We may modify these Terms at any time. Changes will be posted on the Site, and your continued use of the Site after such changes constitutes your acceptance of the updated Terms.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">12. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the state and federal courts located in Albany County, New York.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">13. Contact Us</h2>
              <p>
                If you have any questions or concerns regarding these Terms, please contact us at{' '}
                <a href="mailto:info@wanderluxe.io" className="text-primary hover:underline">
                  info@wanderluxe.io
                </a>.
              </p>
            </div>
            <div className="pt-8 border-t text-center text-sm text-muted-foreground">
              Last updated: February 2025
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default TermsOfService;
