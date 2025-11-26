import React from 'react';
import Navigation from '../navigation/Navigation';
import Footer from '../Footer';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      {/* Offset main content by the fixed header height (default 56px) */}
      <main className="flex-1" style={{ paddingTop: 'var(--app-nav-h, 56px)' }}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default AppLayout;
