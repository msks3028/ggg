import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import StatCard from '@/components/ui/StatCard';
import { Users, BookOpen, Eye, Download, Star, X, Save, MessageSquare } from 'lucide-react';

const LEVELS = ['ممتاز', 'جيد جدًا', 'جيد', 'يحتاج إلى تحسين', 'يحتاج متابعة'];

export default function TeacherStudents() {
  const [data, setData] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ rating: 5, score: '', level: 'ممتاز', note: '' });
  const [saving, setSaving] = useState(false);
  const [gradeFilter, setGradeFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const [res, evals] = await Promise.all([
        api.functions.invoke('getTeacherStudents', {}),
        api.entities.TeacherEvaluation.list('-updated_date', 500),
      ]);
      setData(res.data);
      setEvaluations(evals);
    } catch (err) {
      setError(err?.data?.error || err?.message || 'تعذّر التحميل');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const students = data?.students || [];
  const grades = [...new Set(students.map(s=>s.grade).filter(Boolean))];
  const filteredStudents = gradeFilter==='all' ? students : students.filter(s=>s.grade===gradeFilter);
  const openEvaluation = (student) => {
    const old = evaluations.find(e => e.student_id === student.student_id);
    setEditing(student);
    setForm({
      rating: Number(old?.rating ?? 5),
      score: old?.score ?? '',
      level: old?.level || 'ممتاز',
      note: old?.note || '',
    });
  };

  const saveEvaluation = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const old = evaluations.find(x => x.student_id === editing.student_id);
      const payload = {
        student_id: editing.student_id,
        student_name: editing.name || '',
        teacher_id: user.id,
        rating: Math.max(1, Math.min(5, Number(form.rating || 1))),
        score: form.score === '' ? null : Math.max(0, Math.min(100, Number(form.score))),
        level: form.level,
        note: String(form.note || '').trim(),
      };
      if (old) await api.entities.TeacherEvaluation.update(old.id, payload);
      else await api.entities.TeacherEvaluation.create(payload);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err?.message || 'تعذّر حفظ تقييم الطالب');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (error && !data) return <div className="py-20 text-center text-slate-600">{error}</div>;

  return (
    <div>
      <PageHeader title="طلابي" description="تابع نشاط كل طالب وقيّمه بنفسك. التقييم يظهر للطالب فقط ولا يمكنه تعديله." />

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="إجمالي الطلاب" value={filteredStudents.length} tone="blue" />
        <StatCard icon={BookOpen} label="الكورسات" value={data?.total_courses ?? 0} />
        <StatCard icon={Eye} label="إجمالي المشاهدات" value={students.reduce((s, x) => s + x.video_views, 0)} tone="violet" />
        <StatCard icon={Download} label="إجمالي التحميلات" value={students.reduce((s, x) => s + x.downloads, 0)} tone="green" />
      </div>

      {filteredStudents.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد طلاب بعد" description="سيظهر هنا كل حسابات الطلاب المسجلة في المنصة." />
      ) : (
        <Card className="border-slate-200"><CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4"><span className="text-sm font-bold text-slate-700">الصف الدراسي:</span><button onClick={()=>setGradeFilter('all')} className={`rounded-lg px-3 py-2 text-xs font-bold ${gradeFilter==='all'?'bg-violet-600 text-white':'bg-slate-100 text-slate-600'}`}>كل الصفوف ({students.length})</button>{grades.map(g=><button key={g} onClick={()=>setGradeFilter(g)} className={`rounded-lg px-3 py-2 text-xs font-bold ${gradeFilter===g?'bg-violet-600 text-white':'bg-slate-100 text-slate-600'}`}>{g} ({students.filter(x=>x.grade===g).length})</button>)}</div><div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead><tr className="border-b border-slate-200 text-right text-xs text-slate-500">
                <th className="py-3 px-4 font-medium">الطالب</th><th className="py-3 px-4 font-medium">الصف</th>
                <th className="py-3 px-4 font-medium">الكورسات</th>
                <th className="py-3 px-4 font-medium">المشاهدات</th>
                <th className="py-3 px-4 font-medium">الاختبارات</th>
                <th className="py-3 px-4 font-medium">متوسط الدرجات</th>
                <th className="py-3 px-4 font-medium">الواجبات</th>
                <th className="py-3 px-4 font-medium">تقييمك</th>
                <th className="py-3 px-4 font-medium">آخر نشاط</th>
              </tr></thead>
              <tbody>
                {filteredStudents.map((s) => {
                  const evaluation = evaluations.find(e => e.student_id === s.student_id);
                  return <tr key={s.student_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{(s.name || s.email || 'ط').charAt(0).toUpperCase()}</div>
                        <div><p className="font-medium text-slate-800">{s.name || 'طالب'}</p><p className="text-xs text-slate-400">{s.email}</p></div>
                      </div>
                    </td>
                    <td className="py-3 px-4"><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{s.grade || 'غير محدد'}</span></td>
                    <td className="py-3 px-4 text-slate-600">{s.courses}</td>
                    <td className="py-3 px-4 text-slate-600">{s.video_views}</td>
                    <td className="py-3 px-4 text-slate-600">{s.exams_taken}</td>
                    <td className="py-3 px-4">{s.exams_taken > 0 ? <span className="font-semibold text-slate-800">{s.avg_exam_score}%</span> : <span className="text-slate-300">—</span>}</td>
                    <td className="py-3 px-4 text-slate-600">{s.assignments_submitted}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => openEvaluation(s)} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {evaluation ? `${evaluation.rating}/5 — ${evaluation.level}` : 'قيّم الطالب'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">{s.last_activity ? new Date(s.last_activity).toLocaleDateString('ar-EG') : '—'}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      )}

      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
        <form onSubmit={saveEvaluation} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" dir="rtl">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-xl font-black text-slate-900">تقييم الطالب</h2><p className="mt-1 text-sm text-slate-500">{editing.name || editing.email}</p></div>
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5"/></button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">التقييم من 5
              <select value={form.rating} onChange={e=>setForm({...form,rating:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-violet-500">
                {[5,4,3,2,1].map(n=><option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5-n)} — {n}/5</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-700">الدرجة العامة (اختياري)
              <input type="number" min="0" max="100" value={form.score} onChange={e=>setForm({...form,score:e.target.value})} placeholder="مثال: 95" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-violet-500" />
            </label>
          </div>
          <label className="mt-4 block text-sm font-bold text-slate-700">مستوى الطالب
            <select value={form.level} onChange={e=>setForm({...form,level:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-violet-500">
              {LEVELS.map(level=><option key={level} value={level}>{level}</option>)}
            </select>
          </label>
          <label className="mt-4 block text-sm font-bold text-slate-700">ملاحظتك للطالب
            <textarea rows="4" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="اكتب ملاحظة مفيدة للطالب..." className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-violet-500" />
          </label>
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><MessageSquare className="h-4 w-4"/> الطالب يستطيع رؤية التقييم والملاحظة فقط، ولا يستطيع تعديلهما.</p>
          <div className="mt-6 flex gap-3">
            <button disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-60"><Save className="h-4 w-4"/>{saving ? 'جارٍ الحفظ...' : 'حفظ التقييم'}</button>
            <button type="button" onClick={()=>setEditing(null)} className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-600">إلغاء</button>
          </div>
        </form>
      </div>}
    </div>
  );
}
