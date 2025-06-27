
import { motion } from "framer-motion";
import NavigationLogo from "./navigation/NavigationLogo";
import NavigationLinks from "./navigation/NavigationLinks";
import NavigationAuth from "./navigation/NavigationAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";

interface NavigationProps {
  mobileMenuTrigger?: React.ReactNode;
}

const Navigation = ({ mobileMenuTrigger }: NavigationProps) => {
  const location = useLocation();
  const isTripPage = location.pathname.startsWith('/trip/');

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed left-0 right-0 top-0 z-50 bg-white/80 backdrop-blur-lg"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex items-center gap-4">
          {/* Mobile sidebar trigger for trip pages */}
          {isTripPage && mobileMenuTrigger && (
            <div className="md:hidden">
              {mobileMenuTrigger}
            </div>
          )}
          <NavigationLogo />
        </div>
        <NavigationLinks />
        <NavigationAuth />
      </div>
    </motion.nav>
  );
};

export default Navigation;
