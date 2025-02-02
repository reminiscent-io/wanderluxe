import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { logger } from './lib/logger';
import { queryClient } from './lib/queryClient';
import { Route, Switch } from 'wouter';
import Home from './pages/home';
import NotFound from './pages/not-found';
import Budget from './pages/budget';

export default function App() {
  useEffect(() => {
    logger.log('App initialized');

    window.onerror = (message, source, lineno, colno, error) => {
      logger.error('Global error:', { message, source, lineno, colno, error });
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Route path="/" component={Home} />
      <Route path="/budget" component={Budget} />
      <Route component={NotFound} />
    </QueryClientProvider>
  );
}