import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function StudentGradeGate() {
  const { user, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) return null;

  if (!user?.grade) {
    const from = `${location.pathname}${location.search || ""}`;
    return <Navigate to="/student/select-grade" replace state={{ from }} />;
  }

  return <Outlet />;
}
