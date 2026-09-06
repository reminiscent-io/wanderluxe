import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const freeFeatures = [
  "Unlimited trips",
  "Unlimited AI chat with the Trip Assistant",
  "20 document imports a day",
  "Share with anyone, to view or edit",
  "Timeline, calendar, and map views",
  "PDF export and calendar sync",
];

const proFeatures = [
  "Everything in Free",
  "Print Studio: keepsake itineraries designed by AI",
  "A custom palette, type, and theme for every trip",
  "Early access to new features",
  "Cancel anytime",
];

const PricingClarity = () => {
  return (
    <section className="relative bg-sand-50 overflow-hidden">
      <div className="absolute inset-0 bg-grain" />
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-20 md:py-28">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-80px" }}
        >
          <h2 className="font-display text-3xl md:text-4xl text-earth-600">
            Free for the parts that should be free
          </h2>
          <p className="font-sans text-lg text-earth-400 mt-4 max-w-xl mx-auto leading-relaxed">
            Planning, sharing, exporting, and AI chat cost nothing, on as many
            trips as you like. The $3.99 unlocks the Print Studio — a keepsake
            itinerary designed by AI around your trip.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Card className="p-8 h-full border-earth-100">
              <p className="text-sm font-semibold uppercase tracking-wider text-earth-400">
                Free
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl text-earth-600">$0</span>
                <span className="text-earth-400 text-sm">forever</span>
              </div>
              <ul className="mt-8 space-y-4 list-none ml-0">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-sunset-500 mt-0.5 shrink-0" />
                    <span className="text-earth-500 text-sm">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="lg"
                className="w-full mt-8"
                asChild
              >
                <Link to="/auth">Sign Up Free</Link>
              </Button>
            </Card>
          </motion.div>

          {/* Pro card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            viewport={{ once: true }}
          >
            <Card className="p-8 h-full border-sunset-200 shadow-warm-lg relative">
              <div className="absolute -top-3 right-6 bg-sunset-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Print Studio
              </div>
              <p className="text-sm font-semibold uppercase tracking-wider text-sunset-600">
                Pro
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl text-earth-600">
                  $3.99
                </span>
                <span className="text-earth-400 text-sm">/month</span>
              </div>
              <ul className="mt-8 space-y-4 list-none ml-0">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-sunset-500 mt-0.5 shrink-0" />
                    <span className="text-earth-500 text-sm">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="sunset"
                size="lg"
                className="w-full mt-8"
                asChild
              >
                <Link to="/auth">Get Started</Link>
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PricingClarity;
