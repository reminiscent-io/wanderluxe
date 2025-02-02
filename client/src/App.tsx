import { QueryClientProvider } from '@tanstack/react-query';
import { logger } from './lib/logger';
import { queryClient } from './lib/queryClient';
import { Route, Switch } from 'wouter';
import Home from './pages/home';
import NotFound from './pages/not-found';
import Budget from './pages/budget';

export default function App() {
  logger.log('App initialized');

  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/budget" component={Budget} />
        <Route component={NotFound} />
      </Switch>
    </QueryClientProvider>
  );
}