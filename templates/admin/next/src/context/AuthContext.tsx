'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateCurrentUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('admin_token');
      const savedUser = localStorage.getItem('admin_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });

    // Backend wraps everything: { success, message, data: SessionView }
    // SessionView shape: { user: PublicUser, tokens: { accessToken, ... } }
    const raw = res.data;
    const session = raw?.data ?? raw; // unwrap the { success, message, data } envelope

    // Support all possible nesting levels
    const authUser: User = session?.user ?? raw?.user;
    const accessToken: string =
      session?.tokens?.accessToken   // SessionView (primary)
      ?? session?.accessToken        // flat legacy
      ?? raw?.tokens?.accessToken    // double-unwrap edge case
      ?? raw?.accessToken            // flat on raw
      ?? raw?.token;

    if (!authUser) {
      console.error('[Auth] Unexpected login response shape:', JSON.stringify(raw));
      throw new Error('Unexpected response from server. Check console for details.');
    }

    const userRole = authUser.role;
    if (!userRole || userRole !== 'ADMIN') {
      throw new Error('Access denied. Administrator privileges required.');
    }

    localStorage.setItem('admin_token', accessToken);
    localStorage.setItem('admin_user', JSON.stringify(authUser));
    setToken(accessToken);
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
  };

  const updateCurrentUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('admin_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
