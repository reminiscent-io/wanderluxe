import { motion } from 'framer-motion';
import { RefreshCw, Shield } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';

const Admin = () => {
  const { refetchAll, isLoading } = useAdminMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-50 to-earth-50">
      <Navigation />
      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-earth-600" />
            <div>
              <h1 className="text-4xl font-bold text-earth-600">Admin Dashboard</h1>
              <p className="text-sand-600 text-lg">Platform health at a glance</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={refetchAll}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>

        <AdminDashboard />
      </div>
    </div>
  );
};

export default Admin;
