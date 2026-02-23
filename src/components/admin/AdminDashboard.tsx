import { motion } from 'framer-motion';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';
import { AIInsightsSection } from './AIInsightsSection';
import { PulseBar } from './PulseBar';
import { SignInTrendSection } from './SignInTrendSection';
import { ActionBreakdownSection } from './ActionBreakdownSection';
import { EngagementFrequencySection } from './EngagementFrequencySection';
import { SharingSection } from './SharingSection';

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08 },
  }),
};

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Pulse bar skeleton */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-lg bg-sand-100" />
        ))}
      </div>
      {/* Section skeletons */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-4">
          <div className="h-6 w-56 animate-pulse rounded bg-sand-100" />
          <div className="h-[240px] animate-pulse rounded-xl bg-sand-100" />
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const { isLoading } = useAdminMetrics();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const sections = [
    { key: 'insights', component: <AIInsightsSection /> },
    { key: 'pulse', component: <PulseBar /> },
    { key: 'signin', component: <SignInTrendSection /> },
    { key: 'actions', component: <ActionBreakdownSection /> },
    { key: 'frequency', component: <EngagementFrequencySection /> },
    { key: 'sharing', component: <SharingSection /> },
  ];

  return (
    <div className="space-y-10">
      {sections.map((section, i) => (
        <motion.div
          key={section.key}
          custom={i}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          {section.component}
        </motion.div>
      ))}
    </div>
  );
}
