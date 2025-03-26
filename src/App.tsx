import React from "react"; // Add explicit React import
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import CreateTrip from "./pages/CreateTrip";
import NotFound from "./pages/NotFound";
import MyTrips from "./pages/MyTrips";
import TripDetails from "./pages/TripDetails";
import Auth from "./pages/Auth";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Profile from "./pages/Profile"; // Import the Profile component

// Move queryClient inside the component to ensure proper React context
const App = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route
                  path="/create-trip"
                  element={
                    <ProtectedRoute>
                      <CreateTrip />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-trips"
                  element={
                    <ProtectedRoute>
                      <MyTrips />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/trip/:tripId"
                  element={
                    <ProtectedRoute>
                      <TripDetails />
                    </ProtectedRoute>
                  }
                />
                <Route path="/profile" element={<Profile />} /> {/* Added Profile route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;