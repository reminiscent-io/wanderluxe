import React from 'react';
import { usePageTracking } from '@/hooks/usePageTracking';

interface AnalyticsWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that enables automatic page tracking
 */
export const AnalyticsWrapper: React.FC<AnalyticsWrapperProps> = ({ children }) => {
  usePageTracking();
  return <>{children}</>;
};