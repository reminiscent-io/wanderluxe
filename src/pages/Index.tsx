import Hero from "../components/Hero";
import WhySignUp from "../components/landing/WhySignUp";
import FeaturedDestinations from "../components/landing/FeaturedDestinations";
import SEO, { SITE_URL, DEFAULT_OG_IMAGE } from "../components/SEO";

const Index = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "WanderLuxe",
      url: SITE_URL,
      logo: DEFAULT_OG_IMAGE,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "WanderLuxe",
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/explore?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "WanderLuxe",
      applicationCategory: "TravelApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "Free, collaborative travel itinerary builder with AI-assisted search, real-time collaboration, and professional PDF export.",
    },
  ];

  return (
    <main className="min-h-screen flex flex-col">
      <SEO
        title="WanderLuxe: Free Collaborative Trip Planner & Itinerary Builder"
        description="Plan trips together, for free. WanderLuxe is a collaborative travel itinerary builder with AI-assisted search to help you discover, organize, and share your next trip."
        canonicalPath="/"
        jsonLd={jsonLd}
      />
      <Hero />
      <FeaturedDestinations />
      <WhySignUp />
    </main>
  );
};

export default Index;
