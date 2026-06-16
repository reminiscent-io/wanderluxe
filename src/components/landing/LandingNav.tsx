import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Top-right nav overlaid on the landing hero.
 * Signed in  → "My Trips"  → /my-trips
 * Signed out → "Sign In"   → /auth
 */
const LandingNav = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  const isSignedIn = Boolean(session);
  const label = isSignedIn ? "My Trips" : "Sign In";
  const destination = isSignedIn ? "/my-trips" : "/auth";

  return (
    <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="absolute top-0 right-0 z-20 p-4 sm:p-6"
    >
      <button
        type="button"
        onClick={() => navigate(destination)}
        aria-label={isSignedIn ? "Go to My Trips" : "Sign in"}
        className="rounded-full border border-white/30 bg-white/15 px-5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {label}
      </button>
    </motion.nav>
  );
};

export default LandingNav;
