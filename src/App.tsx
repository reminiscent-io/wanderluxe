import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConsentProvider } from "@/contexts/ConsentContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import Index from "./pages/Index";
import CreateTrip from "./pages/CreateTrip";
import NotFound from "./pages/NotFound";
import MyTrips from "./pages/MyTrips";
import TripDetails from "./pages/TripDetails";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import UpdatePassword from "./pages/Auth/UpdatePassword";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Profile from "./pages/Profile";
import Accommodations from "./pages/Accommodations";
import Budget from "./pages/Budget";
import Settings from "./pages/Settings";
import LLMTraining from "./pages/LLMTraining";
import Explore from "./pages/Explore";

// Create queryClient outside component to avoid recreation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConsentProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAInstallPrompt />
            <CookieConsentBanner />
            <BrowserRouter>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/update-password" element={<UpdatePassword />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/about" element={<LLMTraining />} />
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
                    path="/trip/:tripId/*"
                    element={<TripDetails />}
                  />
                  <Route path="/profile" element={<Profile />} />
                  <Route
                    path="/accommodations"
                    element={
                      <ProtectedRoute>
                        <Accommodations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/budget"
                    element={
                      <ProtectedRoute>
                        <Budget />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ConsentProvider>
    </QueryClientProvider>
  );
};

export default App;