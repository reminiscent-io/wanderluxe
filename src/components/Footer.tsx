import React from 'react';
import { Link } from 'react-router-dom';
import { useConsent } from '@/contexts/ConsentContext';

const Footer = () => {
  const { resetConsent } = useConsent();

  return (
    <footer className="py-6 border-t mt-auto">
      <div className="w-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-0 px-6 sm:gap-y-2">
            <Link 
              to="/about" 
              className="inline-flex min-h-[44px] items-center text-xs text-muted-foreground transition-colors hover:text-foreground sm:min-h-0"
            >
              About Us
            </Link>
            <Link 
              to="/explore" 
              className="inline-flex min-h-[44px] items-center text-xs text-muted-foreground transition-colors hover:text-foreground sm:min-h-0"
            >
              Explore Trips
            </Link>
            <Link 
              to="/terms" 
              className="inline-flex min-h-[44px] items-center text-xs text-muted-foreground transition-colors hover:text-foreground sm:min-h-0"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="inline-flex min-h-[44px] items-center text-xs text-muted-foreground transition-colors hover:text-foreground sm:min-h-0"
            >
              Privacy Policy
            </Link>
            <button
              onClick={resetConsent}
              className="inline-flex min-h-[44px] items-center text-xs text-muted-foreground transition-colors hover:text-foreground sm:min-h-0"
            >
              Manage Cookies
            </button>
          </div>
          <p className="px-6 text-xs text-muted-foreground text-center mt-4">
            This site uses <i>Google Maps</i>. By using this site, you agree to their <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms of Service</a>.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;