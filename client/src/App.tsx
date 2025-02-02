import { QueryClientProvider } from '@tanstack/react-query';
import { logger } from './lib/logger';
import { queryClient } from './lib/queryClient';
import { Route, Switch } from 'wouter';
import Home from './pages/home';
import NotFound from './pages/not-found';
import Budget from './pages/budget';
import { ErrorBoundary } from './components/error-boundary';
import { Toaster } from './components/ui/toaster';
import { StrictMode } from 'react';

export default function App() {
  logger.log('App initialized');

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/budget" component={Budget} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}