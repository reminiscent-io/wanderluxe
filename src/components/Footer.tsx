import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="py-6 border-t mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex justify-center gap-4">
          <Link 
            to="/terms" 
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms Of Service
          </Link>
          <Link 
            to="/privacy" 
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;