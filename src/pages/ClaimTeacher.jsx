import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
export default function ClaimTeacher(){const {user}=useAuth();return <Navigate to={user?.role==="TEACHER"?"/teacher":"/student"} replace/>;}
