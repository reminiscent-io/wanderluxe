import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FinalCTA = () => {
  return (
    <section className="relative bg-earth-500 overflow-hidden">
      <div className="absolute inset-0 bg-grain" />
      <div className="relative z-10 mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <motion.h2
          className="font-display text-3xl md:text-4xl text-background [text-wrap:balance]"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, margin: "-80px" }}
        >
          Start your next trip
        </motion.h2>
        <motion.p
          className="text-lg text-earth-100 mt-4 leading-relaxed [text-wrap:pretty]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          viewport={{ once: true }}
        >
          Free to start, no credit card, no limit on how many trips you keep.
        </motion.p>
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <Button variant="sunset" size="lg" asChild>
            <Link to="/auth?mode=signup">Start planning, free</Link>
          </Button>
          {/* Outline on the dark band, not a cream fill: a solid cream button
              outshone the rust primary, which sits near the band's lightness. */}
          <Button
            variant="outline"
            size="lg"
            className="border-earth-200 bg-transparent text-background hover:border-earth-100 hover:bg-earth-600 hover:text-background"
            asChild
          >
            <Link to="/explore">Explore trips</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
