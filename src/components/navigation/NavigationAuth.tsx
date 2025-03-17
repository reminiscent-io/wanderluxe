import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";

interface NavigationAuthProps {
  isScrolled: boolean;
}

const NavigationAuth = ({ isScrolled }: NavigationAuthProps) => {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { toast } = useToast();

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
    <div className="flex items-center space-x-4">
      {session ? (
        <>
          <motion.button
            onClick={() => navigate("/create-trip")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-full px-4 py-2 text-sm font-medium transition-colors bg-earth-500 text-white hover:bg-earth-600"
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
  );
};

export default NavigationAuth;