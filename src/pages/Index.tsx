import Navigation from "../components/Navigation";
import Hero from "../components/Hero";
import FeaturedTrips from "../components/FeaturedTrips";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Navigation />
      <Hero />
      <FeaturedTrips />
    </main>
  );
};

export default Index;