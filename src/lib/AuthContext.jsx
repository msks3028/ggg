import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/api/apiClient";
import { apiUrl } from "@/lib/apiBase";

const AuthContext = createContext(null);

const DEMO_SESSION_KEY = "lurnova_demo_session_v1";

const DEMO_USERS = {
  TEACHER: { id: "demo-teacher", full_name: "الأستاذ التجريبي", email: "demo-teacher@lurnova.local", role: "TEACHER", grade: null, email_verified: true },
  STUDENT: { id: "demo-student", full_name: "الطالب التجريبي", email: "demo-student@lurnova.local", role: "STUDENT", grade: "الصف الأول الإعدادي", email_verified: true },
};

function getDemoUser() {
  try {
    const role = localStorage.getItem(DEMO_SESSION_KEY);
    return role === "TEACHER" || role === "STUDENT" ? DEMO_USERS[role] : null;
  } catch {
    return null;
  }
}

async function getSession() {
  const headers = {};
  try {
    const role = String(localStorage.getItem(DEMO_SESSION_KEY) || "").toUpperCase();
    if (role === "TEACHER" || role === "STUDENT") headers["X-Lurnova-Demo-Role"] = role;
  } catch {}
  const response = await fetch(apiUrl("/api/auth/me"), { credentials: "include", cache: "no-store", headers });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("تعذر التحقق من جلسة تسجيل الدخول.");
  const data = await response.json();
  return data?.authenticated ? data.user : null;
}
function persistUser(user) {
  if (user) {
    localStorage.setItem("education_platform_session_v1", JSON.stringify({ id: user.id }));
    localStorage.setItem("user", JSON.stringify(user));
  } else {
    localStorage.removeItem("education_platform_session_v1");
    localStorage.removeItem("user");
  }
}
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const checkUserAuth = useCallback(async () => {
    setAuthError(null);
    try {
      const demoUser = getDemoUser();
      if (demoUser) {
        setUser(demoUser);
        persistUser(demoUser);
        return demoUser;
      }
      const next = await getSession();
      setUser(next); persistUser(next); return next;
    } catch (error) {
      setUser(null); persistUser(null);
      setAuthError(error?.message || "تعذر التحقق من تسجيل الدخول.");
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    checkUserAuth().finally(() => { if (active) setIsLoadingAuth(false); });
    return () => { active = false; };
  }, [checkUserAuth]);

  const logout = useCallback(async (redirect = true) => {
    try { await api.auth.logout(); } catch {} finally {
      localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null); persistUser(null);
      if (redirect) window.location.replace("/login");
    }
  }, []);

  const enterDemoRole = useCallback((role) => {
    const normalized = String(role || "").toUpperCase();
    const demoUser = DEMO_USERS[normalized];
    if (!demoUser) return;
    localStorage.setItem(DEMO_SESSION_KEY, normalized);
    persistUser(demoUser);
    setUser(demoUser);
  }, []);

  const navigateToLogin = useCallback((returnTo = "/") => {
    const suffix = returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    window.location.replace(`/login${suffix}`);
  }, []);

  const value = useMemo(() => ({
    user, isAuthenticated: Boolean(user), isLoadingAuth,
    isLoadingPublicSettings: false, authError, authChecked: !isLoadingAuth,
    appPublicSettings: { standalone: true }, logout, enterDemoRole, navigateToLogin, checkUserAuth,
    checkAppState: async () => {},
  }), [user, isLoadingAuth, authError, logout, enterDemoRole, navigateToLogin, checkUserAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
