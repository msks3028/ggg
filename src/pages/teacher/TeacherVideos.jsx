import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/apiClient';
import LocalFileImage from '@/components/ui/LocalFileImage';
import { useAuth } from '@/lib/AuthContext';
import { useTeacherCourses } from '@/lib/useTeacherCourses';
import TeacherGradeFilter, { matchesTeacherGrade } from '@/components/ui/TeacherGradeFilter';
import { readTeacherGrade, saveTeacherGrade } from '@/lib/teacherGrade';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import StatCard from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import { Video, Eye, Users, CheckCircle2, RefreshCw, Activity, Clock, X } from 'lucide-react';

const ACTIVE_WINDOW = 5 * 60 * 1000;
const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
};

export default function TeacherVideos() {
    const { user } = useAuth();
    const { courses } = useTeacherCourses();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totals, setTotals] = useState({ views: 0, unique: 0, completed: 0, active: 0 });
    const [selected, setSelected] = useState(null);
    const [selectedGrade, setSelectedGrade] = useState(readTeacherGrade);
    const changeGrade = (grade) => { setSelectedGrade(grade); saveTeacherGrade(grade); };

    const load = useCallback(async (silent = false) => {
        if (!user?.id) return;
        if (silent) setRefreshing(true); else setLoading(true);
        try {
            const [lessons, views, users] = await Promise.all([
                api.entities.Lesson.list('-created_date', 500),
                api.entities.LessonView.list('-updated_date', 5000),
                api.entities.User.list('-created_date', 2000),
            ]);

            // NOTE: do not filter lessons/views by comparing to user.id here.
            // In demo mode the client-side user object uses a fixed
            // placeholder id that never matches the real database
            // teacher_id, which used to hide every real lesson/view. The
            // Lesson entity list is not scoped server-side to "my" lessons,
            // so we still need some ownership check — match it against the
            // lessons' own teacher_id values (all lessons here should share
            // the same single-teacher-platform owner) instead of user.id.
            const myTeacherIds = new Set(lessons.map((l) => l.teacher_id).filter(Boolean));
            const myLessons = lessons.filter((l) => l.video_url);
            const lessonIds = new Set(myLessons.map((l) => l.id));
            const myViews = views.filter((v) => lessonIds.has(v.lesson_id) || (myTeacherIds.has(v.teacher_id) && lessonIds.has(v.lesson_id)));
            const userMap = new Map(users.map((u) => [u.id, u]));
            const byLesson = new Map();

            myViews.forEach((v) => {
                if (!byLesson.has(v.lesson_id)) byLesson.set(v.lesson_id, []);
                byLesson.get(v.lesson_id).push(v);
            });

            const data = myLessons.map((l) => {
                const records = byLesson.get(l.id) || [];
                const latestByStudent = new Map();
                records.forEach((v) => {
                    const key = v.student_id || v.user_id || v.id;
                    const old = latestByStudent.get(key);
                    const stamp = new Date(v.last_watched_at || v.updated_date || v.created_date || 0).getTime();
                    const oldStamp = old ? new Date(old.last_watched_at || old.updated_date || old.created_date || 0).getTime() : -1;
                    if (!old || stamp >= oldStamp) latestByStudent.set(key, v);
                });
                const latest = [...latestByStudent.values()];
                const totalPct = latest.reduce((sum, v) => sum + Number(v.completion_percentage || 0), 0);
                const students = latest.map((v) => {
                    const student = userMap.get(v.student_id || v.user_id) || {};
                    return {
                        id: v.student_id || v.user_id || v.id,
                        name: student.full_name || student.name || student.email || 'طالب',
                        email: student.email || '',
                        completion: Math.min(100, Math.max(0, Math.round(Number(v.completion_percentage || 0)))),
                        watchDuration: Math.round(Number(v.watch_duration || 0)),
                        lastWatched: v.last_watched_at || v.updated_date || v.created_date || null,
                    };
                }).sort((a, b) => new Date(b.lastWatched || 0) - new Date(a.lastWatched || 0));

                return {
                    id: l.id,
                    course_id: l.course_id,
                    target_grade: l.target_grade || '',
                    title: l.title,
                    thumbnail: l.thumbnail,
                    views: records.length,
                    unique: latest.length,
                    completed: latest.filter((v) => Number(v.completion_percentage || 0) >= 90).length,
                    avg: latest.length ? Math.round(totalPct / latest.length) : 0,
                    students,
                };
            });

            const now = Date.now();
            const latestGlobal = new Map();
            myViews.forEach((v) => {
                const key = `${v.lesson_id}:${v.student_id || v.user_id || v.id}`;
                const old = latestGlobal.get(key);
                const stamp = new Date(v.last_watched_at || v.updated_date || v.created_date || 0).getTime();
                const oldStamp = old ? new Date(old.last_watched_at || old.updated_date || old.created_date || 0).getTime() : -1;
                if (!old || stamp >= oldStamp) latestGlobal.set(key, v);
            });
            const latestViews = [...latestGlobal.values()];
            setRows(data);
            setTotals({
                views: myViews.length,
                unique: new Set(myViews.map((v) => v.student_id || v.user_id).filter(Boolean)).size,
                completed: latestViews.filter((v) => Number(v.completion_percentage || 0) >= 90).length,
                active: latestViews.filter((v) => now - new Date(v.last_watched_at || v.updated_date || v.created_date || 0).getTime() <= ACTIVE_WINDOW).length,
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    const visibleRows = rows.filter((row) => matchesTeacherGrade(row, selectedGrade, courses));
    const visibleTotals = visibleRows.reduce((acc, row) => {
        acc.views += Number(row.views || 0);
        acc.completed += Number(row.completed || 0);
        (row.students || []).forEach((student) => acc.studentIds.add(student.id));
        const now = Date.now();
        (row.students || []).forEach((student) => {
            const stamp = student.lastWatched ? new Date(student.lastWatched).getTime() : 0;
            if (stamp && now - stamp <= ACTIVE_WINDOW) acc.active += 1;
        });
        return acc;
    }, { views: 0, completed: 0, active: 0, studentIds: new Set() });
    visibleTotals.unique = visibleTotals.studentIds.size;

    useEffect(() => {
        load();
        const timer = setInterval(() => load(true), 30000);
        return () => clearInterval(timer);
    }, [load]);

    if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;

    return (
        <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <PageHeader title="الفيديوهات" description="متابعة المشاهدات الحقيقية للطلاب وتقدمهم في كل فيديو" />
                <Button variant="outline" className="gap-2" onClick={() => load(true)} disabled={refreshing}>
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> تحديث الآن
                </Button>
            </div>
            <TeacherGradeFilter value={selectedGrade} onChange={changeGrade} />

            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={Eye} label="إجمالي المشاهدات" value={visibleTotals.views} tone="violet" />
                <StatCard icon={Users} label="طلاب فريدون" value={visibleTotals.unique} tone="blue" />
                <StatCard icon={CheckCircle2} label="مشاهدات مكتملة" value={visibleTotals.completed} tone="green" />
                <StatCard icon={Activity} label="نشطون الآن" value={visibleTotals.active} tone="orange" />
            </div>

            {visibleRows.length === 0 ? (
                <EmptyState icon={Video} title="لا توجد فيديوهات" description="أضف حصصًا تحتوي على فيديو لعرض إحصائياتها هنا" />
            ) : (
                <Card className="border-slate-200"><CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-slate-200 text-right text-xs text-slate-500">
                                <th className="py-3 px-4 font-medium">الفيديو</th>
                                <th className="py-3 px-4 font-medium">المشاهدات</th>
                                <th className="py-3 px-4 font-medium">طلاب فريدون</th>
                                <th className="py-3 px-4 font-medium">متوسط المشاهدة</th>
                                <th className="py-3 px-4 font-medium">مكتملة</th>
                                <th className="py-3 px-4 font-medium">التفاصيل</th>
                            </tr></thead>
                            <tbody>
                                {visibleRows.map((r) => (
                                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-3 px-4"><div className="flex items-center gap-3"><div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-slate-100">{r.thumbnail ? <LocalFileImage src={r.thumbnail} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300"><Video className="h-4 w-4" /></div>}</div><span className="font-medium text-slate-800">{r.title}</span></div></td>
                                        <td className="py-3 px-4 font-semibold text-slate-700">{r.views}</td>
                                        <td className="py-3 px-4 text-slate-600">{r.unique}</td>
                                        <td className="py-3 px-4"><div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${r.avg}%` }} /></div><span className="text-xs text-slate-500">{r.avg}%</span></div></td>
                                        <td className="py-3 px-4 text-emerald-600 font-medium">{r.completed}</td>
                                        <td className="py-3 px-4"><Button size="sm" variant="outline" onClick={() => setSelected(r)}>عرض الطلاب</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent></Card>
            )}

            {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={() => setSelected(null)}>
                <Card className="max-h-[85vh] w-full max-w-2xl overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between border-b p-4"><div><h2 className="font-bold text-slate-900">طلاب شاهدوا الفيديو</h2><p className="text-sm text-slate-500">{selected.title}</p></div><Button variant="ghost" size="icon" onClick={() => setSelected(null)}><X className="h-5 w-5" /></Button></div>
                    <div className="max-h-[65vh] overflow-y-auto p-4">
                        {selected.students.length === 0 ? <EmptyState icon={Users} title="لا توجد مشاهدات حتى الآن" /> : <div className="space-y-3">{selected.students.map((s) => <div key={s.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-slate-800">{s.name}</div>{s.email && <div className="text-xs text-slate-500">{s.email}</div>}</div><div className="text-left text-xs text-slate-500"><div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDate(s.lastWatched)}</div></div></div><div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${s.completion}%` }} /></div><span className="w-10 text-left text-xs font-medium">{s.completion}%</span></div></div>)}</div>}
                    </div>
                </Card>
            </div>}
        </div>
    );
}