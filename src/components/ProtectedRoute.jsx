import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { normalizeRole } from "@/lib/roles";

export default function ProtectedRoute({ allowedRole }) {
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f6f8fc]">
        <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRole && normalizeRole(user?.role) !== allowedRole) {
    return <Navigate to={user?.role === "TEACHER" ? "/teacher" : "/student"} replace />;
  }

  return <Outlet />;
}
