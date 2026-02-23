import { motion } from "framer-motion";

const AppShowcase = () => {
  return (
    <section className="bg-background py-16 md:py-24 overflow-hidden">
      <div className="mx-auto max-w-5xl px-6">
        <motion.p
          className="text-center font-sans text-sm uppercase tracking-widest text-earth-400 mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          See it in action
        </motion.p>
        <div className="flex justify-center items-end gap-4 md:gap-8">
          {/* Trip overview screenshot */}
          <motion.div
            className="w-[45%] max-w-[280px] -rotate-3"
            initial={{ opacity: 0, y: 40, rotate: 0 }}
            whileInView={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            viewport={{ once: true, margin: "-60px" }}
          >
            <div className="rounded-2xl overflow-hidden shadow-warm-xl ring-1 ring-earth-100">
              <img
                src="/images/example trip.jpeg"
                alt="WanderLuxe trip overview showing a Paris itinerary with hero photo and timeline"
                className="w-full h-auto block img-warm"
                loading="lazy"
              />
            </div>
          </motion.div>

          {/* Day detail screenshot */}
          <motion.div
            className="w-[45%] max-w-[280px] rotate-2"
            initial={{ opacity: 0, y: 40, rotate: 0 }}
            whileInView={{ opacity: 1, y: 0, rotate: 2 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            viewport={{ once: true, margin: "-60px" }}
          >
            <div className="rounded-2xl overflow-hidden shadow-warm-xl ring-1 ring-earth-100">
              <img
                src="/images/example day.jpeg"
                alt="WanderLuxe day view showing morning activities, dining, and accommodations"
                className="w-full h-auto block img-warm"
                loading="lazy"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AppShowcase;
