import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { logger } from './lib/logger';
import { queryClient } from './lib/queryClient';
import { Route, Router } from 'wouter';
import AuthPage from './pages/auth-page';
import Home from './pages/home';
import NotFound from './pages/not-found';

export default function App() {
  useEffect(() => {
    logger.log('App initialized');
    
    window.onerror = (message, source, lineno, colno, error) => {
      logger.error('Global error:', { message, source, lineno, colno, error });
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Route path="/auth" component={AuthPage} />
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Router>
    </QueryClientProvider>
  );
}