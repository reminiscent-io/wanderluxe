
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import UnsplashImage from "./UnsplashImage";
import LogoFromSupabase from "./LogoFromSupabase";

const Hero = () => {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = [
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
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (parallaxRef.current) {
        const scrollY = window.scrollY;
        parallaxRef.current.style.transform = `translateY(${scrollY * 0.5}px)`;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentImageIndex((prevIndex) => {
        return (prevIndex + 1) % images.length;
      });
    }, 3000);

    return () => clearInterval(intervalId);
  }, [images.length]);

  

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div
        ref={parallaxRef}
        className="absolute inset-0 min-h-[100vh]"
      >
        {images.map((image, index) => (
          <UnsplashImage
            key={index}
            style={{
              transition: "opacity 1.5s ease-in-out",
              opacity: index === currentImageIndex ? 1 : 0,
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%"
            }}
            src={image}
            className="w-full h-full object-cover min-h-[100vh]"
            objectPosition="center center"
            alt="Travel background"
            showAttribution={false}
          />
        ))}
        <div className="absolute inset-0 bg-black/30" />
      </div>

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
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 1.2,
                ease: "easeOut"
              }}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.3 }
              }}
              onClick={() => navigate('/my-trips')}
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
