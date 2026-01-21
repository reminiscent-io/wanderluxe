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
        document.documentElement.style.setProperty(
          "--app-nav-h",
          `${headerRef.current.offsetHeight}px`
        );
      }
    };

    // Initial set + react to size changes
    updateVar();
    const ro = new ResizeObserver(updateVar);
    if (headerRef.current) ro.observe(headerRef.current);

    window.addEventListener("resize", updateVar);
    window.addEventListener("orientationchange", updateVar);

    return () => {
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
      className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-sand-200"
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
