import React, { useState } from "react";
import { Copy, Link2, Mail, Check, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TeacherInvites() {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const inviteUrl = `${window.location.origin}/register`;

  const copy = async () => {
    await navigator.clipboard?.writeText(inviteUrl);
    setCopied(true); setTimeout(()=>setCopied(false),1600);
  };
  return <div className="space-y-6">
    <div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700"><Sparkles className="h-3.5 w-3.5" /> نمو صفك الدراسي</div><h1 className="text-3xl font-black tracking-tight">دعوة الطلاب</h1><p className="mt-2 text-sm text-slate-500">شارك رابط التسجيل مع طلابك أو أرسل لهم دعوة بالبريد.</p></div>
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Link2 /></div><h2 className="text-lg font-black">رابط التسجيل</h2><p className="mt-2 text-sm text-slate-500">أي طالب يسجل من هذا الرابط يحصل تلقائيًا على دور طالب.</p><div className="mt-5 flex gap-2"><input readOnly value={inviteUrl} dir="ltr" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 outline-none" /><Button onClick={copy} className="rounded-xl bg-indigo-600">{copied?<Check/>:<Copy/>}</Button></div></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Mail /></div><h2 className="text-lg font-black">دعوة بالبريد</h2><p className="mt-2 text-sm text-slate-500">واجهة جاهزة لإدارة عناوين الطلاب. إرسال البريد الفعلي يحتاج مزود بريد من الخادم.</p><div className="mt-5 flex gap-2"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="student@example.com" dir="ltr" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400" /><Button onClick={()=>{setSent(true);setEmail("")}} disabled={!email} className="rounded-xl bg-slate-900">تسجيل الدعوة</Button></div>{sent&&<p className="mt-3 text-xs font-semibold text-emerald-600">تم حفظ الدعوة محليًا للمتابعة.</p>}</div>
    </div>
    <div className="rounded-3xl bg-slate-900 p-7 text-white"><div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><Users /></div><div><h3 className="font-black">ملاحظة مهمة</h3><p className="mt-1 text-sm text-white/55">صلاحيات المدرّس لا تأتي من رابط الدعوة. الحساب الوحيد الذي يملك دور المدرّس هو البريد المحدد داخل إعدادات المنصة.</p></div></div></div>
  </div>;
}
