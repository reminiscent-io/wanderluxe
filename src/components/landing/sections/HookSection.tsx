import { motion } from "framer-motion";

const HookSection = () => {
  return (
    <section className="relative bg-sand-50 overflow-hidden">
      <div className="absolute inset-0 bg-grain" />
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-24 md:py-32 text-center">
        <motion.h2
          className="font-display text-3xl md:text-5xl text-earth-600 leading-tight"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          Your journey deserves more than a spreadsheet.
        </motion.h2>
        <motion.p
          className="font-sans text-lg md:text-xl text-earth-400 mt-6 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          One itinerary holds the flights, the hotels, the dinner you booked
          back in March. Everyone traveling with you can see it, and change it.
        </motion.p>
        <motion.div
          className="w-16 h-0.5 bg-sunset-300 mx-auto mt-10"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
        />
      </div>
    </section>
  );
};

export default HookSection;
