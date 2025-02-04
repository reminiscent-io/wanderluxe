import { motion } from "framer-motion";

interface NavigationLogoProps {
  isScrolled: boolean;
}

const NavigationLogo = ({ isScrolled }: NavigationLogoProps) => {
  return (
    <motion.a
      href="/"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`text-xl font-bold ${
        isScrolled ? "text-earth-500" : "text-white"
      }`}
    >
      WanderLuxe
    </motion.a>
  );
};

export default NavigationLogo;