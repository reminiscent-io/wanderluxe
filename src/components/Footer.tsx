import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="py-6 border-t mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="max-w-2xl text-center mb-4">
            <h2 className="text-sm font-semibold mb-2">About WanderLuxe</h2>
            <p className="text-sm text-muted-foreground">
              WanderLuxe is your all-in-one travel planning companion that lets you create, customize, and share detailed trip itineraries. Plan your accommodations, activities, dining experiences, and transportation seamlessly. Collaborate with fellow travelers and keep all your travel details organized in one place.
            </p>
          </div>
          <p className="text-xs text-gray-500 text-center">
            This site uses <i>Google Maps</i>. By using this site, you agree to their <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms of Service</a>.
          </p>
          <div className="flex justify-center gap-4">
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
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;