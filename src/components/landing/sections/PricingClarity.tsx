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
  "Simple PDF itinerary and calendar sync",
];

const proFeatures = [
  "Everything in Free",
  "Print Studio: your itinerary as a designed edition",
  "A custom palette, type, and theme for every trip",
  "Every line of copy is yours to rewrite",
  "Early access to new features",
  "Cancel anytime",
];

// Both tiers wear the same quiet treatment. This section is a comparison whose
// point is that planning costs nothing; the sunset button belongs to the
// closing call to action just below, not to an upsell here.
const FeatureList = ({ features }: { features: string[] }) => (
  <ul className="mt-8 space-y-4 list-none ml-0">
    {features.map((f) => (
      <li key={f} className="flex items-start gap-3">
        <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
        <span className="text-earth-500 text-sm">{f}</span>
      </li>
    ))}
  </ul>
);

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
          <h2 className="font-display text-3xl md:text-4xl text-earth-600 [text-wrap:balance]">
            Free for the parts that should be free
          </h2>
          <p className="font-sans text-lg text-earth-500 mt-4 max-w-xl mx-auto leading-relaxed [text-wrap:pretty]">
            Planning, sharing, exporting, and AI chat cost nothing, on as many
            trips as you like. Every trip prints as a simple PDF for free; the
            $3.99 a month buys the Print Studio, which designs the same
            itinerary as a keepsake edition.
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
              <p className="text-sm font-semibold uppercase tracking-wider text-earth-500">
                Free
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl text-earth-600">$0</span>
                <span className="text-earth-500 text-sm">forever</span>
              </div>
              <FeatureList features={freeFeatures} />
              <Button
                variant="outline"
                size="lg"
                className="w-full mt-8"
                asChild
              >
                <Link to="/auth?mode=signup">Start planning, free</Link>
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
            <Card className="p-8 h-full border-earth-200">
              <p className="text-sm font-semibold uppercase tracking-wider text-earth-500">
                Pro
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl text-earth-600">
                  $3.99
                </span>
                <span className="text-earth-500 text-sm">/month</span>
              </div>
              <FeatureList features={proFeatures} />
              <a
                href="#print-studio"
                className="mt-6 inline-block font-sans text-sm text-earth-500 underline underline-offset-4 hover:text-earth-600"
              >
                See what an edition looks like
              </a>
              <Button
                variant="outline"
                size="lg"
                className="w-full mt-8"
                asChild
              >
                <Link to="/auth?mode=signup">Start free, upgrade later</Link>
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PricingClarity;
