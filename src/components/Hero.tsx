import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

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
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=2568&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat"
        style={{
          transform: `translateY(${scrollY * 0.5}px)`,
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative flex h-full items-center justify-center text-center"
      >
        <div className="space-y-6 px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-4xl font-bold text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Travel Planning
            <br />
            Reimagined
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mx-auto max-w-2xl text-lg text-white/80"
          >
            Create unforgettable journeys with our intelligent travel companion
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="pt-4"
          >
            <Button 
              size="lg"
              className="bg-sand-500 hover:bg-sand-600 text-white text-base px-6 py-4 h-auto transform transition-all duration-300 hover:scale-110 hover:px-8 hover:py-5 hover:text-lg"
              onClick={() => navigate("/create-trip")}
            >
              Start Planning Your Journey
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Hero;