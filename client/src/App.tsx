import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { logger } from './lib/logger';
import { queryClient } from './lib/queryClient';
import { Route, Switch } from 'wouter';
import AuthPage from './pages/auth-page';
import Home from './pages/home';
import NotFound from './pages/not-found';
import { useAuth } from './hooks/use-auth';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ component: Component, ...rest }: { component: React.ComponentType<any> }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>;
  }

  if (!user) {
    window.location.href = '/auth';
    return null;
  }

  return <Component {...rest} />;
};

export default function App() {
  useEffect(() => {
    logger.log('App initialized');

    window.onerror = (message, source, lineno, colno, error) => {
      logger.error('Global error:', { message, source, lineno, colno, error });
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={(props) => <ProtectedRoute component={Home} {...props} />} />
      <Route component={NotFound} />
    </QueryClientProvider>
  );
}