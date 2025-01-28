import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <Card>{children}</Card>
      </div>
    </div>
  );
}
