
import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { logger } from './lib/logger';
import { queryClient } from './lib/queryClient';
import { Route, Router, Redirect } from 'wouter';
import AuthPage from './pages/auth-page';
import Home from './pages/home';
import NotFound from './pages/not-found';
import { AuthProvider, useAuth } from './context/auth-context';

const ProtectedRoute = ({ component: Component, ...rest }: { component: React.ComponentType<any> }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
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
      <AuthProvider>
        <Router>
          <Route path="/auth" component={AuthPage} />
          <Route path="/" component={(props) => <ProtectedRoute component={Home} {...props} />} />
          <Route component={NotFound} />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
