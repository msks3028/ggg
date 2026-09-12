import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { AuthProvider } from "@/lib/AuthContext";
import { SiteBrandProvider } from "@/lib/SiteBrandContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import TeacherLayout from "@/components/layouts/TeacherLayout";
import StudentLayout from "@/components/layouts/StudentLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyOtp from "@/pages/VerifyOtp";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import RoleHome from "@/pages/RoleHome";
import TeacherDashboard from "@/pages/teacher/TeacherDashboard";
import TeacherStudents from "@/pages/teacher/TeacherStudents";
import TeacherLessons from "@/pages/teacher/TeacherLessons";
import TeacherCourses from "@/pages/teacher/TeacherCourses";
import TeacherCourseManager from "@/pages/teacher/TeacherCourseManager";
import TeacherVideos from "@/pages/teacher/TeacherVideos";
import TeacherFiles from "@/pages/teacher/TeacherFiles";
import TeacherAnalytics from "@/pages/teacher/TeacherAnalytics";
import TeacherProfile from "@/pages/teacher/TeacherProfile";
import TeacherMyPage from "@/pages/teacher/TeacherMyPage";
import TeacherInvites from "@/pages/teacher/TeacherInvites";
import StudentHome from "@/pages/student/StudentHome";
import StudentGradeSelection from "@/pages/student/StudentGradeSelection";
import StudentGradeGate from "@/components/StudentGradeGate";
import StudentCourses from "@/pages/student/StudentCourses";
import StudentCourseDetail from "@/pages/student/StudentCourseDetail";
import StudentProgress from "@/pages/student/StudentProgress";
import StudentResults from "@/pages/student/StudentResults";
import StudentAssignments from "@/pages/student/StudentAssignments";
import StudentVideos from "@/pages/student/StudentVideos";
import StudentFiles from "@/pages/student/StudentFiles";
import StudentExams from "@/pages/student/StudentExams";
import StudentNotifications from "@/pages/student/StudentNotifications";
import StudentProfile from "@/pages/student/StudentProfile";
import TeacherPublicPage from "@/pages/public/TeacherPublicPage";
import LessonViewPage from "@/pages/public/LessonViewPage";
import MaterialViewPage from "@/pages/public/MaterialViewPage";
import ExamTakePage from "@/pages/public/ExamTakePage";
import AssignmentSubmitPage from "@/pages/public/AssignmentSubmitPage";
import TeacherExams from "@/pages/teacher/TeacherExams";
import TeacherAssignments from "@/pages/teacher/TeacherAssignments";
import TeacherAnnouncements from "@/pages/teacher/TeacherAnnouncements";
import TeacherAICurriculum from "@/pages/teacher/TeacherAICurriculum";
import StudentAI from "@/pages/student/StudentAI";
import PageNotFound from "@/lib/PageNotFound";
import LandingPage from "@/pages/LandingPage";

function AppRoutes(){
  return <Routes>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/verify-otp" element={<VerifyOtp/>}/>
    <Route path="/forgot-password" element={<ForgotPassword/>}/>
    <Route path="/reset-password" element={<ResetPassword/>}/>
    <Route path="/" element={<LandingPage/>}/>

    <Route element={<ProtectedRoute/>}>
      <Route path="/teacher/:slug" element={<TeacherPublicPage/>}/>
      <Route path="/teacher/:slug/lesson/:lessonId" element={<LessonViewPage/>}/>
      <Route path="/lesson/:lessonId" element={<LessonViewPage/>}/>
      <Route path="/material/:materialId" element={<MaterialViewPage/>}/>
      <Route path="/teacher/:slug/exam/:examId" element={<ExamTakePage/>}/>
      <Route path="/student/exam/:examId" element={<ExamTakePage/>}/>
      <Route path="/teacher/:slug/assignment/:assignmentId" element={<AssignmentSubmitPage/>}/>
      <Route path="/student/assignment/:assignmentId" element={<AssignmentSubmitPage/>}/>
    </Route>

    <Route element={<ProtectedRoute allowedRole="TEACHER"/>}>
      <Route element={<TeacherLayout/>}>
        <Route path="/teacher" element={<TeacherDashboard/>}/>
        <Route path="/teacher/students" element={<TeacherStudents/>}/>
        <Route path="/teacher/courses" element={<TeacherCourses/>}/>
        <Route path="/teacher/courses/:courseId" element={<TeacherCourseManager/>}/>
        <Route path="/teacher/lessons" element={<TeacherLessons/>}/>
        <Route path="/teacher/videos" element={<TeacherVideos/>}/>
        <Route path="/teacher/files" element={<TeacherFiles/>}/>
        <Route path="/teacher/invites" element={<TeacherInvites/>}/>
        <Route path="/teacher/analytics" element={<TeacherAnalytics/>}/>
        <Route path="/teacher/profile" element={<TeacherMyPage/>}/>
        <Route path="/teacher/exams" element={<TeacherExams/>}/>
        <Route path="/teacher/assignments" element={<TeacherAssignments/>}/>
        <Route path="/teacher/announcements" element={<TeacherAnnouncements/>}/>
        <Route path="/teacher/ai-curriculum" element={<TeacherAICurriculum/>}/>
      </Route>
    </Route>

    <Route element={<ProtectedRoute allowedRole="STUDENT"/>}>
      <Route element={<StudentLayout/>}>
        <Route path="/student/select-grade" element={<StudentGradeSelection/>}/>
        <Route element={<StudentGradeGate/>}>
          <Route path="/student" element={<StudentHome/>}/>
          <Route path="/student/courses" element={<StudentCourses/>}/>
          <Route path="/student/courses/:courseId" element={<StudentCourseDetail/>}/>
          <Route path="/student/progress" element={<StudentProgress/>}/>
          <Route path="/student/results" element={<StudentResults/>}/>
          <Route path="/student/assignments" element={<StudentAssignments/>}/>
          <Route path="/student/videos" element={<StudentVideos/>}/>
          <Route path="/student/files" element={<StudentFiles/>}/>
          <Route path="/student/exams" element={<StudentExams/>}/>
          <Route path="/student/ai" element={<StudentAI/>}/>
          <Route path="/student/notifications" element={<StudentNotifications/>}/>
          <Route path="/student/profile" element={<StudentProfile/>}/>
        </Route>
      </Route>
    </Route>

    <Route path="/teacher-dashboard" element={<Navigate to="/teacher" replace/>}/>
    <Route path="/teacher-dashboard/*" element={<Navigate to="/teacher" replace/>}/>
    <Route path="/claim-teacher" element={<Navigate to="/" replace/>}/>
    <Route path="*" element={<PageNotFound/>}/>
  </Routes>;
}

export default function App(){
  return <AuthProvider><SiteBrandProvider><QueryClientProvider client={queryClientInstance}><BrowserRouter><AppRoutes/></BrowserRouter></QueryClientProvider></SiteBrandProvider></AuthProvider>;
}