
import Navigation from "../components/Navigation";
import Hero from "../components/Hero";
import FeaturedTrips from "../components/FeaturedTrips";
import Footer from "../components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen flex flex-col">
      <Navigation />
      <Hero />
      <FeaturedTrips />
      <Footer />
    </main>
  );
};

export default Index;
