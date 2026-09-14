import { useEffect, useRef, useState, useMemo, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import UnsplashImage from "./UnsplashImage";
import LogoFromSupabase from "./LogoFromSupabase";
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

const LOGO_CLASS =
  "h-auto w-[min(60vw,300px)] drop-shadow-[0_2px_12px_rgba(33,31,27,0.45)]";

/**
 * Landing hero.
 *
 * Two layouts, chosen by CSS alone so the prerendered HTML is identical at
 * every width:
 *
 * - Phones (under `md`): a split. The slideshow fills the top half of the
 *   screen with the wordmark over it; the headline, the lede and the button
 *   sit on cream paper beneath, where they read without a scrim and the
 *   button lands in thumb reach. On most phones the section ends short of the
 *   fold, so the featured itineraries peek in and say "keep going" better
 *   than a bouncing chevron did.
 * - `md` and up: the photograph fills the viewport below the fixed header and
 *   the copy sits over it. Wide screens have the room for that. (A plain
 *   100vh here put the last 64px, chevron included, under the fold.)
 *
 * The split is fixed from first paint rather than collapsing on a timer once
 * the slideshow advances. A layout that moves on its own counts as layout
 * shift, moves the button while someone is reaching for it, and most phone
 * visitors have scrolled before the first crossfade anyway.
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
      className="relative w-full overflow-hidden md:h-[var(--hero-h)]"
      style={
        {
          "--hero-h":
            "calc(var(--app-height, 1vh) * 100 - var(--app-nav-h, 64px))",
        } as CSSProperties
      }
    >
      {/*
        The photograph. Half the screen on a phone (svh, so it holds still while
        the browser chrome collapses on scroll; plain vh for browsers without
        it), the whole viewport on md+.
      */}
      <div className="relative h-[50vh] min-h-[300px] overflow-hidden supports-[height:1svh]:h-[50svh] md:absolute md:inset-0 md:h-auto md:min-h-0">
        <div ref={parallaxRef} className="absolute inset-0">
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
                  objectPosition="center center"
                  alt={`Travel destination photographed by ${current.photographer} on Unsplash`}
                  showAttribution={false}
                />
              </motion.div>

              {/* Scrim. On a phone only the wordmark sits on the photo, so it
                  stays light; on md+ there is a headline to read over it. */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-black/45 md:from-black/30 md:via-black/40 md:to-black/60" />

              {/* Unsplash attribution — above the gradient scrim */}
              <div className="absolute bottom-4 right-4 z-10 rounded bg-foreground/60 px-2 py-1 text-xs text-background opacity-80 transition-opacity hover:opacity-100 focus-within:opacity-100">
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

        {/* Phone: the wordmark is the photograph's caption. pointer-events-none
            keeps the attribution link under it clickable. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="pointer-events-none relative z-10 flex h-full items-center justify-center md:hidden"
        >
          <LogoFromSupabase
            logoName="White Full"
            className={LOGO_CLASS}
            fallbackClassName="font-display text-3xl text-white"
            fallbackText="WanderLuxe"
          />
        </motion.div>
      </div>

      {/* Copy: on paper under the photograph on a phone, over it on md+. The
          md+ overlay covers the whole photo, so it lets pointer events through
          (the photo credit sits beneath it) and only its content takes them. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10 bg-background px-6 pb-10 pt-8 text-center md:pointer-events-none md:absolute md:inset-0 md:flex md:items-center md:justify-center md:bg-transparent md:p-0"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 sm:gap-7 md:pointer-events-auto md:gap-8 md:px-6">
          {/* md+: the wordmark leads the copy, as before */}
          <LogoFromSupabase
            logoName="White Full"
            className={`hidden md:block ${LOGO_CLASS}`}
            fallbackClassName="hidden md:inline font-display text-4xl text-white"
            fallbackText="WanderLuxe"
          />

          <div className="space-y-3 md:space-y-4">
            <h1 className="font-display text-4xl leading-[1.05] text-earth-600 [text-wrap:balance] sm:text-5xl md:text-6xl md:text-white md:drop-shadow-[0_2px_16px_rgba(33,31,27,0.55)]">
              Plan the trip together.
            </h1>
            {/* earth-500 on cream clears AA at 16px (≈5.8:1); the page's usual
                earth-400 body tone does not (≈3.8:1). */}
            <p className="mx-auto max-w-xl font-sans text-base leading-relaxed text-earth-500 sm:text-lg md:text-white/85 md:drop-shadow-[0_1px_8px_rgba(33,31,27,0.5)]">
              Flights, hotels, dinners and days on one itinerary everyone can see and edit.
              Paste a confirmation and it lands on the right day. Free, with no limit on trips.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:gap-6"
          >
            <Button
              variant="sunset"
              size="lg"
              className="h-12 w-full px-8 text-base shadow-warm-lg sm:w-auto"
              asChild
            >
              <Link to={primaryDestination}>{primaryLabel}</Link>
            </Button>
            <Link
              to="/explore"
              className="rounded-sm text-sm font-medium text-earth-500 underline underline-offset-4 hover:text-earth-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-earth-500 focus-visible:ring-offset-2 md:text-white/90 md:no-underline md:hover:text-white md:hover:underline md:focus-visible:ring-white/70 md:focus-visible:ring-offset-transparent"
            >
              See example itineraries
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll-down hint, md+ only: on a phone the next section peeks in. */}
      <motion.div
        className="absolute bottom-8 left-1/2 z-10 hidden md:block"
        initial={{ opacity: 0, x: "-50%" }}
        animate={{ opacity: 1, x: "-50%", y: [0, 8, 0] }}
        transition={{
          opacity: { delay: 3, duration: 1 },
          y: { delay: 3, duration: 2, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <ChevronDown className="h-8 w-8 text-white/60" />
      </motion.div>
    </section>
  );
};

export default Hero;
