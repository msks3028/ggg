import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardList, ClipboardCheck, ArrowUpRight, Plus, Video, Users } from "lucide-react";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import StatCard from "@/components/ui/StatCard";

const cards = [
  ["assignments", "الواجبات", ClipboardList, "amber"],
  ["exams", "الاختبارات", ClipboardCheck, "blue"],
  ["courses", "الحصص والكورسات", BookOpen, "green"],
  ["students", "الطلاب", Users, "violet"],
];

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, courses: 0, exams: 0, assignments: 0 });
  const [activity, setActivity] = useState([]);
  const first = user?.full_name?.split(" ")[0] || "مستر";

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [a, attempts, subs, views] = await Promise.all([
          api.functions.invoke("getTeacherAnalytics"),
          api.entities.ExamAttempt.list("-updated_date", 200),
          api.entities.AssignmentSubmission.list("-updated_date", 200),
          api.entities.LessonView.list("-updated_date", 200),
        ]);
        if (!live) return;
        const x = a?.data || a || {};
        setStats({ students: x.total_students || 0, courses: x.total_courses || 0, exams: x.total_exams || 0, assignments: x.total_assignments || 0 });
        const events = [
          ...subs.filter((v) => v.teacher_id === user?.id).map((v) => ({ title: "طالب سلّم واجبًا", time: v.updated_date || v.created_date, kind: "واجب" })),
          ...attempts.filter((v) => v.teacher_id === user?.id).map((v) => ({ title: "طالب دخل اختبارًا", time: v.updated_date || v.created_date, kind: "اختبار" })),
          ...views.filter((v) => v.teacher_id === user?.id).map((v) => ({ title: "تمت مشاهدة فيديو", time: v.updated_date || v.created_date, kind: "فيديو" })),
        ].filter((v) => v.time).sort((p, q) => new Date(q.time) - new Date(p.time)).slice(0, 6);
        setActivity(events);
      } catch {}
    })();
    return () => { live = false; };
  }, [user?.id]);

  const bars = useMemo(() => {
    const out = [0, 0, 0, 0, 0, 0, 0];
    activity.forEach((v) => {
      const age = Math.floor((Date.now() - new Date(v.time).getTime()) / 86400000);
      if (age >= 0 && age < 7) out[6 - age]++;
    });
    const max = Math.max(1, ...out);
    return out.map((v) => Math.max(5, Math.round((v / max) * 100)));
  }, [activity]);

  return (
    <div dir="rtl" className="mx-auto max-w-[1450px] space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">صباح الخير، {first}</h1>
          <p className="mt-1 text-sm text-slate-500">الأرقام والنشاطات هنا تُقرأ من بيانات المنصة الفعلية.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/teacher/assignments" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-500">
            <Plus className="h-4 w-4" />إنشاء واجب
          </Link>
          <Link to="/teacher/exams" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50">
            <ClipboardCheck className="h-4 w-4" />اختبار جديد
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([key, title, Icon, tone]) => (
          <StatCard key={key} icon={Icon} tone={tone} value={stats[key] || 0} label={title} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.65fr_.85fr]">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-800">نشاط المنصة هذا الأسبوع</h2>
            <p className="mt-1 text-[11px] text-slate-400">محسوب من مشاهدات الفيديوهات والاختبارات والواجبات.</p>
          </div>
          <div className="flex h-[280px] items-end justify-around gap-4 rounded-xl bg-slate-50 p-6">
            {bars.map((h, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="w-full max-w-[62px] rounded-t-md bg-indigo-100" style={{ height: `${h}%` }}>
                  <div className="h-1/2 rounded-t-md bg-indigo-500" />
                </div>
                <span className="text-[10px] text-slate-400">{["س", "ح", "ن", "ث", "ر", "خ", "ج"][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-800">أحدث النشاطات</h2>
          <div className="mt-4 space-y-2">
            {(activity.length ? activity : [{ title: "لا يوجد نشاط حديث بعد", time: null, kind: "-" }]).map((a, i) => (
              <div key={`${a.title}-${i}`} className="flex gap-3 rounded-xl p-3 hover:bg-slate-50">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-50 text-xs font-black text-indigo-600">{a.kind[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-600">{a.title}</div>
                  <div className="text-[10px] text-slate-400">{a.time ? new Date(a.time).toLocaleString("ar-EG") : "بانتظار النشاط"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-800">إدارة المحتوى</h2>
            <p className="mt-1 text-[11px] text-slate-400">انتقل مباشرة للأقسام الفعلية في المنصة.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[["الواجبات", "/teacher/assignments", ClipboardList], ["الاختبارات", "/teacher/exams", ClipboardCheck], ["فيديوهات المستر", "/teacher/lessons", Video]].map(([title, path, Icon]) => (
            <Link key={path} to={path} className="group rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-600"><Icon className="h-5 w-5" /></span>
                <ArrowUpRight className="h-4 w-4 text-slate-300" />
              </div>
              <h3 className="mt-4 text-sm font-black text-slate-700">{title}</h3>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}