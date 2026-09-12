import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Mail, Lock, Loader2, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GRADES } from "@/lib/grades";
import { api } from "@/api/apiClient";

function message(error) {
  const code = error?.code || "";
  if (code === "EMAIL_ALREADY_EXISTS") return "الحساب ده موجود بالفعل. ارجع لتسجيل الدخول بدل إنشاء حساب جديد.";
  if (code === "INVALID_EMAIL") return "اكتب بريدًا إلكترونيًا صحيحًا.";
  if (code === "WEAK_PASSWORD") return "كلمة المرور لازم تكون 8 أحرف على الأقل.";
  if (code === "OTP_SEND_FAILED") return "تعذر إرسال كود التحقق الآن. تأكد من إعداد Gmail SMTP ثم حاول مرة أخرى.";
  
  return error?.message || "تعذر إنشاء الحساب.";
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({name:"", email:"", password:"", confirm:"", grade:""});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key, value) => setForm(v => ({...v, [key]:value}));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("اكتب اسمك الكامل.");
    if (!form.grade) return setError("اختار الصف الدراسي.");
    if (form.password.length < 8) return setError("كلمة المرور لازم تكون 8 أحرف على الأقل.");
    if (form.password !== form.confirm) return setError("كلمتا المرور غير متطابقتين.");

    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();
      await api.auth.register({email, password:form.password, full_name:form.name.trim(), grade:form.grade});
      localStorage.setItem("lurnova_pending_email", email);
      navigate("/verify-otp", {replace:true, state:{email}});
    } catch (err) {
      setError(message(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 px-5 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg items-center">
        <div className="w-full rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-white"><GraduationCap className="h-7 w-7"/></div>
            <h1 className="text-3xl font-black">إنشاء حساب طالب</h1>
            <p className="mt-2 text-sm text-slate-500">املأ بياناتك، وبعدها هنرسل كود 6 أرقام إلى بريدك.</p>
          </div>
          {error && <div className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-700">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div><label className="mb-2 block text-sm font-bold">الاسم الكامل</label><Input required value={form.name} onChange={e=>set("name",e.target.value)} placeholder="اكتب اسمك" className="h-12 rounded-xl"/></div>
            <div><label className="mb-2 block text-sm font-bold">البريد الإلكتروني</label><div className="relative"><Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input required type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="name@example.com" dir="ltr" className="h-12 rounded-xl pr-10"/></div></div>
            <div><label className="mb-2 block text-sm font-bold">الصف الدراسي</label><select required value={form.grade} onChange={e=>set("grade",e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{<option value="">اختار صفك الدراسي</option>}{GRADES.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
            <div><label className="mb-2 block text-sm font-bold">كلمة المرور</label><div className="relative"><Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input required type="password" value={form.password} onChange={e=>set("password",e.target.value)} placeholder="8 أحرف على الأقل" dir="ltr" className="h-12 rounded-xl pr-10"/></div></div>
            <div><label className="mb-2 block text-sm font-bold">تأكيد كلمة المرور</label><Input required type="password" value={form.confirm} onChange={e=>set("confirm",e.target.value)} placeholder="أعد كتابة كلمة المرور" dir="ltr" className="h-12 rounded-xl"/></div>
            <Button disabled={loading} className="h-12 w-full rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700">{loading?<><Loader2 className="ml-2 h-4 w-4 animate-spin"/> جاري إنشاء الحساب...</>:<><UserPlus className="ml-2 h-4 w-4"/> إنشاء الحساب وإرسال الكود</>}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">عندك حساب بالفعل؟ <Link to="/login" className="font-bold text-indigo-600">تسجيل الدخول</Link></p>
        </div>
      </div>
    </main>
  );
}
