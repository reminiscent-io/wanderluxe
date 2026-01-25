import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { session } = useAuth();
  const { isAdmin, isLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // If no session, redirect to auth
    if (!session) {
      const timer = setTimeout(() => {
        if (!session) {
          navigate('/auth', { replace: true });
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    // If session exists but still loading admin status, wait
    if (isLoading) {
      return;
    }

    // If not admin, redirect to my-trips
    if (!isAdmin) {
      navigate('/my-trips', { replace: true });
      return;
    }

    // User is admin, allow access
    setIsChecking(false);
  }, [session, isAdmin, isLoading, navigate]);

  // Show loading spinner while checking
  if (isChecking || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-sand-500" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
