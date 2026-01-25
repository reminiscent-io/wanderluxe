import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Shield } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AdminOverviewTab } from '@/components/admin/AdminOverviewTab';
import { AdminUsersTab } from '@/components/admin/AdminUsersTab';
import { AdminEngagementTab } from '@/components/admin/AdminEngagementTab';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { refetchAll, isLoading } = useAdminMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-50 to-earth-50">
      <Navigation />
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-earth-600" />
                <div>
                  <h1 className="text-4xl font-bold text-earth-600">Admin Dashboard</h1>
                  <p className="text-sand-600 text-lg">Platform metrics and analytics</p>
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
            </div>
          </motion.div>
        </div>

        {/* Tabs Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <AdminOverviewTab />
            </TabsContent>

            <TabsContent value="users">
              <AdminUsersTab />
            </TabsContent>

            <TabsContent value="engagement">
              <AdminEngagementTab />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
