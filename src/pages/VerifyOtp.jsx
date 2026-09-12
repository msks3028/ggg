import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { api } from "@/api/apiClient";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || localStorage.getItem("lurnova_pending_email") || "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) navigate("/register", { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const verify = async (value = code) => {
    if (!/^\d{6}$/.test(value)) return setError("أدخل كود التحقق المكوّن من 6 أرقام.");
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const result = await api.auth.verifyOtp(email, value);
      localStorage.removeItem("lurnova_pending_email");
      localStorage.setItem("user", JSON.stringify(result.user));
      const target = result.user?.role === "TEACHER" ? "/teacher" : (result.user?.grade ? "/student" : "/student/select-grade");
      window.location.replace(target);
    } catch (err) {
      setError(err?.message || "كود التحقق غير صحيح.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown) return;
    setError("");
    setMessage("");
    setResending(true);
    try {
      await api.auth.resendOtp(email);
      setMessage("تم إرسال كود جديد إلى بريدك الإلكتروني.");
      setCooldown(60);
    } catch (err) {
      setError(err?.message || "تعذر إرسال كود جديد الآن.");
    } finally {
      setResending(false);
    }
  };

  const cancel = async () => {
    localStorage.removeItem("lurnova_pending_email");
    navigate("/register", { replace: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f7fb] px-5 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_25px_70px_-35px_rgba(15,23,42,.35)] sm:p-9">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"><MailCheck className="h-7 w-7" /></div>
            <h1 className="text-3xl font-black">تأكيد البريد الإلكتروني</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">أرسلنا كودًا مكوّنًا من 6 أرقام إلى</p>
            <p className="mt-1 font-bold text-slate-800" dir="ltr">{email}</p>
          </div>

          {error && <div className="mb-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{error}</div>}
          {message && <div className="mb-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">{message}</div>}

          <div className="flex justify-center" dir="ltr">
            <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={verify} disabled={loading} inputMode="numeric" autoFocus>
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} className="h-14 w-12 text-xl font-black" />)}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button onClick={() => verify()} disabled={loading || code.length !== 6} className="mt-7 h-12 w-full rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700">
            {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري التأكيد...</> : "تأكيد الكود"}
          </Button>

          <Button variant="ghost" onClick={resend} disabled={resending || cooldown > 0} className="mt-3 h-11 w-full rounded-xl font-bold text-indigo-600 hover:bg-indigo-50">
            {resending ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري إرسال الكود...</> : <><RefreshCw className="ml-2 h-4 w-4" /> {cooldown ? `إعادة الإرسال بعد ${cooldown} ثانية` : "إرسال كود جديد"}</>}
          </Button>

          <div className="mt-7 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">
            <div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> الكود صالح لفترة محدودة. لا تشارك الكود مع أي شخص.</div>
          </div>

          <button onClick={cancel} className="mt-6 flex w-full items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800">
            <ArrowRight className="h-4 w-4" /> العودة لإنشاء الحساب
          </button>
        </div>
      </div>
    </div>
  );
}
