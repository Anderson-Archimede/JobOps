import React, { createContext, useState, useEffect, useCallback } from "react";
import axios from "./axiosConfig";

interface User {
  id: string;
  email: string;
  profile: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await axios.get("/auth/me");
      if (res.data.ok) {
        setUser(res.data.data);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (credentials: any) => {
    const res = await axios.post("/auth/login", credentials);
    if (res.data.ok) {
      localStorage.setItem("accessToken", res.data.data.accessToken);
      setUser(res.data.data.user);
    }
  };

  const register = async (data: any) => {
    const res = await axios.post("/auth/register", data);
    if (res.data.ok) {
       // Registration doesn't log in automatically in this flow
    }
  };

  const logout = async () => {
    try {
      await axios.post("/auth/logout");
    } finally {
      localStorage.removeItem("accessToken");
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
