import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/api/apiClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const start = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const normalized = email.trim().toLowerCase();
      await api.auth.startPasswordReset(normalized);
      setEmail(normalized); setStep("reset");
    } catch (err) { setError(err?.message || "تعذر إرسال كود الاستعادة."); }
    finally { setLoading(false); }
  };

  const reset = async (e) => {
    e.preventDefault(); setError("");
    if (!/^\d{6}$/.test(code)) return setError("أدخل كود التحقق المكوّن من 6 أرقام.");
    if (password.length < 8) return setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
    setLoading(true);
    try {
      await api.auth.resetPassword(email, code, password);
      setDone(true);
    } catch (err) { setError(err?.message || "تعذر تغيير كلمة المرور."); }
    finally { setLoading(false); }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f7fb] grid place-items-center px-5">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
        <Link to="/login" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"><ArrowRight className="h-4 w-4" /> العودة للدخول</Link>
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-white"><BookOpen className="h-7 w-7" /></div>
          <h1 className="text-2xl font-black">استعادة كلمة المرور</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{step === "email" ? "أدخل بريدك وسنرسل لك كود تحقق من 6 أرقام." : `أدخل الكود المرسل إلى ${email} ثم اختر كلمة مرور جديدة.`}</p>
        </div>
        {done ? (
          <div className="rounded-2xl bg-emerald-50 p-5 text-center text-emerald-700"><CheckCircle2 className="mx-auto mb-2 h-8 w-8" /><p className="font-bold">تم تغيير كلمة المرور بنجاح</p><Link to="/login" className="mt-3 inline-block font-bold">تسجيل الدخول</Link></div>
        ) : step === "email" ? (
          <form onSubmit={start} className="space-y-4">
            {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            <div className="relative"><Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" className="h-12 rounded-xl pr-10" dir="ltr" /></div>
            <Button disabled={loading} className="h-12 w-full rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "إرسال كود الاستعادة"}</Button>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-4">
            {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            <Input required inputMode="numeric" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="كود من 6 أرقام" className="h-12 rounded-xl text-center text-xl tracking-[.5em]" dir="ltr" />
            <Input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور الجديدة" className="h-12 rounded-xl" dir="ltr" />
            <Button disabled={loading} className="h-12 w-full rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "تغيير كلمة المرور"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
