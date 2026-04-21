import Hero from "../components/Hero";
import WhySignUp from "../components/landing/WhySignUp";
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
        "AI-powered luxury travel planning with real-time collaboration, curated itineraries, and professional PDF export.",
    },
  ];

  return (
    <main className="min-h-screen flex flex-col">
      <SEO
        title="WanderLuxe — AI-powered luxury travel planning"
        description="Plan luxury trips with AI-assisted recommendations, real-time collaboration, and polished itineraries. WanderLuxe makes travel planning effortless."
        canonicalPath="/"
        jsonLd={jsonLd}
      />
      <Hero />
      <WhySignUp />
    </main>
  );
};

export default Index;
