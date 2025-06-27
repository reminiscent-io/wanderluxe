import React from "react";

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export default function AppLayout({ children, showSidebar = true }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <main className={`flex-1 ${showSidebar ? 'pl-0 md:pl-[280px]' : ''}`}>
        {children}
      </main>
    </div>
  );
}