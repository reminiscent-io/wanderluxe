import { useEffect, useRef, useState, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import UnsplashImage from "./UnsplashImage";
import LogoFromSupabase from "./LogoFromSupabase";

const SLIDE_MS = 4000; // time each image is shown
const FADE_MS = 1200;  // crossfade duration

const Hero = () => {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const rawImages = useMemo(
    () => [
      "https://images.unsplash.com/photo-1506929562872-bb421503ef21",
      "https://images.unsplash.com/photo-1541410965313-d53b3c16ef17",
      "https://images.unsplash.com/photo-1649955092030-fb171eda019a",
      "https://images.unsplash.com/photo-1632937018569-841a551be57a",
      "https://plus.unsplash.com/premium_photo-1722201172121-9ab816dc1c34",
      "https://images.unsplash.com/photo-1624963053656-cecdf576d028",
      "https://images.unsplash.com/photo-1571663237561-397f179622fb",
      "https://images.unsplash.com/photo-1643981670720-eef07ebdb179",
      "https://images.unsplash.com/photo-1516496636080-14fb876e029d",
      "https://images.unsplash.com/photo-1498036882173-b41c28a8ba34",
      "https://images.unsplash.com/photo-1541628951107-a9af5346a3e4",
      "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc",
      "https://images.unsplash.com/photo-1663841365361-db6ca65ac126",
      "https://images.unsplash.com/photo-1586752488885-6ce47fdfd874"
    ],
    []
  );

  // Normalize to a consistent size/quality for smoother transitions
  const images = useMemo(
    () =>
      rawImages.map((u) =>
        u.includes("?")
          ? `${u}&auto=format&fit=crop&w=1920&q=80`
          : `${u}?auto=format&fit=crop&w=1920&q=80`
      ),
    [rawImages]
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
    img.src = images[next];
  }, [index, images]);

  const currentSrc = images[index];

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background stack with elegant crossfade + Ken Burns */}
      <div ref={parallaxRef} className="absolute inset-0 min-h-[100vh]">
        <AnimatePresence>
          <motion.div
            key={currentSrc}
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
                src={currentSrc}
                className="w-full h-full object-cover min-h-[100vh] pointer-events-none select-none"
                objectPosition="center center"
                alt="Travel background"
                showAttribution={false}
                draggable={false}
              />
            </motion.div>

            {/* Soft gradient scrim for legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/50" />
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
        <div className="space-y-6 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex justify-center items-center w-full px-4"
          >
            <motion.button
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              whileHover={{ scale: 1.03, transition: { duration: 0.25 } }}
              onClick={() => navigate("/my-trips")}
              aria-label="Go to My Trips"
              className="w-full cursor-pointer bg-transparent border-none p-0"
            >
              <LogoFromSupabase
                logoName="White Full"
                className="max-w-[600px] w-full h-auto mx-auto"
                fallbackClassName="text-4xl font-bold text-white sm:text-5xl md:text-6xl lg:text-7xl"
                fallbackText="WanderLuxe"
              />
            </motion.button>
          </motion.div>
          {/* Button hidden as requested */}
        </div>
      </motion.div>
    </div>
  );
};

export default Hero;
