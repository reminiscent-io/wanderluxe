import React from 'react';
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";

const PrivacyPolicy: React.FC = () => {
  return (
    <main className="min-h-screen flex flex-col">
      <Navigation />
      <div className="container mx-auto px-4 md:px-6 py-12 flex-grow">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Privacy Policy for WanderLuxe
          </h1>
          <section className="space-y-10">
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. Introduction</h2>
              <p>
                Welcome to <strong>WanderLuxe</strong>, operated by <strong>Reminiscent Technologies LLC</strong>. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. Information We Collect</h2>
              <p>
                We may collect personal data such as your name, email address, and other relevant details when you register for an account or use our services. Additionally, non-personal data is collected automatically via cookies and similar technologies.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. How We Use Your Information</h2>
              <p>
                Your information is used to provide, enhance, and personalize our services, as well as to communicate with you about updates or promotions. We may also use your data for internal analytics.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. Sharing Your Information</h2>
              <p>
                We do not sell your personal information. We may share your data with trusted third-party providers who assist in operating our website and delivering our services, under strict confidentiality agreements.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. Data Security</h2>
              <p>
                We implement various security measures to protect your information. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. Your Rights</h2>
              <p>
                You have the right to access, update, or delete your personal information. If you have any questions or concerns regarding our privacy practices, please contact us at{' '}
                <a href="mailto:info@wanderluxe.io" className="text-primary hover:underline">
                  info@wanderluxe.io
                </a>.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. Cookies and Tracking Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to enhance your experience on our site and to gather data on usage patterns. You can adjust your browser settings to refuse cookies, though this may impact site functionality.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Any changes will be posted on this page along with an updated effective date.
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

export default PrivacyPolicy;
