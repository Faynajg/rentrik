import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getOwnerToken, portalApi, setOwnerToken } from "../api/client";

export interface OwnerInfo {
  id: string;
  name: string;
  email: string | null;
}

interface OwnerAuthValue {
  owner: OwnerInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const OwnerAuthContext = createContext<OwnerAuthValue | null>(null);

export function OwnerAuthProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<OwnerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getOwnerToken();
    if (!token) {
      setLoading(false);
      return;
    }
    portalApi
      .get<{ owner: OwnerInfo }>("/portal/me")
      .then((res) => setOwner(res.data.owner))
      .catch(() => setOwnerToken(null))
      .finally(() => setLoading(false));
  }, []);

  const value: OwnerAuthValue = {
    owner,
    loading,
    login: async (email, password) => {
      const res = await portalApi.post<{ token: string; owner: OwnerInfo }>("/portal/login", { email, password });
      setOwnerToken(res.data.token);
      setOwner(res.data.owner);
    },
    logout: () => {
      setOwnerToken(null);
      setOwner(null);
    },
  };

  return <OwnerAuthContext.Provider value={value}>{children}</OwnerAuthContext.Provider>;
}

export function useOwnerAuth(): OwnerAuthValue {
  const ctx = useContext(OwnerAuthContext);
  if (!ctx) throw new Error("useOwnerAuth debe usarse dentro de OwnerAuthProvider");
  return ctx;
}
