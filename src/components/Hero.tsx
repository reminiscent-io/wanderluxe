
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import UnsplashImage from "./UnsplashImage";
import LogoFromSupabase from "./LogoFromSupabase";

const Hero = () => {
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ transform: `translateY(${scrollY * 0.5}px)` }}
      >
        <UnsplashImage
          src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=2568"
          className="w-full h-full object-cover"
          alt="Travel background"
        />
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
            className="flex justify-center"
          >
            <motion.div
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
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label="Go to My Trips"
            >
              <LogoFromSupabase 
                logoName="White Full" 
                className="max-w-[600px] w-full h-auto mx-auto"
                fallbackClassName="text-4xl font-bold text-white sm:text-5xl md:text-6xl lg:text-7xl"
                fallbackText="WanderLuxe"
              />
            </motion.div>
          </motion.div>
          {/* Button hidden as requested */}
        </div>
      </motion.div>
    </div>
  );
};

export default Hero;
