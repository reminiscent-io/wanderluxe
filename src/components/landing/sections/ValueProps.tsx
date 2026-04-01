import { motion } from "framer-motion";

const values = [
  {
    headline: "Plan together, in real time",
    body: "Share your trip with friends and family. Everyone sees the same itinerary \u2014 hotels, restaurants, activities \u2014 always up to date.",
  },
  {
    headline: "Every trip you\u2019ve ever taken, in one place",
    body: "Not just a planner. WanderLuxe keeps every booking, every favorite restaurant, every adventure \u2014 so you can look back anytime.",
  },
  {
    headline: "AI that handles the busywork",
    body: "Drop in a screenshot or PDF of your booking confirmation. Get restaurant picks for where you\u2019re going. Ask anything about your trip. You stay in control \u2014 AI does the legwork.",
  },
];

const ValueProps = () => {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {values.map((v, i) => (
            <motion.div
              key={v.headline}
              className="text-center md:text-left"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              viewport={{ once: true, margin: "-80px" }}
            >
              <h3 className="font-display text-xl md:text-2xl text-earth-600">
                {v.headline}
              </h3>
              <p className="font-sans text-base text-earth-400 mt-3 leading-relaxed">
                {v.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueProps;
