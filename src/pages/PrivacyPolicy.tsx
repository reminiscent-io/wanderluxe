
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
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. Data Collection</h2>
              <p>
                We collect only the data necessary to provide our services, including basic account details and standard analytics via Google Analytics. We do not sell your personal information.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. Use of Information</h2>
              <p>
                The information we collect is used to improve our services, personalize your experience, and provide the core functionality of WanderLuxe.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. Data Security</h2>
              <p>
                We implement appropriate security measures to protect your personal information from unauthorized access, alteration, or disclosure.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. Third-Party Services</h2>
              <p>
                We use trusted third-party services for authentication and analytics. These services have their own privacy policies and data handling practices.
              </p>
            </div>
            <div className="pb-6 border-b">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. Your Rights</h2>
              <p>
                You have the right to access, correct, or delete your personal information. Contact us if you wish to exercise these rights.
              </p>
            </div>
            <div className="pt-8 border-t text-center text-sm text-muted-foreground">
              Last updated: February 2024
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default PrivacyPolicy;
