import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConsentProvider } from "@/contexts/ConsentContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import AdminRoute from "./components/AdminRoute";
import { lazy, Suspense, useEffect } from "react";

// Landing page loaded eagerly — it's the entry point
import Index from "./pages/Index";

// All other pages lazy-loaded for code splitting
const CreateTrip = lazy(() => import("./pages/CreateTrip"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MyTrips = lazy(() => import("./pages/MyTrips"));
const TripDetails = lazy(() => import("./pages/TripDetails"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/Auth/ForgotPassword"));
const UpdatePassword = lazy(() => import("./pages/Auth/UpdatePassword"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Profile = lazy(() => import("./pages/Profile"));
const Accommodations = lazy(() => import("./pages/Accommodations"));
const Budget = lazy(() => import("./pages/Budget"));
const Settings = lazy(() => import("./pages/Settings"));
const LLMTraining = lazy(() => import("./pages/LLMTraining"));
const Explore = lazy(() => import("./pages/Explore"));
const Admin = lazy(() => import("./pages/Admin"));
const InviteRedeem = lazy(() => import("./pages/InviteRedeem"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

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
            <BrowserRouter>
              <ScrollToTop />
              <CookieConsentBanner />
              <AppLayout>
                <Suspense fallback={null}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/update-password" element={<UpdatePassword />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/about" element={<LLMTraining />} />
                  <Route path="/invite/:code" element={<InviteRedeem />} />
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
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <Admin />
                      </AdminRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </AppLayout>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ConsentProvider>
    </QueryClientProvider>
  );
};

export default App;