import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-sand-50">
      <SEO title="Page not found" noIndex />
      <Navigation />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-earth-400 mb-4">
            404
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-earth-700 leading-[1.05]">
            This page has gone somewhere else.
          </h1>
          <p className="mt-4 text-lg text-earth-500 leading-relaxed">
            The link may be old, or the trip it pointed to has moved. The itineraries are still here.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="sunset" size="lg" asChild>
              <Link to="/explore">Browse itineraries</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/">Back to the homepage</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-earth-400">
            Looking for how something works? Read the{" "}
            <Link to="/guide" className="text-earth-600 underline underline-offset-4 hover:text-earth-800">
              guide
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
