import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("token")));

  const persist = useCallback((token, nextUser) => {
    if (token) localStorage.setItem("token", token);
    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
      if (nextUser.theme) localStorage.setItem("theme", nextUser.theme);
      if (nextUser.language) localStorage.setItem("language", nextUser.language);
    }
    setUser(nextUser);
  }, []);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const { data } = await api.get("/auth/me");
      persist(token, data);
      return data;
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    persist(data.token, data.user);
    return data.user;
  }, [persist]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    persist(data.token, data.user);
    return data.user;
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const loginWithToken = useCallback(async (token) => {
    localStorage.setItem("token", token);
    return refresh();
  }, [refresh]);

  const hasRole = useCallback(
    (...roles) => {
      if (!user) return false;
      const userRoles = user.roles || [];
      if (userRoles.includes("admin")) return true;
      return roles.some((r) => userRoles.includes(r));
    },
    [user]
  );

  const setUserSafe = useCallback(
    (u) => persist(localStorage.getItem("token"), u),
    [persist]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refresh,
      loginWithToken,
      hasRole,
      setUser: setUserSafe,
    }),
    [user, loading, login, register, logout, refresh, loginWithToken, hasRole, setUserSafe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}