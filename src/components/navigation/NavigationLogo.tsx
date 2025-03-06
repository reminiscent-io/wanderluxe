
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface NavigationLogoProps {
  isScrolled: boolean;
}

const NavigationLogo = ({ isScrolled }: NavigationLogoProps) => {
  const [logoPath, setLogoPath] = useState("/logos/wanderluxe-simple-white.png");

  useEffect(() => {
    // Change logo based on scroll state
    setLogoPath(isScrolled 
      ? "/logos/wanderluxe-simple-black.png" 
      : "/logos/wanderluxe-simple-white.png");
  }, [isScrolled]);

  return (
    <motion.a
      href="/"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center"
    >
      <img 
        src={logoPath} 
        alt="WanderLuxe" 
        className="h-8 md:h-10" 
      />
    </motion.a>
  );
};

export default NavigationLogo;
