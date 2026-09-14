import { useEffect, useRef, useState, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import UnsplashImage from "./UnsplashImage";
import LogoFromSupabase from "./LogoFromSupabase";
import LandingNav from "./landing/LandingNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

// A slide holds for six seconds and crossfades over two: an eight-second cycle
// reads as a slow pan through a photo book. The old 2.5 s hold felt like a
// screensaver and pulled the eye off the headline.
const SLIDE_MS = 6000; // time each image is shown
const FADE_MS = 2000;  // crossfade duration

const HERO_IMAGES = [
  { url: "https://images.unsplash.com/photo-1506929562872-bb421503ef21", photographer: "Gaddafi Rusli", username: "gaddafirusli" },
  { url: "https://images.unsplash.com/photo-1541410965313-d53b3c16ef17", photographer: "Jairph", username: "jairph" },
  { url: "https://images.unsplash.com/photo-1649955092030-fb171eda019a", photographer: "Julian Terenzio", username: "julianterenzio" },
  { url: "https://images.unsplash.com/photo-1632937018569-841a551be57a", photographer: "Márcio Pêgo", username: "marciopego" },
  { url: "https://plus.unsplash.com/premium_photo-1722201172121-9ab816dc1c34", photographer: "Lala Azizli", username: "lazizli" },
  { url: "https://images.unsplash.com/photo-1624963053656-cecdf576d028", photographer: "Daniel J. Schwarz", username: "danieljschwarz" },
  { url: "https://images.unsplash.com/photo-1571663237561-397f179622fb", photographer: "Joan Oger", username: "joanoger" },
  { url: "https://images.unsplash.com/photo-1643981670720-eef07ebdb179", photographer: "Henrique Ferreira", username: "rickpsd" },
  { url: "https://images.unsplash.com/photo-1516496636080-14fb876e029d", photographer: "Hu Chen", username: "huchenme" },
  { url: "https://images.unsplash.com/photo-1498036882173-b41c28a8ba34", photographer: "Pawel Nolbert", username: "hellocolor" },
  { url: "https://images.unsplash.com/photo-1541628951107-a9af5346a3e4", photographer: "Thibault Penin", username: "thibaultpenin" },
  { url: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc", photographer: "Nick Karvounis", username: "nickkarvounis" },
  { url: "https://images.unsplash.com/photo-1663841365361-db6ca65ac126", photographer: "Caroline Roose", username: "carolineclementine" },
  { url: "https://images.unsplash.com/photo-1586752488885-6ce47fdfd874", photographer: "Victor He", username: "victorhwn725" },
];

/**
 * Landing hero.
 *
 * The photograph and the wordmark stay; the copy is now visible. A visitor
 * from search used to see a slideshow, a logo and a spinning "Enter here"
 * ring, and had to scroll to learn what the product was. The H1 and the
 * primary button now sit over the photo, with an escape hatch to the
 * showcase itineraries for anyone who wants proof before signing up.
 */
const Hero = () => {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { session } = useAuth();

  // Send visitors where they can actually act: sign-in first, trips once
  // they're authenticated (avoids bouncing through ProtectedRoute).
  const isSignedIn = Boolean(session);
  const primaryDestination = isSignedIn ? "/my-trips" : "/auth";
  const primaryLabel = isSignedIn ? "Go to my trips" : "Start planning, free";

  // Normalize to a consistent size/quality for smoother transitions
  const images = useMemo(
    () =>
      HERO_IMAGES.map((entry) => ({
        ...entry,
        src: entry.url.includes("?")
          ? `${entry.url}&auto=format&fit=crop&w=1920&q=80`
          : `${entry.url}?auto=format&fit=crop&w=1920&q=80`,
      })),
    []
  );

  const [index, setIndex] = useState(0);

  // Subtle parallax on scroll
  useEffect(() => {
    if (prefersReducedMotion) return;
    const handleScroll = () => {
      if (parallaxRef.current) {
        const scrollY = window.scrollY;
        parallaxRef.current.style.transform = `translateY(${scrollY * 0.5}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [prefersReducedMotion]);

  // Auto-advance slideshow
  useEffect(() => {
    if (images.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [images.length]);

  // Preload next image to avoid flashes
  useEffect(() => {
    const next = (index + 1) % images.length;
    const img = new Image();
    img.src = images[next].src;
  }, [index, images]);

  const current = images[index];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: "calc(var(--app-height, 1vh) * 100)" }}
    >
      <LandingNav />

      {/* Background stack with elegant crossfade + Ken Burns */}
      <div
        ref={parallaxRef}
        className="absolute inset-0"
        style={{ minHeight: "calc(var(--app-height, 1vh) * 100)" }}
      >
        <AnimatePresence>
          <motion.div
            key={current.src}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.2 }
                : { duration: FADE_MS / 1000, ease: "easeInOut" }
            }
            style={{ willChange: "opacity, transform" }}
          >
            <motion.div
              className="absolute inset-0"
              initial={prefersReducedMotion ? { scale: 1 } : { scale: 1.02 }}
              animate={prefersReducedMotion ? { scale: 1 } : { scale: 1.08 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.01 }
                  : { duration: (SLIDE_MS + FADE_MS) / 1000, ease: "easeOut" }
              }
              style={{ willChange: "transform" }}
            >
              <UnsplashImage
                src={current.src}
                className="w-full h-full object-cover pointer-events-none select-none"
                style={{ minHeight: "calc(var(--app-height, 1vh) * 100)" }}
                objectPosition="center center"
                alt={`Travel destination photographed by ${current.photographer} on Unsplash`}
                showAttribution={false}
                draggable={false}
              />
            </motion.div>

            {/* Scrim for legibility: heavier than before because there is now
                real copy to read over the photograph. */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60" />

            {/* Unsplash attribution — above the gradient scrim */}
            <div className="absolute bottom-4 right-4 z-10 text-white text-xs bg-black/40 px-2 py-1 rounded backdrop-blur-sm opacity-60 hover:opacity-100 transition-opacity">
              <a
                href={`https://unsplash.com/@${current.username}?utm_source=wanderluxe&utm_medium=referral`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {current.photographer}
              </a>
              {' / '}
              <a
                href="https://unsplash.com?utm_source=wanderluxe&utm_medium=referral"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Unsplash
              </a>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Foreground content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative flex h-full items-center justify-center text-center"
      >
        <div className="flex w-full max-w-3xl flex-col items-center gap-7 px-6 sm:gap-8">
          <LogoFromSupabase
            logoName="White Full"
            className="w-[min(60vw,300px)] h-auto drop-shadow-[0_2px_12px_rgba(33,31,27,0.45)]"
            fallbackClassName="font-display text-3xl text-white sm:text-4xl"
            fallbackText="WanderLuxe"
          />

          <div className="space-y-4">
            <h1 className="font-display text-4xl leading-[1.05] text-white [text-wrap:balance] drop-shadow-[0_2px_16px_rgba(33,31,27,0.55)] sm:text-5xl md:text-6xl">
              Plan the trip together.
            </h1>
            <p className="mx-auto max-w-xl font-sans text-base leading-relaxed text-white/85 drop-shadow-[0_1px_8px_rgba(33,31,27,0.5)] sm:text-lg">
              Flights, hotels, dinners and days on one itinerary everyone can see and edit.
              Paste a confirmation and it lands on the right day. Free, no limits.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
          >
            <Button
              variant="sunset"
              size="lg"
              className="h-12 px-8 text-base shadow-warm-lg"
              onClick={() => navigate(primaryDestination)}
            >
              {primaryLabel}
            </Button>
            <Link
              to="/explore"
              className="text-sm font-medium text-white/90 underline-offset-4 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-sm"
            >
              See an example itinerary
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll-down hint */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { delay: 3, duration: 1 },
          y: { delay: 3, duration: 2, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <ChevronDown className="h-8 w-8 text-white/60" />
      </motion.div>
    </div>
  );
};

export default Hero;
