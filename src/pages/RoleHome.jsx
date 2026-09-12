import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { roleHome } from "@/lib/roles";
export default function RoleHome(){const {user}=useAuth(); return <Navigate to={roleHome(user?.role)} replace/>;}
