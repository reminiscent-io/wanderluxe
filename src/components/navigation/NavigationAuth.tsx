
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import UserAvatar from "./UserAvatar";

const NavigationAuth = () => {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { toast } = useToast();

  return (
    <div className="flex items-center space-x-4">
      {session ? (
        <>
          <motion.button
            onClick={() => navigate("/create-trip")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors bg-earth-500 text-white hover:bg-earth-600"
          >
            Create Trip
          </motion.button>
          <UserAvatar />
        </>
      ) : (
        <motion.button
          onClick={() => navigate("/auth")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors bg-earth-500 text-white hover:bg-earth-600"
        >
          Sign In
        </motion.button>
      )}
    </div>
  );
};

export default NavigationAuth;
