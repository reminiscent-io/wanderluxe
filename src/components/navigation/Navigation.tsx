import React, { useEffect, useRef } from "react";
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
      className="fixed top-0 inset-x-0 z-50 h-14 md:h-16 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-sand-200"
    >
      <div className="mx-auto max-w-6xl h-full px-3 md:px-6 flex items-center justify-between">
        <NavigationLogo />
        <NavigationLinks />
        <NavigationAuth />
      </div>
    </header>
  );
};

export default Navigation;
