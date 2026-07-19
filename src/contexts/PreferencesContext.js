import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api/client";
import { useAuth } from "./AuthContext";

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const { user, setUser } = useAuth();
  const { i18n } = useTranslation();
  const [theme, setThemeState] = useState(
    () => localStorage.getItem("theme") || user?.theme || "light"
  );
  const [language, setLanguageState] = useState(
    () => localStorage.getItem("language") || user?.language || "en"
  );

  useEffect(() => {
    if (user?.theme) setThemeState(user.theme);
    if (user?.language) setLanguageState(user.language);
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
    document.body.classList.toggle("theme-dark", theme === "dark");
    document.body.classList.toggle("theme-light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    i18n.changeLanguage(language);
    localStorage.setItem("language", language);
  }, [language, i18n]);

  const persistPrefs = useCallback(
    async (next) => {
      if (!user) return;
      try {
        const { data } = await api.patch("/auth/me/preferences", next);
        setUser(data);
      } catch {
        /* local prefs still applied */
      }
    },
    [user, setUser]
  );

  const setTheme = useCallback(
    (value) => {
      setThemeState(value);
      persistPrefs({ theme: value });
    },
    [persistPrefs]
  );

  const setLanguage = useCallback(
    (value) => {
      setLanguageState(value);
      persistPrefs({ language: value });
    },
    [persistPrefs]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, language, setTheme, setLanguage, toggleTheme }),
    [theme, language, setTheme, setLanguage, toggleTheme]
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}