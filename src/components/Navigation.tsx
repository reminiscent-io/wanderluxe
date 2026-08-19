
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationLogo from "./navigation/NavigationLogo";
import NavigationLinks from "./navigation/NavigationLinks";
import NavigationAuth from "./navigation/NavigationAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Compass, FolderOpen, BookOpen } from "lucide-react";
import { useLocation } from "react-router-dom";

interface NavigationProps {
  mobileMenuTrigger?: React.ReactNode;
}

const Navigation = ({ mobileMenuTrigger }: NavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isTripPage = location.pathname.startsWith('/trip/') || /^\/explore\/[^/]+/.test(location.pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed right-0 top-0 z-50 bg-white/80 backdrop-blur-lg ${
        isTripPage ? 'left-0 md:left-[280px]' : 'left-0'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex max-w-none items-center justify-between px-3 py-2.5 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex items-center gap-4">
          {/* Mobile sidebar trigger for trip pages */}
          {isTripPage && mobileMenuTrigger && (
            <div className="md:hidden">
              {mobileMenuTrigger}
            </div>
          )}
          
          {/* Mobile menu for non-trip pages */}
          {!isTripPage && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex flex-col space-y-4 mt-8">
                  <button
                    onClick={() => handleMobileNavigation('/explore')}
                    className="flex items-center gap-3 px-4 py-3 text-left text-sand-700 hover:bg-sand-50 rounded-lg transition-colors"
                  >
                    <Compass className="h-5 w-5" />
                    <span className="font-medium">Explore</span>
                  </button>
                  <button
                    onClick={() => handleMobileNavigation('/my-trips')}
                    className="flex items-center gap-3 px-4 py-3 text-left text-sand-700 hover:bg-sand-50 rounded-lg transition-colors"
                  >
                    <FolderOpen className="h-5 w-5" />
                    <span className="font-medium">My Trips</span>
                  </button>
                  <button
                    onClick={() => handleMobileNavigation('/guide')}
                    className="flex items-center gap-3 px-4 py-3 text-left text-sand-700 hover:bg-sand-50 rounded-lg transition-colors"
                  >
                    <BookOpen className="h-5 w-5" />
                    <span className="font-medium">How it works</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          )}
          
          {!isTripPage && <NavigationLogo />}
        </div>
        <NavigationLinks />
        <NavigationAuth />
      </div>
    </nav>
  );
};

export default Navigation;
