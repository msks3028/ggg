import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Play, GraduationCap, Award, Flame, CheckCircle2 } from 'lucide-react';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { gradeMatches } from '@/lib/grades';
import LocalFileImage from '@/components/ui/LocalFileImage';
import StatCard from '@/components/ui/StatCard';

const dayKey = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const streakOf = (dates) => {
  const set = new Set(dates.map(dayKey).filter(Boolean));
  let n = 0, d = new Date();
  while (set.has(dayKey(d)) && n < 366) { n++; d.setDate(d.getDate() - 1); }
  return n;
};

export default function StudentHome() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [courses, lessons, materials, exams, assignments, enrollments, views, attempts] = await Promise.all([
          api.entities.Course.list('-created_date', 1000),
          api.entities.Lesson.list('-created_date', 1000),
          api.entities.Material.list('-created_date', 1000),
          api.entities.Exam.list('-created_date', 1000),
          api.entities.Assignment.list('-created_date', 1000),
          api.entities.Enrollment.list('-created_date', 1000),
          api.entities.LessonView.list('-updated_date', 1000),
          api.entities.ExamAttempt.list('-updated_date', 1000),
        ]);
        if (!live) return;
        const cs = courses.filter((c) => c.status === 'published' && gradeMatches(c.target_grade, user?.grade));
        const own = (x) => x.status === 'published' && !x.course_id && gradeMatches(x.target_grade, user?.grade);
        setData({
          courses: cs,
          lessons: lessons.filter(own),
          materials: materials.filter(own),
          exams: exams.filter(own),
          assignments: assignments.filter(own),
          enrollments: enrollments.filter((x) => x.student_id === user?.id),
          views: views.filter((x) => x.student_id === user?.id),
          attempts: attempts.filter((x) => x.student_id === user?.id),
        });
      } catch {
        if (live) setData({ courses: [], lessons: [], materials: [], exams: [], assignments: [], enrollments: [], views: [], attempts: [] });
      }
    })();
    return () => { live = false; };
  }, [user?.id, user?.grade]);

  const m = useMemo(() => {
    if (!data) return null;
    const enrolled = data.enrollments.filter((e) => data.courses.some((c) => c.id === e.course_id));
    const completed = enrolled.filter((e) => Number(e.progress || 0) >= 90).length;
    const streak = streakOf(data.views.map((v) => v.last_watched_at || v.updated_date || v.created_date));
    const today = data.views.filter((v) => dayKey(v.last_watched_at || v.updated_date || v.created_date) === dayKey(new Date())).length;
    return {
      enrolled, completed, streak, today,
      goal: Math.min(100, Math.round((today / 3) * 100)),
      content: data.lessons.length + data.materials.length + data.exams.length + data.assignments.length,
    };
  }, [data]);

  if (!data || !m) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" /></div>;
  }

  const name = user?.full_name?.split(' ')[0] || 'بطل';
  const recent = data.courses.slice(0, 3);
  const ach = [
    ['🏆', 'أول كورس', m.enrolled.length > 0],
    ['⚡', 'استمرار 7 أيام', m.streak >= 7],
    ['🚀', 'متعلم نشط', data.views.length >= 5],
    ['🎯', 'أول اختبار', data.attempts.length > 0],
  ];

  return (
    <div dir="rtl" className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.35fr_.75fr]">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-50 via-indigo-100 to-violet-100 p-7 shadow-sm">
          <div className="flex min-h-[180px] items-center justify-between gap-5">
            <div>
              <h1 className="text-3xl font-black text-slate-800">صباح الخير، {name}!</h1>
              <p className="mt-3 text-sm text-slate-600">البيانات هنا مرتبطة بنشاطك الحقيقي داخل المنصة.</p>
              <Link to="/student/courses" className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500">
                استكشف كورساتك <Play className="h-4 w-4 fill-current" />
              </Link>
            </div>
            <div className="hidden h-36 w-52 items-center justify-center rounded-[35px] bg-white/50 md:flex">
              <GraduationCap className="h-20 w-20 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-black text-slate-800">هدف اليوم</h2>
              <p className="mt-1 text-[11px] text-slate-400">3 مشاهدات محتوى يوميًا</p>
            </div>
            <div className="grid h-20 w-20 place-items-center rounded-full border-[8px] border-indigo-100 text-lg font-black text-slate-700">{m.goal}%</div>
          </div>
          <p className="mt-8 text-sm text-slate-500">اليوم شاهدت {m.today} من 3 محتويات.</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} tone="blue" value={data.courses.length} label="كورسات متاحة لصفك" />
        <StatCard icon={CheckCircle2} tone="green" value={m.completed} label="كورسات مكتملة فعليًا" />
        <StatCard icon={Flame} tone="amber" value={`${m.streak} يوم`} label="سلسلة التعلم الحالية" />
        <StatCard icon={Award} tone="violet" value={m.content} label="محتوى منشور لصفك" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-800">أحدث الكورسات</h2>
              <p className="mt-1 text-[11px] text-slate-400">كلها من المحتوى المنشور والمتاح لصفك</p>
            </div>
            <Link to="/student/courses" className="text-xs font-bold text-indigo-600">عرض الكل</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {recent.map((c) => {
              const e = m.enrolled.find((x) => x.course_id === c.id);
              return (
                <Link key={c.id} to={`/student/courses/${c.id}`} className="course-reference-card">
                  <div className="course-reference-media h-32">
                    {c.cover_image
                      ? <LocalFileImage src={c.cover_image} alt={c.title} className="h-full w-full object-cover" />
                      : <div className="grid h-full place-items-center"><BookOpen className="h-10 w-10 text-indigo-300" /></div>}
                  </div>
                  <div className="course-reference-body">
                    <span className="course-reference-chip">{c.target_grade || user?.grade || 'كورس'}</span>
                    <h3 className="course-reference-title truncate">{c.title}</h3>
                    <p className="course-reference-text">{data.lessons.filter((l) => l.course_id === c.id).length} درس منشور</p>
                    <div className="mt-4 course-reference-progress"><span style={{ width: `${Number(e?.progress || 0)}%` }} /></div>
                    <p className="mt-2 text-[10px] text-slate-400">تقدمك: {Number(e?.progress || 0)}%</p>
                  </div>
                </Link>
              );
            })}
            {!recent.length && <p className="col-span-3 py-10 text-center text-sm text-slate-400">لا توجد كورسات منشورة لصفك بعد</p>}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-800">إنجازاتك</h2>
            <Link to="/student/progress" className="text-xs font-bold text-indigo-600">تقدمي</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {ach.map(([e, t, ok]) => (
              <div key={t} className={`rounded-2xl p-4 text-center ${ok ? 'bg-indigo-50' : 'bg-slate-50 opacity-50'}`}>
                <div className="text-2xl">{e}</div>
                <div className="mt-2 text-[10px] font-bold text-slate-600">{t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}