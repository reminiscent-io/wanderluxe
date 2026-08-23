import { motion } from "framer-motion";

const values = [
  {
    headline: "Plan together, in real time",
    body: "Share a trip with anyone, to view or to edit. When someone books a hotel or pushes dinner back an hour, everyone else sees it happen.",
  },
  {
    headline: "Every trip you\u2019ve ever taken, in one place",
    body: "Trips don\u2019t disappear when you get home. Next year you can still pull up the confirmation number, the restaurant you loved, and what you did on day three.",
  },
  {
    headline: "AI that handles the busywork",
    body: "Drop in a screenshot or PDF of a confirmation email and it comes back as itinerary items you can add with one tap. Ask for a dinner spot near your hotel and get real places with working links.",
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
