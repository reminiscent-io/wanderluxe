import { useEffect, useRef, useState, useMemo, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import UnsplashImage from "./UnsplashImage";
import LogoFromSupabase from "./LogoFromSupabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { arrivedPrerendered, markPrerenderedMounted } from "@/lib/prerenderedBoot";

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

const LOGO_CLASS =
  "h-auto w-[min(60vw,300px)] drop-shadow-[0_2px_12px_rgba(33,31,27,0.45)]";

/**
 * Landing hero.
 *
 * One layout at every width, so the prerendered HTML is identical: the
 * slideshow fills the hero and the headline, lede and buttons sit on a
 * translucent cream panel over it. The panel is what makes the copy readable,
 * so the photo keeps its colour instead of being darkened under a scrim. On a
 * phone the panel sits at the bottom (thumb reach) and the hero stops short of
 * the fold so the demo below peeks in; on md+ it is centred under the
 * wordmark.
 *
 * The global header already carries Sign In / My Trips, so the hero no longer
 * floats a second copy of that button over the photo.
 */
const Hero = () => {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { session } = useAuth();

  // Send visitors where they can actually act: the create-account form first
  // (/auth on its own opens on sign-in), trips once they're authenticated
  // (avoids bouncing through ProtectedRoute).
  const isSignedIn = Boolean(session);
  const primaryDestination = isSignedIn ? "/my-trips" : "/auth?mode=signup";
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

  // Landing on `/` shows the prerendered hero before React mounts, and
  // createRoot then replaces it with a fresh tree. Replaying the entrance fades
  // on that tree blanked the photo and the copy and faded them back in, so the
  // page loaded twice with a white flash between. Start at the end state
  // instead. Navigating back to `/` later still gets the fades.
  const [skipEntrance] = useState(() => arrivedPrerendered("/"));
  useEffect(() => markPrerenderedMounted(), []);

  // Subtle parallax on scroll. The wrapper only ever moves down by less than
  // the page has scrolled, so the strip it uncovers at the top of the frame
  // is always already off-screen, at either hero height.
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
    <section
      className="relative h-[calc(var(--hero-h)-3.5rem)] min-h-[540px] w-full overflow-hidden md:h-[var(--hero-h)]"
      style={
        {
          "--hero-h":
            "calc(var(--app-height, 1vh) * 100 - var(--app-nav-h, 64px))",
        } as CSSProperties
      }
    >
      {/* The photograph fills the hero at every width. On a phone the hero
          stops 56px short of the fold so the demo below peeks in. */}
      <div className="absolute inset-0 overflow-hidden">
        <div ref={parallaxRef} className="absolute inset-0">
          {/* initial={false} only affects the first slide; later slides still crossfade. */}
          <AnimatePresence initial={!skipEntrance}>
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
                // The root MotionConfig would snap this zoom straight to 1.08;
                // hold the photo at its natural crop instead.
                initial={{ scale: prefersReducedMotion ? 1 : 1.02 }}
                animate={{ scale: prefersReducedMotion ? 1 : 1.08 }}
                transition={{ duration: (SLIDE_MS + FADE_MS) / 1000, ease: "easeOut" }}
                style={{ willChange: "transform" }}
              >
                <UnsplashImage
                  src={current.src}
                  className="w-full h-full object-cover pointer-events-none select-none"
                  objectPosition="center center"
                  alt={`Travel destination photographed by ${current.photographer} on Unsplash`}
                  showAttribution={false}
                />
              </motion.div>

              {/* Light scrim only: the copy sits on its own translucent panel,
                  so the photo no longer has to be darkened for it. */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/35" />

              {/* Unsplash attribution — above the gradient scrim. Plain white
                  text with a shadow for legibility; no chip behind it. Top
                  corner on a phone, where the copy panel sits at the bottom. */}
              <div className="absolute right-3 top-3 z-10 md:bottom-4 md:right-4 md:top-auto text-xs text-white opacity-90 drop-shadow-[0_1px_3px_rgba(33,31,27,0.7)] transition-opacity hover:opacity-100 focus-within:opacity-100">
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

      </div>

      {/* Copy: a translucent cream panel over the photograph, so the image
          shows through and the text still reads at full contrast. On a phone
          it is kept compact, about the bottom third of the hero (thumb reach);
          centred on md+. The wrapper covers the
          whole photo, so it lets pointer events through (the photo credit sits
          beneath it) and only its content takes them. */}
      <motion.div
        initial={skipEntrance ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center p-4 pb-12 text-center md:items-center md:p-6"
      >
        <div className="pointer-events-auto mx-auto flex w-full max-w-2xl flex-col items-center gap-6 md:gap-8">
          {/* md+: the wordmark sits on the photo above the panel */}
          <LogoFromSupabase
            logoName="White Full"
            className={`hidden md:block ${LOGO_CLASS}`}
            fallbackClassName="hidden md:inline font-display text-4xl text-white"
            fallbackText="WanderLuxe"
          />

          <div className="flex w-full flex-col items-center gap-4 rounded-card bg-background/80 px-5 py-5 shadow-warm-xl ring-1 ring-white/50 backdrop-blur-md sm:gap-6 sm:px-6 sm:py-7 md:gap-7 md:px-12 md:py-10">
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            {/* font-display, the same face as "Trip Timeline" and every other
                heading in the app. */}
            <h1 className="font-display text-[1.75rem] leading-[1.05] text-foreground [text-wrap:balance] sm:text-5xl md:text-6xl">
              Plan the trip together
            </h1>
            <p className="mx-auto max-w-xl font-sans text-sm leading-snug text-earth-600 sm:text-lg sm:leading-relaxed">
              Flights, hotels, dinners and days on one itinerary everyone can see and edit.
            </p>
          </div>

          <motion.div
            initial={skipEntrance ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-6"
          >
            <Button
              variant="sunset"
              size="lg"
              className="h-11 w-full px-8 text-base shadow-warm-lg sm:h-12 sm:w-auto"
              asChild
            >
              <Link to={primaryDestination}>{primaryLabel}</Link>
            </Button>
            <Link
              to="/explore"
              className="rounded-sm text-sm font-medium text-earth-600 underline underline-offset-4 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-earth-500 focus-visible:ring-offset-2"
            >
              See example itineraries
            </Link>
          </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scroll-down hint. On a phone it sits in the gap under the panel. It
          bobs three times and then holds still: enough to be noticed, without
          moving forever at the edge of the screen. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 left-1/2 z-10 md:bottom-8"
        initial={{ opacity: skipEntrance ? 1 : 0, x: "-50%" }}
        animate={{ opacity: 1, x: "-50%", y: [0, 8, 0] }}
        transition={{
          opacity: { delay: 3, duration: 1 },
          y: { delay: 3, duration: 2, repeat: 2, ease: "easeInOut" },
        }}
      >
        <ChevronDown className="h-7 w-7 text-white/80 drop-shadow-[0_1px_3px_rgba(33,31,27,0.6)] md:h-8 md:w-8" />
      </motion.div>
    </section>
  );
};

export default Hero;
