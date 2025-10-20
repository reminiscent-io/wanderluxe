
import Navigation from "../components/Navigation";
import Hero from "../components/Hero";
import Footer from "../components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen flex flex-col">
      <Navigation />
      <Hero />
      <div className="w-full text-center mb-8 bg-[#f5f0e6] p-8">
        <h2 className="text-sm font-semibold mb-2">About WanderLuxe</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-3xl mx-auto">
          WanderLuxe is your all-in-one free travel planning companion that lets you create, customize, and share detailed trip itineraries. Plan your accommodations, activities, dining experiences, and transportation seamlessly. Collaborate with fellow travelers and keep all your travel details organized in one place.
        </p>
        <a 
          href="/explore"
          className="inline-block px-6 py-2 bg-earth-500 text-white text-sm font-medium rounded-full hover:bg-earth-600 transition-colors"
        >
          Explore Now
        </a>
      </div>
      <Footer />
    </main>
  );
};

export default Index;
