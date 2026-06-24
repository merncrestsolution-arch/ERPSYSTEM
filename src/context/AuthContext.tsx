import React, { createContext, useContext, useState, useEffect } from 'react';
import { startTracking, stopTracking } from '../lib/locationTracker';

export interface User {
  id: number;
  username: string;
  role: string;
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  hasRole: (allowedRoles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Tracks the initial restore from localStorage so route guards don't
  // redirect to /login before we've had a chance to rehydrate the session.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load from local storage on startup
    const storedUser = localStorage.getItem('erp_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }
    setIsLoading(false);
  }, []);

  // Track Sales Officers' location; ensure tracking stops for anyone else.
  useEffect(() => {
    if (user && user.role === 'Sales Officer') {
      startTracking({ id: user.id, username: user.username, full_name: user.full_name });
    } else {
      stopTracking();
    }
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('erp_user', JSON.stringify(userData));
  };

  const logout = () => {
    stopTracking();
    setUser(null);
    localStorage.removeItem('erp_user');
  };

  const hasRole = (allowedRoles: string[]) => {
    if (!user) return false;
    // Admin and Director have full access to view all modules
    return allowedRoles.includes(user.role) || user.role === 'Admin' || user.role === 'Director';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
