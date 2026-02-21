import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import NavigationLogo from "./NavigationLogo";
import NavigationLinks from "./NavigationLinks";
import NavigationAuth from "./NavigationAuth";

/**
 * Fixed global header.
 * - Exposes its current height via CSS var --app-nav-h for layout offset.
 * - h-14 (56px) on mobile, h-16 (64px) on desktop.
 */
const Navigation: React.FC = () => {
  const headerRef = useRef<HTMLElement | null>(null);
  const location = useLocation();
  const isTripPage = location.pathname.startsWith('/trip/');

  const handleOpenSidebar = () => {
    // Dispatch custom event that Sidebar listens for
    window.dispatchEvent(new CustomEvent('wanderluxe:open-sidebar'));
  };

  useEffect(() => {
    const updateVar = () => {
      if (headerRef.current) {
        // Use getBoundingClientRect for more accurate measurement that includes transforms
        const rect = headerRef.current.getBoundingClientRect();
        document.documentElement.style.setProperty(
          "--app-nav-h",
          `${rect.height}px`
        );
      }
    };

    // Initial set after a small delay to ensure safe-area CSS is computed
    // This is especially important for PWA standalone mode on iOS
    const initialTimeout = setTimeout(() => {
      updateVar();
      // Double-check after animation frames for PWA standalone mode
      requestAnimationFrame(() => {
        updateVar();
        requestAnimationFrame(updateVar);
      });
    }, 50);

    const ro = new ResizeObserver(updateVar);
    if (headerRef.current) ro.observe(headerRef.current);

    window.addEventListener("resize", updateVar);
    window.addEventListener("orientationchange", updateVar);

    return () => {
      clearTimeout(initialTimeout);
      ro.disconnect();
      window.removeEventListener("resize", updateVar);
      window.removeEventListener("orientationchange", updateVar);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      data-app-nav
      role="banner"
      className="fixed top-0 inset-x-0 z-50 bg-[hsl(var(--background))]/95 backdrop-blur-sm supports-[backdrop-filter]:bg-[hsl(var(--background))]/90 border-b border-[hsl(var(--border))]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto h-14 md:h-16 px-3 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mobile hamburger menu for trip pages */}
          {isTripPage && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={handleOpenSidebar}
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <NavigationLogo />
        </div>
        <NavigationLinks />
        <NavigationAuth />
      </div>
    </header>
  );
};

export default Navigation;
