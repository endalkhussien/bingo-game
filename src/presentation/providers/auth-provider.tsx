'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { ipc } from '../lib/ipc';

interface User {
  id: string;
  fullName: string;
  username: string;
  role: string;
}

interface Agent {
  id: string;
  walletBalance: number;
  commissionRate: number;
  adminCommissionRate: number;
}

interface AuthContextType {
  user: User | null;
  agent: Agent | null;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  refreshAgent: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  const token = localStorage.getItem('bingo_token');
  if (token) {
    ipc<{ user: User; agent: Agent | null } | null>('auth:session', token).then((session) => {
      if (session) {
        setUser(session.user);
        setAgent(session.agent);
      } else {
        localStorage.removeItem('bingo_token');
      }
      setIsLoading(false);
    });
  } else {
    setIsLoading(false);
  }
  }, []);

  const login = useCallback(async (username: string, password: string, rememberMe = false) => {
    const result = await ipc<{ success: boolean; data?: { token: string; user: User; agent: Agent | null }; error?: string }>(
      'auth:login', username, password, rememberMe
    );
    if (result.success && result.data) {
      localStorage.setItem('bingo_token', result.data.token);
      setUser(result.data.user);
      setAgent(result.data.agent);
      return { success: true };
    }
    return { success: false, error: result.error ?? 'Login failed' };
  }, []);

  const logout = useCallback(async () => {
    await ipc('auth:logout');
    localStorage.removeItem('bingo_token');
    setUser(null);
    setAgent(null);
  }, []);

  const refreshBalance = useCallback(async () => {
    const balance = await ipc<number>('wallet:balance');
    setAgent((prev) => prev ? { ...prev, walletBalance: balance } : null);
  }, []);

  const refreshAgent = useCallback(async () => {
    const profile = await ipc<{
      commissionRate: number;
      adminCommissionRate: number;
      walletBalance: number;
    } | null>('agents:profile');
    if (profile) {
      setAgent((prev) => prev ? { ...prev, ...profile } : null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, agent, isLoading, login, logout, refreshBalance, refreshAgent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
