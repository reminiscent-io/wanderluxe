import { createContext, useContext, ReactNode } from "react";
import { useUser } from "@/hooks/use-user";
import type { User } from "@db/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: { username: string; password: string }) => Promise<void>;
  register: (data: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, login, register, logout } = useUser();

  const value: AuthContextType = {
    user: user || null,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}