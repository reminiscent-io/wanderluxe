import Navigation from "../components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Plane, Car } from "lucide-react";

const timelineEvents = [
  {
    id: 1,
    date: "Day 1",
    title: "Arrival in Naples",
    description: "Land at Naples International Airport and transfer to Amalfi Coast",
    image: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?q=80&w=2574&auto=format&fit=crop",
    hotel: "Grand Hotel Vesuvio",
    hotelDetails: "5-star luxury hotel with sea views",
    activities: [
      "Check-in at 3 PM",
      "Welcome dinner at Caruso Roof Garden Restaurant",
      "Evening walking tour of Naples historic center"
    ]
  },
  {
    id: 2,
    date: "Day 2",
    title: "Positano Exploration",
    description: "Explore the vertical town of Positano, visit beaches and local boutiques",
    image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=2566&auto=format&fit=crop",
    hotel: "Le Sirenuse",
    hotelDetails: "Luxury hotel in the heart of Positano",
    activities: [
      "Morning yoga on the terrace",
      "Private cooking class with local chef",
      "Beach club access at La Spaggia"
    ]
  },
  {
    id: 3,
    date: "Day 3",
    title: "Ravello and Villa Rufolo",
    description: "Visit the stunning gardens of Villa Rufolo and enjoy a classical concert",
    image: "https://images.unsplash.com/photo-1633321088355-d0f81134ca3b?q=80&w=2565&auto=format&fit=crop",
    hotel: "Palazzo Avino",
    hotelDetails: "Historic 12th-century villa",
    activities: [
      "Morning garden tour",
      "Afternoon classical concert",
      "Sunset dinner at Rossellinis Restaurant"
    ]
  }
];

const transportationConnections = [
  {
    id: 1,
    from: 1,
    to: 2,
    type: "car",
    details: "Private luxury transfer",
    duration: "1.5 hours",
    icon: Car
  },
  {
    id: 2,
    from: 2,
    to: 3,
    type: "plane",
    details: "Scenic air transfer",
    duration: "15 minutes",
    icon: Plane
  }
];

const TripDetails = () => {
  const renderTransportIcon = (IconComponent: typeof Car | typeof Plane) => {
    return <IconComponent className="h-6 w-6 text-earth-500" />;
  };

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

      {/* Flight Details */}
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Outbound Flight</h3>
                <p className="text-earth-500">American Airlines AA123</p>
                <p>JFK → NAP</p>
              </div>
              <Plane className="h-8 w-8 text-earth-500" />
              <div>
                <p className="font-semibold">June 1, 2024</p>
                <p>Departure: 18:30</p>
                <p>Arrival: 09:45 +1</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Section */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-earth-500 mb-8">Trip Timeline</h2>
        <div className="space-y-12">
          {timelineEvents.map((event, index) => (
            <div key={event.id}>
              <motion.div
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
                      <div className="p-6 flex flex-col justify-between">
                        <div>
                          <div className="text-sm font-semibold text-earth-500 mb-2">
                            {event.date}
                          </div>
                          <h3 className="text-2xl font-bold mb-2">{event.title}</h3>
                          <p className="text-gray-600 mb-4">{event.description}</p>
                          
                          {/* Hotel Details */}
                          <div className="mb-4">
                            <h4 className="font-semibold text-earth-500">Accommodation</h4>
                            <p className="font-medium">{event.hotel}</p>
                            <p className="text-sm text-gray-600">{event.hotelDetails}</p>
                          </div>
                          
                          {/* Activities */}
                          <div>
                            <h4 className="font-semibold text-earth-500">Activities</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600">
                              {event.activities.map((activity, i) => (
                                <li key={i}>{activity}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Transportation Connection */}
              {index < timelineEvents.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="my-4"
                >
                  <Card className="max-w-md mx-auto">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {transportationConnections[index].icon && 
                          renderTransportIcon(transportationConnections[index].icon)
                        }
                        <div>
                          <p className="font-medium">{transportationConnections[index].details}</p>
                          <p className="text-sm text-gray-600">Duration: {transportationConnections[index].duration}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Return Flight */}
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Return Flight</h3>
                <p className="text-earth-500">American Airlines AA124</p>
                <p>NAP → JFK</p>
              </div>
              <Plane className="h-8 w-8 text-earth-500" />
              <div>
                <p className="font-semibold">June 4, 2024</p>
                <p>Departure: 11:30</p>
                <p>Arrival: 15:45</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TripDetails;