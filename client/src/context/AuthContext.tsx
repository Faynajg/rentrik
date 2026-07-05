import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, applyAuthHeader, getStoredToken, setStoredToken } from "../api/client";
import { User } from "../types";
import { setActiveCurrency } from "../lib/format";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  companyName?: string;
  plan?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mantiene la moneda de formato sincronizada con el usuario.
  useEffect(() => {
    setActiveCurrency(user?.currency ?? "EUR");
  }, [user?.currency]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    applyAuthHeader(token);
    api
      .get<{ user: User }>("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => {
        setStoredToken(null);
        applyAuthHeader(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleAuth(path: string, body: unknown) {
    const res = await api.post<{ token: string; user: User }>(path, body);
    setStoredToken(res.data.token);
    applyAuthHeader(res.data.token);
    setUser(res.data.user);
  }

  const value: AuthContextValue = {
    user,
    loading,
    login: (email, password) => handleAuth("/auth/login", { email, password }),
    register: (data) => handleAuth("/auth/register", data),
    logout: () => {
      setStoredToken(null);
      applyAuthHeader(null);
      setUser(null);
    },
    refreshUser: async () => {
      const res = await api.get<{ user: User }>("/auth/me");
      setUser(res.data.user);
    },
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
