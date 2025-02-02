import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavigation = (path: string) => {
    switch (path) {
      case "My Trips":
        navigate("/my-trips");
        break;
      case "Inspiration":
        navigate("/inspiration");
        break;
      default:
        break;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      navigate("/auth");
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "There was a problem signing out. Please try again.",
        variant: "destructive",
      });
    }
  };

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
        <motion.a
          href="/"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`text-xl font-bold ${
            isScrolled ? "text-earth-500" : "text-white"
          }`}
        >
          Wanderlust
        </motion.a>
        <div className="hidden space-x-8 md:flex">
          {["My Trips", "Inspiration"].map((item) => (
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
        <div className="flex items-center space-x-4">
          {session ? (
            <>
              <motion.button
                onClick={() => navigate("/create-trip")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isScrolled
                    ? "bg-earth-500 text-white hover:bg-earth-600"
                    : "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                }`}
              >
                Create Trip
              </motion.button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className={`${
                  isScrolled ? "text-earth-500" : "text-white"
                } hover:bg-transparent`}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <motion.button
              onClick={() => navigate("/auth")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isScrolled
                  ? "bg-earth-500 text-white hover:bg-earth-600"
                  : "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
              }`}
            >
              Sign In
            </motion.button>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navigation;