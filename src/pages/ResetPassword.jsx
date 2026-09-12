import React from "react";
import { Link } from "react-router-dom";
export default function ResetPassword() {
  return <div dir="rtl" className="min-h-screen grid place-items-center bg-slate-50 px-5"><div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl"><h1 className="text-2xl font-black">إعادة تعيين كلمة المرور</h1><p className="mt-3 text-sm leading-6 text-slate-500">استخدم رابط إعادة التعيين الذي وصلك عبر البريد الإلكتروني من النظام.</p><Link to="/login" className="mt-6 inline-block font-bold text-indigo-600">العودة لتسجيل الدخول</Link></div></div>;
}
