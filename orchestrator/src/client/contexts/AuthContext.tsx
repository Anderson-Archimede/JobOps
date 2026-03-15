import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { User, AuthResponse } from "@shared/types/auth";
import { getApiBase } from "@/lib/apiBase";
import { setAccessToken as setInterceptorToken } from "../utils/axiosInterceptor";
import { toast } from "sonner";

const GUEST_USER_ID = "00000000-0000-0000-0000-000000000001";

const guestUser: User = {
  id: GUEST_USER_ID,
  email: "guest@jobops.local",
  firstName: "Guest",
  lastName: "User",
  profileData: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState(false);

  const updateAccessToken = useCallback((token: string | null) => {
    setAccessToken(token);
    setInterceptorToken(token);
    if (token) {
      localStorage.setItem("accessToken", token);
    } else {
      localStorage.removeItem("accessToken");
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${getApiBase()}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        updateAccessToken(null);
        setUser(null);
        return false;
      }

      const resData = await response.json();
      if (resData.ok) {
        updateAccessToken(resData.data.accessToken);

        // Fetch user data if we have a token
        const userResponse = await fetch(`${getApiBase()}/auth/me`, {
          headers: {
            Authorization: `Bearer ${resData.data.accessToken}`,
          },
        });

        if (userResponse.ok) {
          const userResData = await userResponse.json();
          if (userResData.ok) {
            setUser(userResData.data);
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      updateAccessToken(null);
      setUser(null);
      return false;
    }
  }, [updateAccessToken]);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${getApiBase()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const resData = await response.json();
    if (!response.ok || !resData.ok) {
      throw new Error(resData.error?.message || "Login failed");
    }

    updateAccessToken(resData.data.accessToken);
    setUser(resData.data.user);
    toast.success("Welcome back!");
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const response = await fetch(`${getApiBase()}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName, lastName }),
      credentials: "include",
    });

    const resData = await response.json();
    if (!response.ok || !resData.ok) {
      throw new Error(resData.error?.message || "Registration failed");
    }

    // After register, we might want to login or redirected to login
    toast.success("Registration successful! Please login.");
  };

  const logout = async () => {
    try {
      await fetch(`${getApiBase()}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      updateAccessToken(null);
      setUser(null);
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      if (import.meta.env.VITE_AUTH_ENABLED === "false") {
        if (!cancelled) {
          setAuthEnabled(false);
          setUser(guestUser);
          setIsLoading(false);
        }
        return;
      }

      let serverWantsAuth = false;
      try {
        const healthRes = await fetch(`${getApiBase()}/health`, { signal: AbortSignal.timeout(4000) });
        const healthData = await healthRes.json().catch(() => ({}));
        serverWantsAuth = healthData.authEnabled === true;
      } catch {
        serverWantsAuth = false;
      }

      if (cancelled) return;

      if (!serverWantsAuth) {
        setAuthEnabled(false);
        setUser(guestUser);
        setIsLoading(false);
        return;
      }

      setAuthEnabled(true);
      const savedToken = localStorage.getItem("accessToken");
      if (savedToken) {
        updateAccessToken(savedToken);
      }
      await refreshToken();
      if (!cancelled) setIsLoading(false);
    };

    initAuth();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextType = {
    user,
    accessToken,
    isAuthenticated: !!user,
    isLoading,
    authEnabled,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
