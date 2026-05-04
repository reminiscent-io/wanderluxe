import { motion, useReducedMotion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';

const Admin = () => {
  const { refetchAll, isLoading } = useAdminMetrics();
  const prefersReducedMotion = useReducedMotion();

  const headerMotion = prefersReducedMotion
    ? { initial: false, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-5xl px-4 pt-20 md:pt-28 pb-12">
        <motion.header
          {...headerMotion}
          className="mb-10 flex flex-wrap items-end justify-between gap-4"
        >
          <h1 className="font-display text-3xl md:text-4xl font-normal leading-tight text-earth-700">
            Admin
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw
              aria-hidden="true"
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            {isLoading ? 'Refreshing' : 'Refresh'}
          </Button>
        </motion.header>

        <span className="sr-only" aria-live="polite">
          {isLoading ? 'Refreshing dashboard' : ''}
        </span>

        <div aria-busy={isLoading}>
          <AdminDashboard />
        </div>
      </main>
    </div>
  );
};

export default Admin;
