import React from 'react';
import Navigation from "../components/Navigation";
import HeroSection from "../components/trip/HeroSection";
import FlightCard from "../components/trip/FlightCard";
import TimelineEvent from "../components/trip/TimelineEvent";
import TransportationCard from "../components/trip/TransportationCard";

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
  },
  {
    id: 2,
    from: 2,
    to: 3,
    type: "plane",
    details: "Scenic air transfer",
    duration: "15 minutes",
  }
];

const TripDetails = () => {
  return (
    <div className="min-h-screen bg-sand-50">
      <Navigation />
      
      <HeroSection 
        title="Amalfi Coast"
        date="June 2024"
        imageUrl="https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?q=80&w=2574&auto=format&fit=crop"
      />

      <div className="container mx-auto px-4 py-8">
        <FlightCard
          type="outbound"
          flightNumber="American Airlines AA123"
          route="JFK → NAP"
          date="June 1, 2024"
          departure="18:30"
          arrival="09:45 +1"
        />
      </div>

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-earth-500 mb-8">Trip Timeline</h2>
        <div className="space-y-12">
          {timelineEvents.map((event, index) => (
            <div key={event.id}>
              <TimelineEvent
                date={event.date}
                title={event.title}
                description={event.description}
                image={event.image}
                hotel={event.hotel}
                hotelDetails={event.hotelDetails}
                activities={event.activities}
                index={index}
              />

              {index < timelineEvents.length - 1 && (
                <TransportationCard
                  type={transportationConnections[index].type as "car" | "plane"}
                  details={transportationConnections[index].details}
                  duration={transportationConnections[index].duration}
                  index={index}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <FlightCard
          type="return"
          flightNumber="American Airlines AA124"
          route="NAP → JFK"
          date="June 4, 2024"
          departure="11:30"
          arrival="15:45"
        />
      </div>
    </div>
  );
};

export default TripDetails;
