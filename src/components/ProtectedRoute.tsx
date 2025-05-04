import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // If we have a session, immediately set authenticated
    if (session) {
      setIsAuthenticated(true);
      return;
    }

    // If no session, give a short grace period before redirecting
    // This prevents flashing or immediate redirects when refreshing page
    const timer = setTimeout(() => {
      if (!session) {
        setIsAuthenticated(false);
        navigate("/auth");
      }
    }, 1000); // 1 second grace period

    return () => clearTimeout(timer);
  }, [session, navigate]);

  // Initial loading state
  if (isAuthenticated === null) {
    return null; // or a loading spinner
  }

  return isAuthenticated ? <>{children}</> : null;
};

export default ProtectedRoute;