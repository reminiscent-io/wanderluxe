
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface NavigationLinksProps {
  isScrolled: boolean;
}

const NavigationLinks = ({ isScrolled }: NavigationLinksProps) => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    if (path === "My Trips") {
      navigate("/my-trips");
    }
  };

  return (
    <div className="hidden space-x-8 md:flex">
      {["My Trips"].map((item) => (
        <motion.button
          key={item}
          onClick={() => handleNavigation(item)}
          whileHover={{ y: -2 }}
          className={`text-sm font-medium ${
            isScrolled ? "text-earth-500" : "text-white"
          }`}
        >
          {item}
        </motion.button>
      ))}
    </div>
  );
};

export default NavigationLinks;
