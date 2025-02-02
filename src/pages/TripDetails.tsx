import Navigation from "../components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const timelineEvents = [
  {
    id: 1,
    date: "Day 1",
    title: "Arrival in Naples",
    description: "Land at Naples International Airport and transfer to Amalfi Coast",
    image: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?q=80&w=2574&auto=format&fit=crop"
  },
  {
    id: 2,
    date: "Day 2",
    title: "Positano Exploration",
    description: "Explore the vertical town of Positano, visit beaches and local boutiques",
    image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=2566&auto=format&fit=crop"
  },
  {
    id: 3,
    date: "Day 3",
    title: "Ravello and Villa Rufolo",
    description: "Visit the stunning gardens of Villa Rufolo and enjoy a classical concert",
    image: "https://images.unsplash.com/photo-1633321088355-d0f81134ca3b?q=80&w=2565&auto=format&fit=crop"
  }
];

const TripDetails = () => {
  return (
    <div className="min-h-screen bg-sand-50">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative h-[60vh] overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?q=80&w=2574&auto=format&fit=crop"
          alt="Amalfi Coast"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-4">Amalfi Coast</h1>
            <p className="text-xl">June 2024</p>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-earth-500 mb-8">Trip Timeline</h2>
        <div className="space-y-8">
          {timelineEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="h-64 md:h-auto">
                      <img 
                        src={event.image} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6 flex flex-col justify-center">
                      <div className="text-sm font-semibold text-earth-500 mb-2">
                        {event.date}
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{event.title}</h3>
                      <p className="text-gray-600">{event.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TripDetails;