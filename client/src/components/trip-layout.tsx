import { ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface TripLayoutProps {
  children: ReactNode;
  title?: string;
}

export function TripLayout({ children, title = "Luxury Travel Planner" }: TripLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <h1 className="text-2xl font-semibold cursor-pointer">{title}</h1>
          </Link>
          <nav>
            <Link href="/budget">
              <Button variant="ghost">Budget</Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}