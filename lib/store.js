'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const getStoredAuth = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem('auth');
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    if (parsed?.state) {
      return parsed.state;
    }

    if (parsed?.token || parsed?.user) {
      return {
        user: parsed.user || null,
        token: parsed.token || null,
        isAuthenticated: !!parsed.token,
      };
    }
  } catch {
    return null;
  }

  return null;
};

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: !!token,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),

      isAdmin: () => {
        const role = getStoredAuth()?.user?.role;
        return role === 'admin' || role === 'super_admin';
      },
    }),
    {
      name: 'auth',
    }
  )
);
