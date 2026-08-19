import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const NavigationLinks = () => {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();

  const handleNavigation = (path: string) => {
    if (path === "Explore") {
      navigate("/explore");
    } else if (path === "My Trips") {
      navigate("/my-trips");
    } else if (path === "Guide") {
      navigate("/guide");
    } else if (path === "Admin") {
      navigate("/admin");
    }
  };

  const navItems = isAdmin
    ? ["Explore", "My Trips", "Guide", "Admin"]
    : ["Explore", "My Trips", "Guide"];

  return (
    <motion.div className="hidden space-x-8 md:flex">
      {navItems.map(item => (
        <motion.button
          key={item}
          onClick={() => handleNavigation(item)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-sand-500 font-bold transition-colors"
        >
          {item}
        </motion.button>
      ))}
    </motion.div>
  );
};

export default NavigationLinks;
