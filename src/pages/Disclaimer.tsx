
import React from 'react';
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";

const Disclaimer = () => {
  return (
    <main className="min-h-screen flex flex-col">
      <Navigation />
      <div className="container mx-auto px-4 md:px-6 py-12 flex-grow">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">Disclaimer for WanderLuxe</h1>
          
          <section className="space-y-10 prose prose-neutral max-w-none">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">General Information</h2>
              <p className="text-muted-foreground">
                This website is owned and operated by Reminiscent Technologies LLC, a limited liability company registered in New York ("we," "us," or "our").
              </p>
              <p className="text-muted-foreground mt-2">
                The information provided on WanderLuxe (the "Website") is for general informational purposes only. All content on this Website is published in good faith and is not intended to be a substitute for professional advice.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">Development Status</h2>
              <p className="text-muted-foreground mb-4">
                Please note that this Website is currently in development mode and is considered a side project for exploration purposes. As such:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>We do not guarantee the accuracy, completeness, or reliability of any information presented on this Website.</li>
                <li>The functionality of the Website may change without notice and may contain errors or inaccuracies.</li>
                <li>We are not responsible for any decisions made based on the information provided on this Website.</li>
              </ul>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">Third-Party Services and Content</h2>
              <p className="text-muted-foreground mb-4">
                Our Website utilizes various third-party services and APIs, including but not limited to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Supabase for user authentication</li>
                <li>Google API for hotel and restaurant information</li>
                <li>Unsplash API for photographs</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                While we strive to ensure the integrity of data pulled from these sources, we cannot guarantee its accuracy or timeliness. Users should verify any critical information independently.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">Affiliate Links</h2>
              <p className="text-muted-foreground">
                In the future, this Website may contain affiliate links. We may earn a commission if you make a purchase through these links. However, this will not result in any additional cost to you.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">Limitation of Liability</h2>
              <p className="text-muted-foreground">
                To the fullest extent permitted by applicable law, Reminiscent Technologies LLC and its officers, employees, agents, and affiliates shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of or relating to your use of, or inability to use, this Website.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">No Warranties</h2>
              <p className="text-muted-foreground">
                This Website and all information, content, materials, products, and services included on or otherwise made available to you through this Website are provided on an "as is" and "as available" basis. We make no representations or warranties of any kind, express or implied, as to the operation of this Website or the information, content, materials, products, or services included on or otherwise made available to you through this Website.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">Changes to This Disclaimer</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify this disclaimer at any time without prior notice. Your continued use of the Website after any changes indicates your acceptance of the modified disclaimer.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">Contact Information</h2>
              <p className="text-muted-foreground">
                If you have any questions about this disclaimer, please contact us at
                <a 
                  href="mailto:info@wanderluxe.io" 
                  className="text-primary hover:underline ml-1"
                >
                  info@wanderluxe.io
                </a>.
              </p>
            </div>

            <div className="text-sm text-muted-foreground pt-8 border-t text-center">
              Last updated: February 2025
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default Disclaimer;
