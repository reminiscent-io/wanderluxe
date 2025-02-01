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

// Assumed implementation of useUser hook -  This needs to be adapted to your actual implementation.
import { useState, useEffect } from 'react';
import axios from 'axios'; // Or your preferred HTTP client

const api = axios.create({
  baseURL: '/api' // Adjust base URL as needed
});

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (data: { username: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/login", data, { withCredentials: true });
      setUser(response.data);
    } catch (error) {
      console.error("Login failed:", error);
      // Handle login error appropriately, e.g., display an error message
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { username: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/register", data);
      setUser(response.data);
    } catch (error) {
      console.error("Registration failed:", error);
      // Handle registration error appropriately
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post("/api/logout", {}, { withCredentials: true });
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      // Handle logout error appropriately
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch user data on component mount (optional, depends on your auth strategy)
    const fetchUserData = async () => {
      try {
        const response = await api.get("/api/user", { withCredentials: true });
        setUser(response.data);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        // Handle error appropriately
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);

  return { user, isLoading, login, register, logout };
};