import React from "react";
import { LayoutDashboard, Users, BookOpen, Link2, BarChart3, Settings, Video, FileText, ClipboardCheck, ClipboardList, Megaphone, Sparkles } from "lucide-react";
import DashboardLayout from "./DashboardLayout";

const navItems = [
  {label:"الرئيسية",path:"/teacher",icon:LayoutDashboard,end:true},
  {label:"الطلاب",path:"/teacher/students",icon:Users},
  {label:"الصفوف والكورسات",path:"/teacher/courses",icon:BookOpen},
  {label:"فيديوهات المستر",path:"/teacher/lessons",icon:Video},
  {label:"مشاهدات الفيديوهات",path:"/teacher/videos",icon:Video},
  {label:"الاختبارات",path:"/teacher/exams",icon:ClipboardCheck},
  {label:"الواجبات",path:"/teacher/assignments",icon:ClipboardList},
  {label:"الإعلانات",path:"/teacher/announcements",icon:Megaphone},
  {label:"الملفات",path:"/teacher/files",icon:FileText},
  {label:"دعوة الطلاب",path:"/teacher/invites",icon:Link2},
  {label:"الإحصائيات",path:"/teacher/analytics",icon:BarChart3},
  {label:"المساعد الذكي",path:"/teacher/ai-curriculum",icon:Sparkles},
  {label:"الإعدادات",path:"/teacher/profile",icon:Settings},
];

export default function TeacherLayout() {
  return <DashboardLayout navItems={navItems} allowedRole="TEACHER" brandTitle="مدرستي" brandSubtitle="لوحة المدرّس" accent="indigo" />;
}
