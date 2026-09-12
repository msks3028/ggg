import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import StatCard from '@/components/ui/StatCard';
import { CheckCircle2, Eye, TrendingUp, Star, Award, MessageSquare } from 'lucide-react';

export default function StudentProgress() {
  const { user } = useAuth();
  const [views, setViews] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { let alive=true; (async () => {
    try {
      const [v,l,e,ev] = await Promise.all([
        api.entities.LessonView.filter({ student_id: user?.id }, '-updated_date', 500),
        api.entities.Lesson.list('-created_date', 500),
        api.entities.Enrollment.filter({ student_id: user?.id }, '-created_date', 500),
        user?.id ? api.entities.TeacherEvaluation.filter({ student_id: user.id }, '-updated_date', 20) : Promise.resolve([]),
      ]);
      if (!alive) return;
      setViews(v.filter(x => x.student_id === user?.id));
      setLessons(l);
      setEnrollments(e.filter(x => x.student_id === user?.id));
      setEvaluations(ev);
    } finally { if (alive) setLoading(false); }
  })(); return()=>{alive=false}; }, [user?.id]);

  const lessonMap = useMemo(() => new Map(lessons.map(l=>[l.id,l])), [lessons]);
  const completed = views.filter(v => Number(v.completion_percentage||0) >= 90).length;
  const avg = views.length ? Math.round(views.reduce((s,v)=>s+Number(v.completion_percentage||0),0)/views.length) : 0;
  const courseProgress = useMemo(() => enrollments.map(en => {
    const courseLessons = lessons.filter(l => l.course_id === en.course_id && l.status === 'published');
    const pct = courseLessons.length ? Math.round(courseLessons.reduce((sum,l)=>sum+Number(views.find(v=>v.lesson_id===l.id)?.completion_percentage||0),0)/courseLessons.length) : 0;
    return { id:en.course_id, pct };
  }), [enrollments, lessons, views]);

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" /></div>;
  return <div>
    <PageHeader title="تقدّمي" description="متابعة حقيقية لمشاهداتك ونسبة إكمالك للدروس" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard icon={CheckCircle2} label="حصص مكتملة" value={completed} tone="green" />
      <StatCard icon={Eye} label="دروس تمت مشاهدتها" value={views.length} tone="violet" />
      <StatCard icon={TrendingUp} label="متوسط الإكمال" value={`${avg}%`} tone="amber" />
    </div>
    {courseProgress.length>0 && <Card className="mt-6 border-slate-200"><CardContent className="p-5"><h2 className="font-bold text-slate-900">تقدّم الكورسات</h2><div className="mt-4 space-y-4">{courseProgress.map(c=>{const title=[...lessonMap.values()].find(l=>l.course_id===c.id)?.course_title||enrollments.find(e=>e.course_id===c.id)?.course_title||'كورس'; return <div key={c.id}><div className="mb-1 flex justify-between text-sm"><span>{title}</span><span>{c.pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{width:`${c.pct}%`}} /></div></div>})}</div></CardContent></Card>}
    {evaluations.length > 0 && <Card className="mt-6 overflow-hidden border-violet-200 bg-gradient-to-br from-violet-50 to-white"><CardContent className="p-5">
      <div className="mb-4 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-600 text-white"><Award className="h-5 w-5"/></div><div><h2 className="font-bold text-slate-900">تقييم المدرس</h2><p className="text-xs text-slate-500">تقييم وملاحظات يضيفها المدرس فقط</p></div></div>
      <div className="space-y-3">{evaluations.map(ev=><div key={ev.id} className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-1 text-amber-500">{[1,2,3,4,5].map(n=><Star key={n} className={`h-4 w-4 ${n<=Number(ev.rating||0)?'fill-current':''}`}/>)}</div><div className="flex gap-2 text-xs"><span className="rounded-full bg-violet-100 px-3 py-1 font-bold text-violet-700">{ev.level || 'قيد التقييم'}</span>{ev.score!==null && ev.score!==undefined && <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700">{ev.score}/100</span>}</div></div>
        {ev.note && <div className="mt-3 flex gap-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600"><MessageSquare className="mt-1 h-4 w-4 shrink-0 text-violet-500"/><span>{ev.note}</span></div>}
        <p className="mt-3 text-[11px] text-slate-400">آخر تحديث: {ev.updated_date ? new Date(ev.updated_date).toLocaleString('ar-EG') : '—'}</p>
      </div>)}</div>
    </CardContent></Card>}
    <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">تفاصيل المشاهدات</h2>
    {views.length===0 ? <EmptyState icon={Eye} title="لا يوجد تقدّم بعد" description="شاهد درسًا من داخل الموقع ليظهر تقدّمك هنا" /> : <Card className="border-slate-200"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-right text-xs text-slate-500"><th className="px-4 py-3">الحصة</th><th className="px-4 py-3">نسبة المشاهدة</th><th className="px-4 py-3">آخر مشاهدة</th></tr></thead><tbody>{views.map(v=>{const lesson=lessonMap.get(v.lesson_id);return <tr key={v.id} className="border-b border-slate-100"><td className="px-4 py-3 text-slate-700">{lesson?.title||'حصة محذوفة'}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-violet-500" style={{width:`${Math.min(100,Number(v.completion_percentage||0))}%`}} /></div><span className="text-xs text-slate-500">{Number(v.completion_percentage||0)}%</span></div></td><td className="px-4 py-3 text-xs text-slate-400">{v.last_watched_at?new Date(v.last_watched_at).toLocaleString('ar-EG'):'—'}</td></tr>})}</tbody></table></div></CardContent></Card>}
  </div>;
}
