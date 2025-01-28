
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import AuthPage from "@/pages/auth-page";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      {!user ? (
        <Route path="*" element={<AuthPage />} />
      ) : (
        <>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </>
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  );
}
