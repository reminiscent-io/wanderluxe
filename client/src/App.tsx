
import { StrictMode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Route, Router } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import HomePage from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import NotFoundPage from "@/pages/not-found";
import { ErrorBoundary } from "@/components/error-boundary";
import { AuthProvider } from "@/context/auth-context";

export default function App() {
  return (
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router>
              <Route path="/" component={HomePage} />
              <Route path="/auth" component={AuthPage} />
              <Route component={NotFoundPage} />
            </Router>
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
