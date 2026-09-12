import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Award, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function StudentResults() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive=true;
    const load = async () => {
      try {
        const [a,e] = await Promise.all([
          api.entities.ExamAttempt.filter({ student_id: user?.id }, '-created_date', 500),
          api.entities.Exam.list('-created_date', 500)
        ]);
        if (!alive) return;
        setAttempts(a.filter(x => x.student_id === user?.id));
        setExams(e);
      } finally { if (alive) setLoading(false); }
    };
    load();
    const timer=window.setInterval(load, 10000);
    const onFocus=()=>load();
    window.addEventListener('focus',onFocus);
    return()=>{alive=false;window.clearInterval(timer);window.removeEventListener('focus',onFocus)};
  }, [user?.id]);

  const examMap = useMemo(()=>new Map(exams.map(e=>[e.id,e])),[exams]);
  const graded = attempts.filter(a=>a.status === 'graded' || a.status === undefined && a.score !== undefined);
  const passed = graded.filter(a=>Number(a.score||0) >= Number(examMap.get(a.exam_id)?.passing_score || 50)).length;
  const pending = attempts.filter(a=>a.status === 'pending_grading' || a.status === 'in_progress').length;

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" /></div>;

  return <div>
    <PageHeader title="نتائجي" description="تابع حالة اختباراتك ونتائج التصحيح" />
    {attempts.length === 0 ? <EmptyState icon={Award} title="لا توجد نتائج بعد" description="حل اختبارًا لتظهر محاولتك هنا" /> : <>
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">إجمالي المحاولات</p><p className="mt-1 text-2xl font-bold">{attempts.length}</p></CardContent></Card>
        <Card className="border-amber-200 bg-amber-50/40"><CardContent className="p-4"><p className="text-xs text-amber-700">بانتظار النتيجة</p><p className="mt-1 text-2xl font-bold text-amber-700">{pending}</p></CardContent></Card>
        <Card className="border-emerald-200 bg-emerald-50/40"><CardContent className="p-4"><p className="text-xs text-emerald-600">ناجح</p><p className="mt-1 text-2xl font-bold text-emerald-700">{passed}</p></CardContent></Card>
        <Card className="border-rose-200 bg-rose-50/40"><CardContent className="p-4"><p className="text-xs text-rose-600">لم يجتز</p><p className="mt-1 text-2xl font-bold text-rose-700">{Math.max(0,graded.length-passed)}</p></CardContent></Card>
      </div>
      <div className="space-y-3">{attempts.map(a=>{
        const ex=examMap.get(a.exam_id);
        const isGraded=a.status === 'graded' || (a.status===undefined && a.score!==undefined);
        const date=a.submitted_at || a.created_date;
        return <Card key={a.id} className="border-slate-200"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            {!isGraded ? <Clock className="h-8 w-8 text-amber-500" /> : Number(a.score||0) >= Number(ex?.passing_score||50) ? <CheckCircle2 className="h-8 w-8 text-emerald-500" /> : <XCircle className="h-8 w-8 text-rose-500" />}
            <div><p className="font-semibold text-slate-800">{ex?.title || 'اختبار'}</p><p className="text-xs text-slate-400">{date ? new Date(date).toLocaleString('ar-EG') : '—'}</p>{a.teacher_note && <p className="mt-1 text-xs text-slate-600">ملاحظة المدرس: {a.teacher_note}</p>}</div>
          </div>
          {isGraded ? <div className="text-left"><p className="text-2xl font-bold text-slate-900">{a.score}%</p><p className="text-xs text-slate-400">تم التصحيح</p></div> : <span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700">{a.status === 'in_progress' ? 'الاختبار ما زال مفتوحًا' : 'بانتظار تصحيح المدرس'}</span>}
        </CardContent></Card>;
      })}</div>
    </>}
  </div>;
}
