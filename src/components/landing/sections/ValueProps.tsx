import { motion } from "framer-motion";

const values = [
  {
    headline: "Travel is better together",
    body: "Invite friends and family to view or edit your trip. Everyone stays in sync - accommodations, reservations, activities - all in one shared itinerary.",
  },
  {
    headline: "A living scrapbook of everywhere you\u2019ve been",
    body: "WanderLuxe isn\u2019t just for planning the next trip. It\u2019s a home for every place you\u2019ve visited, every restaurant you loved, every adventure that became a story.",
  },
  {
    headline: "AI that helps, not takes over",
    body: "This is a travel for people, not AI bots. We have designed our chat interface to make things easier. Get smart recommendations, parse booking confirmations, and let the latest models do the busywork so you can focus on the journey.",
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
