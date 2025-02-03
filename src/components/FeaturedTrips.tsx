import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Info } from "lucide-react";

const FeaturedTrips = () => {
  const { data: trips = [] } = useQuery({
    queryKey: ['featured-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('destination', 'Amalfi Coast')
        .limit(1);  // Changed to limit 1
      
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <section className="bg-sand-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="text-sm font-medium text-earth-500">Featured Destinations</span>
          <h2 className="mt-2 text-3xl font-bold text-earth-500 sm:text-4xl">
            Example Trip Ideas
          </h2>
        </motion.div>
        
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip, index) => (
            <Link to={`/trip/${trip.id}`} key={trip.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group relative overflow-hidden rounded-2xl bg-white shadow-xl"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={trip.cover_image_url || 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?q=80&w=2574&auto=format&fit=crop'}
                    alt={trip.destination}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 p-6 text-white">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold">{trip.destination}</h3>
                    <Info className="h-5 w-5 text-white/80" />
                  </div>
                  <p className="mt-2 text-sm text-white/80">{trip.start_date}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedTrips;