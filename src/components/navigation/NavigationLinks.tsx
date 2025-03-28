
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const NavigationLinks = () => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    if (path === "My Trips") {
      navigate("/my-trips");
    }
  };

  return (
    <div className="hidden space-x-8 md:flex">
      {["My Trips"].map(item => (
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
    </div>
  );
};

export default NavigationLinks;
