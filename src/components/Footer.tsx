import React from 'react';
import { Link } from 'react-router-dom';
import { useConsent } from '@/contexts/ConsentContext';

const Footer = () => {
  const { resetConsent } = useConsent();

  return (
    <footer className="py-6 border-t mt-auto">
      <div className="w-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex justify-center gap-4">
            <Link 
              to="/about" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              About Us
            </Link>
            <Link 
              to="/explore" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Explore Trips
            </Link>
            <Link 
              to="/terms" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <button
              onClick={resetConsent}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Manage Cookies
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            This site uses <i>Google Maps</i>. By using this site, you agree to their <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms of Service</a>.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;