import { motion } from "framer-motion";
import NavigationLogo from "./navigation/NavigationLogo";
import NavigationLinks from "./navigation/NavigationLinks";
import NavigationAuth from "./navigation/NavigationAuth";
import { useScrollEffect } from "./navigation/useScrollEffect";

const Navigation = () => {
  const isScrolled = useScrollEffect();

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/80 backdrop-blur-lg" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <NavigationLogo isScrolled={isScrolled} />
        <NavigationLinks isScrolled={isScrolled} />
        <NavigationAuth isScrolled={isScrolled} />
      </div>
    </motion.nav>
  );
};

export default Navigation;