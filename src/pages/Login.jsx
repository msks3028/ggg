import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/api/apiClient";

const TEACHER_EMAIL = "mostafakareem978@gmail.com";

function errorMessage(error) {
  const code = error?.code || "";
  if (code === "INVALID_CREDENTIALS") return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (code === "EMAIL_NOT_VERIFIED") return "حسابك يحتاج تأكيد البريد. سنرسل لك كود التحقق.";
  if (code === "ACCOUNT_DISABLED") return "هذا الحساب غير متاح حاليًا.";
  return error?.message || "تعذر تسجيل الدخول. حاول مرة أخرى.";
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const normalized = email.trim().toLowerCase();
    setLoading(true);
    try {
      const account = await api.auth.checkEmail(normalized);
      if (!account?.exists) {
        setError("البريد الإلكتروني ده مش مسجل على المنصة. لازم تعمل إنشاء حساب طالب الأول.");
        return;
      }

      if (account.verified === false) {
        localStorage.setItem("lurnova_pending_email", normalized);
        try { await api.auth.resendOtp(normalized); } catch {}
        navigate("/verify-otp", { replace: true, state: { email: normalized } });
        return;
      }

      const result = await api.auth.loginViaEmailPassword(normalized, password);
      const user = result?.user;
      if (!user) throw new Error("تعذر إنشاء جلسة المنصة.");

      localStorage.setItem("user", JSON.stringify(user));
      const isTeacher = normalized === TEACHER_EMAIL;
      const target = isTeacher ? "/teacher" : (user.grade ? "/student" : "/student/select-grade");
      const from = location.state?.from?.pathname;
      navigate(from && !from.startsWith("/teacher") ? from : target, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        <section className="hidden lg:flex flex-col justify-center px-14 text-white">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500"><GraduationCap /></div>
            <div><div className="text-2xl font-black">مدرستي</div><div className="text-sm text-white/50">منصة تعليمية</div></div>
          </div>
          <h1 className="text-5xl font-black leading-tight">أهلاً بك في<br/><span className="text-indigo-300">رحلتك التعليمية.</span></h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-white/60">سجّل دخولك للوصول إلى الدروس والكورسات والمتابعة الخاصة بك.</p>
        </section>

        <section className="flex items-center justify-center bg-white px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 text-white"><GraduationCap /></div>
              <div className="text-xl font-black text-slate-900">مدرستي</div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 p-7 shadow-sm sm:p-9">
              <h2 className="text-3xl font-black text-slate-900">تسجيل الدخول</h2>
              <p className="mt-2 text-sm text-slate-500">ادخل بالبريد وكلمة المرور الخاصة بحسابك على المنصة.</p>

              {error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">{error}</div>}

              <form onSubmit={submit} className="mt-7 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold">البريد الإلكتروني</label>
                  <div className="relative"><Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
                    <Input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" dir="ltr" className="h-12 rounded-xl pr-10"/>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-bold">كلمة المرور</label>
                    <Link to="/forgot-password" className="text-xs font-bold text-indigo-600">نسيت كلمة المرور؟</Link>
                  </div>
                  <div className="relative"><Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
                    <Input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" dir="ltr" className="h-12 rounded-xl pr-10"/>
                  </div>
                </div>
                <Button disabled={loading} className="h-12 w-full rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700">
                  {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin"/> جاري التحقق...</> : "تسجيل الدخول"}
                </Button>
              </form>

              <div className="my-7 flex items-center gap-3"><div className="h-px flex-1 bg-slate-200"/><span className="text-xs text-slate-400">أول مرة هنا؟</span><div className="h-px flex-1 bg-slate-200"/></div>
              <Link to="/register" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 font-bold text-slate-800 hover:bg-slate-50">إنشاء حساب طالب <ArrowLeft className="h-4 w-4"/></Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
