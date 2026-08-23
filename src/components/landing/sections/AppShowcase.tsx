import type { CSSProperties } from "react";
import { motion } from "framer-motion";

const shots = [
  {
    src: "/images/app-trip.jpg",
    caption: "One trip, start to finish",
    alt: "WanderLuxe trip page for Tokyo, Japan showing the cover photo, destination, and travel dates",
    tilt: -3,
  },
  {
    src: "/images/app-timeline.jpg",
    caption: "Timeline, hour by hour",
    alt: "WanderLuxe timeline view showing an arrival day in Tokyo with a flight, hotel check-in, and afternoon activities",
    tilt: -1,
  },
  {
    src: "/images/app-calendar.jpg",
    caption: "Calendar, three days at a glance",
    alt: "WanderLuxe calendar view showing three days of a Tokyo trip in a time grid with activities and an all-day hotel stay",
    tilt: 1,
  },
  {
    src: "/images/app-map.jpg",
    caption: "Map, with the day's route",
    alt: "WanderLuxe map view showing a day of Tokyo stops plotted on a map with a route line between them",
    tilt: 3,
  },
];

const AppShowcase = () => {
  return (
    <section className="bg-background py-16 md:py-24 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6">
        <motion.p
          className="text-center font-sans text-sm uppercase tracking-widest text-earth-400 mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          Inside the app
        </motion.p>

        <ul className="no-scrollbar -mx-6 flex snap-x snap-mandatory list-none gap-4 overflow-x-auto px-6 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0">
          {shots.map((shot, i) => (
            <motion.li
              key={shot.src}
              className="w-[62%] shrink-0 snap-center md:w-auto"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              viewport={{ once: true, margin: "-60px" }}
            >
              <div
                className="overflow-hidden rounded-2xl shadow-warm-xl ring-1 ring-earth-100 md:[transform:rotate(var(--tilt))]"
                style={{ "--tilt": `${shot.tilt}deg` } as CSSProperties}
              >
                <img
                  src={shot.src}
                  alt={shot.alt}
                  width={620}
                  height={1200}
                  className="img-warm block h-auto w-full"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <p className="mt-5 text-center font-sans text-sm text-earth-400 md:mt-6">
                {shot.caption}
              </p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default AppShowcase;
