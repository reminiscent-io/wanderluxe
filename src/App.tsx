import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthCacheSync from "@/components/AuthCacheSync";
import { ConsentProvider } from "@/contexts/ConsentContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import PostHogConsentSync from "@/components/PostHogConsentSync";
import GoogleAnalyticsConsentSync from "@/components/GoogleAnalyticsConsentSync";
import AdminRoute from "./components/AdminRoute";
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useVersionCheck } from "@/hooks/useVersionCheck";

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
const Guide = lazy(() => import("./pages/Guide"));
const Admin = lazy(() => import("./pages/Admin"));
const InviteRedeem = lazy(() => import("./pages/InviteRedeem"));
const OauthConsent = lazy(() => import("./pages/OauthConsent"));
const PrintItinerary = lazy(() => import("./pages/PrintItinerary"));

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
  useVersionCheck();
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
      <ConsentProvider>
        <PostHogConsentSync />
        <GoogleAnalyticsConsentSync />
        <AuthProvider>
          <AuthCacheSync />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAInstallPrompt />
            <BrowserRouter>
              <ScrollToTop />
              <CookieConsentBanner />
              <AppLayout>
                <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-6 w-6 animate-spin text-sand-400" /></div>}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/update-password" element={<UpdatePassword />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/guide" element={<Guide />} />
                  <Route path="/explore/:slug/*" element={<TripDetails />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/about" element={<LLMTraining />} />
                  <Route path="/invite/:code" element={<InviteRedeem />} />
                  <Route path="/oauth/consent" element={<OauthConsent />} />
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
                  {/* Print Studio output — more specific than the TripDetails
                      wildcard, so React Router ranks it first. */}
                  <Route
                    path="/trip/:tripId/print/:designId"
                    element={<PrintItinerary />}
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
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;