import Navigation from "../components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Trip {
  id: number;
  name: string;
  createdAt: string;
}

const MyTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const storedTrips = JSON.parse(localStorage.getItem("trips") || "[]");
    setTrips(storedTrips);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 pt-24">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Trips</h1>
        
        {trips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">You haven't created any trips yet.</p>
            <button
              onClick={() => navigate("/create-trip")}
              className="text-earth-500 hover:text-earth-600 font-medium"
            >
              Create your first trip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/trip/${trip.id}`)}>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {trip.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Created on {new Date(trip.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTrips;