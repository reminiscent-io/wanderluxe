import React from "react";
import NavigationLogo from "./navigation/NavigationLogo";
import NavigationLinks from "./navigation/NavigationLinks";
import NavigationAuth from "./navigation/NavigationAuth";

/**
 * Sticky/fixed header that publishes its height via [data-app-nav].
 * - h-14 (56px) on mobile, h-16 (64px) on desktop keeps sizing predictable.
 * - Backdrop blur and subtle border match your current style.
 */
const Navigation: React.FC = () => {
  return (
    <header
      data-app-nav
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
