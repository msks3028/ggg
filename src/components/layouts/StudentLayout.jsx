import React from "react";
import { LayoutDashboard, BookOpen, TrendingUp, ClipboardList, Bell, User, Award, PlaySquare, FileText, ClipboardCheck, Sparkles } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
const navItems = [
  {label:"الرئيسية",path:"/student",icon:LayoutDashboard,end:true},
  {label:"كورساتي",path:"/student/courses",icon:BookOpen},
  {label:"الفيديوهات",path:"/student/videos",icon:PlaySquare},
  {label:"الملفات والملازم",path:"/student/files",icon:FileText},
  {label:"الاختبارات",path:"/student/exams",icon:ClipboardCheck},
  {label:"واجباتي",path:"/student/assignments",icon:ClipboardList},
  {label:"المساعد الذكي",path:"/student/ai",icon:Sparkles},
  {label:"تقدّمي",path:"/student/progress",icon:TrendingUp},
  {label:"نتائجي",path:"/student/results",icon:Award},
  {label:"الإشعارات",path:"/student/notifications",icon:Bell},
  {label:"حسابي",path:"/student/profile",icon:User},
];
export default function StudentLayout(){return <DashboardLayout navItems={navItems} allowedRole="STUDENT" brandTitle="مدرستي" brandSubtitle="مساحة الطالب" accent="violet"/>;}