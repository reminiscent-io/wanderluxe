import { useEffect, useRef, useState, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import UnsplashImage from "./UnsplashImage";
import LogoFromSupabase from "./LogoFromSupabase";
import LandingNav from "./landing/LandingNav";
import EnterHereRing from "./landing/EnterHereRing";
import { useAuth } from "@/contexts/AuthContext";

const SLIDE_MS = 2500; // time each image is shown
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

const Hero = () => {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { session } = useAuth();

  // Send visitors where they can actually act: sign-in first, trips once
  // they're authenticated (avoids bouncing through ProtectedRoute).
  const isSignedIn = Boolean(session);
  const enterDestination = isSignedIn ? "/my-trips" : "/auth";
  const enterLabel = isSignedIn
    ? "Enter — go to My Trips"
    : "Enter — sign in to start planning";

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

            {/* Soft gradient scrim for legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/50" />

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
        <h1 className="sr-only">
          Plan your next trip together — free collaborative itinerary builder
        </h1>
        <p className="sr-only">
          Build, share, and edit travel itineraries with friends. WanderLuxe is a free collaborative trip planner with AI-assisted search to help you find stays, flights, dining, and activities faster.
        </p>
        <div className="space-y-6 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col justify-center items-center w-full px-4"
          >
            <motion.button
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              whileHover={{ scale: 1.03, transition: { duration: 0.25 } }}
              onClick={() => navigate(enterDestination)}
              aria-label={enterLabel}
              className="group relative w-[min(88vw,calc(var(--app-height,1vh)*72),600px)] cursor-pointer rounded-lg border-none bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
            >
              {/* Spinning "ENTER HERE" ring — sized from this button's width
                  (capped by viewport height above) so it always clears both
                  the wordmark and the hero edges */}
              <EnterHereRing />
              <LogoFromSupabase
                logoName="White Full"
                className="relative w-full h-auto mx-auto"
                fallbackClassName="relative text-4xl font-bold text-white sm:text-5xl md:text-6xl lg:text-7xl"
                fallbackText="WanderLuxe"
              />
            </motion.button>
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
