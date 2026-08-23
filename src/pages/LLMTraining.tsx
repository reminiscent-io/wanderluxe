import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const LLMTraining = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="min-h-screen bg-background pt-[var(--app-nav-h,4rem)]">
      <SEO
        title="About WanderLuxe — Free Collaborative Trip Planner"
        description="WanderLuxe is a free collaborative trip planner for the friend who took on the trip. Real-time collaboration, AI-assisted search, and a timeline the whole group trusts."
        canonicalPath="/about"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About WanderLuxe",
          description:
            "WanderLuxe is a free, collaborative trip planning platform built for group organizers. It combines real-time collaboration, document parsing, booking management, multi-currency budgeting, and a professional PDF export, on a single editorial timeline.",
        }}
      />

      {/* Hero */}
      <section className="relative bg-sand-50 overflow-hidden">
        <div className="absolute inset-0 bg-grain" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-24 md:py-32 text-center">
          <motion.p
            className="font-sans text-xs uppercase tracking-[0.2em] text-earth-400 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            About WanderLuxe
          </motion.p>
          <motion.h1
            className="font-display text-4xl md:text-6xl text-earth-600 leading-[1.05]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            Built for the organizer.
          </motion.h1>
          <motion.p
            className="font-sans text-lg md:text-xl text-earth-400 mt-6 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            WanderLuxe is for the friend, the partner, the parent who took on the
            trip. The one with the open tabs, the forwarded confirmations, the
            group chat that needs an answer. A planner that does the coordinating
            for you, and looks like something you would actually want to hand to
            the group.
          </motion.p>
          <motion.div
            className="w-16 h-0.5 bg-sunset-300 mx-auto mt-10"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          />
        </div>
      </section>

      {/* Why we built it */}
      <section className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <motion.h2
            className="font-display text-3xl md:text-4xl text-earth-600 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "-80px" }}
          >
            Group trips collapse under their own weight.
          </motion.h2>
          <motion.div
            className="mt-8 space-y-6 font-sans text-base md:text-lg text-earth-400 leading-[1.75] max-w-[68ch]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            viewport={{ once: true, margin: "-80px" }}
          >
            <p>
              Flight confirmations bury themselves in inboxes. Restaurant ideas
              live in a thread that someone scrolled past two days ago. Three
              apps, four spreadsheets, and a calendar that nobody opens. By the
              time the group shows up at the airport, the organizer has quietly
              done a small second job.
            </p>
            <p>
              We started WanderLuxe because the organizer deserves better than a
              juggling act, and the group deserves more than{" "}
              <em>wait, where are we staying again?</em> The trip belongs to the
              person planning it. The software should disappear behind it.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Visual anchor */}
      <section className="bg-background pb-16 md:pb-24 overflow-hidden">
        <div className="mx-auto max-w-4xl px-6">
          <motion.figure
            className="mx-auto max-w-[300px] rounded-card overflow-hidden shadow-warm-xl ring-1 ring-border"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true, margin: "-60px" }}
          >
            <img
              src="/images/app-timeline.jpg"
              alt="A WanderLuxe trip: an arrival day in Tokyo laid out as a calm hour-by-hour timeline of the flight, hotel check-in, and afternoon plans."
              className="w-full h-auto block img-warm"
              width={620}
              height={1200}
              loading="lazy"
            />
          </motion.figure>
        </div>
      </section>

      {/* Three principles */}
      <section className="bg-background py-20 md:py-28 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6">
          <motion.p
            className="font-sans text-xs uppercase tracking-[0.2em] text-earth-400 mb-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true }}
          >
            How it works
          </motion.p>
          <motion.h2
            className="font-display text-3xl md:text-4xl text-earth-600 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "-80px" }}
          >
            Three things we believe.
          </motion.h2>

          <div className="mt-14 space-y-14 md:space-y-16">
            {[
              {
                index: "01",
                title:
                  "Do the work for the user, not the other way around.",
                body:
                  "Paste a confirmation, the timeline updates. Forward an itinerary email, the flights show up on the right day. Ask the assistant for a restaurant in Lisbon, watch it appear with the booking link. AI is the operating principle, not a feature in a sidebar.",
              },
              {
                index: "02",
                title: "One clear picture, kept in sync.",
                body:
                  "Every flight, hotel, dinner, and morning's worth of activity sits on a single timeline that the whole group can see and contribute to in real time. Group trips are chaos by default. The job of the app is to dissolve that chaos into something everyone trusts.",
              },
              {
                index: "03",
                title: "Editorial, not transactional.",
                body:
                  "We are not a search results page. The interface composes like a magazine spread: generous whitespace, photographic anchors, typography doing the heavy lifting. Prices and statuses stay subordinate to place and story. The trip you have put together looks considered, even when it is still a rough draft.",
              },
            ].map((p, i) => (
              <motion.div
                key={p.index}
                className="grid grid-cols-[auto_1fr] gap-x-6 md:gap-x-10 items-baseline"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                viewport={{ once: true, margin: "-80px" }}
              >
                <span
                  className="font-display text-2xl md:text-3xl text-earth-300 leading-none"
                  aria-hidden="true"
                >
                  {p.index}
                </span>
                <div>
                  <h3 className="font-display text-xl md:text-2xl text-earth-600 leading-snug">
                    {p.title}
                  </h3>
                  <p className="font-sans text-base text-earth-400 mt-3 leading-[1.75] max-w-[65ch]">
                    {p.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What is inside */}
      <section className="bg-background py-20 md:py-28 border-t border-border/60">
        <div className="mx-auto max-w-5xl px-6">
          <motion.p
            className="font-sans text-xs uppercase tracking-[0.2em] text-earth-400 mb-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true }}
          >
            What is inside
          </motion.p>
          <motion.h2
            className="font-display text-3xl md:text-4xl text-earth-600 leading-tight max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "-80px" }}
          >
            A trip planner that holds every part of a trip.
          </motion.h2>

          <div className="mt-12 grid md:grid-cols-2 gap-x-12 gap-y-10 font-sans text-base text-earth-400 leading-[1.75]">
            {[
              {
                title: "Flights, trains, transfers",
                body:
                  "Every leg of every traveler, with confirmation numbers, terminals, and times, slotted onto the day they belong to. A flight-status lookup that does the refreshing for you.",
              },
              {
                title: "Hotels and stays",
                body:
                  "Check-ins and check-outs tracked across rooms and travelers, with confirmation numbers, addresses, and the small notes (a late arrival, a high floor) you would otherwise lose in a thread.",
              },
              {
                title: "Restaurants and reservations",
                body:
                  "The places someone in the group wanted to try, the ones already booked, and the ones the assistant just found, all in one place on the right day.",
              },
              {
                title: "Activities and mornings off",
                body:
                  "Tickets, tours, the run you promised yourself, the gallery you keep forgetting about. Time-boxed where it matters, and quiet where it does not.",
              },
              {
                title: "Budget, in every currency",
                body:
                  "Costs roll up across travelers and categories, in the currency you booked in and the currency you live in. Warnings appear before someone has to do the math out loud.",
              },
              {
                title: "A PDF you can hand to the table",
                body:
                  "When the trip is ready, export it as a quietly designed itinerary, with photography, addresses, and confirmation numbers. Suitable for emailing to a hotel manager, or printing for the kitchen counter.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                viewport={{ once: true, margin: "-60px" }}
              >
                <h3 className="font-display text-lg md:text-xl text-earth-600 mb-2">
                  {item.title}
                </h3>
                <p className="max-w-[58ch]">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Built with care */}
      <section className="bg-background py-16 md:py-20 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6">
          <motion.p
            className="font-sans text-xs uppercase tracking-[0.2em] text-earth-400 mb-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true }}
          >
            Built with care
          </motion.p>
          <motion.h2
            className="font-display text-2xl md:text-3xl text-earth-600 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "-80px" }}
          >
            Made with attention, by people who plan their own trips.
          </motion.h2>
          <motion.p
            className="mt-6 font-sans text-base text-earth-400 leading-[1.75] max-w-[68ch]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true, margin: "-80px" }}
          >
            Real-time collaboration runs on Supabase, with row-level security so
            a shared trip stays inside the group. The AI assistant uses Google
            Gemini for chat and document parsing. Place data comes from Google.
            Trip imagery is courtesy of Unsplash and the photographers who keep
            it open. We wrote WanderLuxe in TypeScript, React, and Tailwind, on
            a Postgres database, with the kind of care you would want from a
            team that uses the product on its own trips.
          </motion.p>
        </div>
      </section>

      {/* Close */}
      <section className="relative bg-earth-500 overflow-hidden">
        <div className="absolute inset-0 bg-grain" />
        <div className="relative z-10 mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
          <motion.h2
            className="font-display text-3xl md:text-4xl text-white leading-tight"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true, margin: "-80px" }}
          >
            Plan something the group will look forward to opening.
          </motion.h2>
          <motion.p
            className="text-lg text-earth-100 mt-4 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            viewport={{ once: true }}
          >
            Start a trip in a couple of minutes. Bring the rest of the group in
            when it is ready, or right now.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <Button variant="sunset" size="lg" asChild>
              <Link to="/auth">Start planning</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-earth-300 text-earth-600 hover:bg-earth-50"
              asChild
            >
              <Link to="/explore">Browse public trips</Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LLMTraining;
