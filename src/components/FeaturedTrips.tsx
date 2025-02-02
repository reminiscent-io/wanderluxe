import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const trips = [
  {
    id: 1,
    title: "Amalfi Coast",
    image: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?q=80&w=2574&auto=format&fit=crop",
    date: "June 2024",
    path: "/trip/amalfi-coast"
  },
  {
    id: 2,
    title: "Swiss Alps",
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=2574&auto=format&fit=crop",
    date: "July 2024",
    path: "/trip/swiss-alps"
  },
  {
    id: 3,
    title: "Kyoto",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2574&auto=format&fit=crop",
    date: "August 2024",
    path: "/trip/kyoto"
  },
];

const FeaturedTrips = () => {
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
            Upcoming Adventures
          </h2>
        </motion.div>
        
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip, index) => (
            <Link to={trip.path} key={trip.id}>
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
                    src={trip.image}
                    alt={trip.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 p-6 text-white">
                  <h3 className="text-xl font-bold">{trip.title}</h3>
                  <p className="mt-2 text-sm text-white/80">{trip.date}</p>
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