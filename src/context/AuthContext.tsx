import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface SessionInfo {
  username: string;
  role: "ADMIN" | "OPERATOR";
  mustChangePassword: boolean;
}

interface AuthContextType {
  session: SessionInfo | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSession(raw: {
  username: string;
  role: string;
  must_change_password: boolean;
}): SessionInfo {
  return {
    username: raw.username,
    role: raw.role === "ADMIN" ? "ADMIN" : "OPERATOR",
    mustChangePassword: raw.must_change_password,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const current = await invoke<{
        username: string;
        role: string;
        must_change_password: boolean;
      } | null>("get_session");
      setSession(current ? mapSession(current) : null);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false));
  }, [refreshSession]);

  const login = async (username: string, password: string) => {
    const result = await invoke<{
      username: string;
      role: string;
      must_change_password: boolean;
    }>("login", { username, password });
    setSession(mapSession(result));
  };

  const logout = async () => {
    await invoke("logout");
    setSession(null);
  };

  const clearMustChangePassword = () => {
    setSession((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
  };

  return (
    <AuthContext.Provider
      value={{ session, isLoading, login, logout, refreshSession, clearMustChangePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useRequireAuth() {
  const auth = useAuth();
  if (!auth.session) {
    throw new Error("Authentication required.");
  }
  return { ...auth, session: auth.session };
}
