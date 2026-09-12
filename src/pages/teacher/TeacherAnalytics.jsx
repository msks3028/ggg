import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/api/apiClient';
import PageHeader from '@/components/ui/PageHeader';
import TeacherGradeFilter from '@/components/ui/TeacherGradeFilter';
import { readTeacherGrade, saveTeacherGrade } from '@/lib/teacherGrade';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Eye, Download, BookOpen, Video, FileText, ClipboardCheck, AlertCircle, TrendingUp, Radio, Circle, Clock } from 'lucide-react';

export default function TeacherAnalytics() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [platformUsers, setPlatformUsers] = useState([]);
    const [presenceNow, setPresenceNow] = useState(Date.now());
    const [selectedGrade, setSelectedGrade] = useState(readTeacherGrade);

    const changeGrade = (grade) => { setSelectedGrade(grade); saveTeacherGrade(grade); };

    useEffect(() => {
        setLoading(true);
        setError('');
        (async () => {
            try {
                const res = await api.functions.invoke('getTeacherAnalytics', { grade: selectedGrade });
                setStats(res.data);
            } catch (err) {
                setError(err?.data?.error || err?.message || 'تعذّر التحميل');
            } finally {
                setLoading(false);
            }
        })();
    }, [selectedGrade]);

    // Live list of everyone who has opened the platform with an authenticated account.
    // Online status is derived from the latest heartbeat, so closing the browser
    // automatically expires after a short grace period.
    useEffect(() => {
        let active = true;
        const loadUsers = async () => {
            try {
                const users = await api.entities.User.list('-updated_date', 2000);
                if (active) setPlatformUsers(users);
            } catch (err) {
                if (active) console.warn('Teacher users load failed:', err?.message || err);
            }
        };
        loadUsers();
        const timer = window.setInterval(loadUsers, 30000);
        return () => { active = false; window.clearInterval(timer); };
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => setPresenceNow(Date.now()), 10000);
        return () => window.clearInterval(timer);
    }, []);

    const studentsOnPlatform = useMemo(() => {
        const students = platformUsers.filter(u => String(u.role || '').toUpperCase() !== 'TEACHER' && String(u.role || '').toUpperCase() !== 'ADMIN');
        return selectedGrade === 'all' ? students : students.filter((u) => u.grade === selectedGrade);
    }, [platformUsers, selectedGrade]);

    const isOnline = (u) => {
        const value = u.last_seen_at || u.presence_updated_at || u.updated_date;
        if (!value) return false;
        const ms = typeof value?.toMillis === 'function' ? value.toMillis() : new Date(value).getTime();
        return Number.isFinite(ms) && (presenceNow - ms) <= 70000;
    };

    const onlineStudents = studentsOnPlatform.filter(isOnline);
    const recentStudents = [...studentsOnPlatform].sort((a, b) => {
        const ms = (v) => typeof v?.toMillis === 'function' ? v.toMillis() : new Date(v || 0).getTime();
        return ms(b.last_seen_at || b.updated_date || b.created_date) - ms(a.last_seen_at || a.updated_date || a.created_date);
    });

    const formatSeen = (u) => {
        const value = u.last_seen_at || u.presence_updated_at || u.updated_date;
        if (!value) return 'لم يتم تسجيل نشاط بعد';
        const ms = typeof value?.toMillis === 'function' ? value.toMillis() : new Date(value).getTime();
        if (!Number.isFinite(ms)) return 'نشاط مسجل';
        const seconds = Math.max(0, Math.floor((presenceNow - ms) / 1000));
        if (seconds < 70) return 'متصل الآن';
        if (seconds < 3600) return `آخر ظهور منذ ${Math.floor(seconds / 60)} دقيقة`;
        return new Date(ms).toLocaleString('ar-EG');
    };

    if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
    if (error) return <div className="flex flex-col items-center gap-2 py-20 text-center text-slate-600"><AlertCircle className="h-8 w-8 text-rose-400" />{error}</div>;

    return (
        <div>
            <PageHeader title="الإحصائيات" description="تحليل أداء محتواك من بيانات حقيقية" />
            <TeacherGradeFilter value={selectedGrade} onChange={changeGrade} />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard icon={Users} label="الطلاب المسجلون في كورساتك" value={stats.total_students} tone="blue" />
                <StatCard icon={Radio} label="متصلون الآن" value={onlineStudents.length} hint="يتم التحديث تلقائيًا" tone="green" />
                <StatCard icon={Users} label="كل من دخل المنصة كطالب" value={studentsOnPlatform.length} hint="حسابات الطلاب المسجلة" tone="violet" />
                <StatCard icon={Eye} label="مشاهدات الفيديو" value={stats.video_views} hint={`${stats.unique_video_viewers} فريد`} tone="violet" />
                <StatCard icon={Download} label="تحميلات الملفات" value={stats.file_downloads} hint={`${stats.unique_file_downloaders} فريد`} tone="green" />
                <StatCard icon={TrendingUp} label="متوسط المشاهدة" value={`${stats.average_watch_percentage}%`} hint={`${stats.completed_views} مكتملة`} tone="amber" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard icon={BookOpen} label="الحصص المسجلة" value={stats.total_lessons} />
                <StatCard icon={Video} label="الفيديوهات" value={stats.total_videos} />
                <StatCard icon={FileText} label="الملفات" value={stats.total_files} />
                <StatCard icon={ClipboardCheck} label="الاختبارات" value={stats.total_exams} />
            </div>

            <Card className="mt-6 border-slate-200">
                <CardHeader><CardTitle>الأكثر تحميلًا</CardTitle></CardHeader>
                <CardContent>
                    {(!stats.top_files || stats.top_files.length === 0) ? (
                        <EmptyState icon={FileText} title="لا توجد تحميلات بعد" />
                    ) : (
                        <div className="space-y-3">
                            {stats.top_files.map((f, i) => {
                                const max = stats.top_files[0].downloads || 1;
                                return (
                                    <div key={f.file_id}>
                                        <div className="mb-1 flex items-center justify-between text-sm">
                                            <span className="font-medium text-slate-700">{i + 1}. {f.name}</span>
                                            <span className="text-slate-500">{f.downloads} تحميل</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(f.downloads / max) * 100}%` }} /></div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="mt-6 border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5 text-emerald-600"/> المتابعة المباشرة للطلاب</CardTitle>
                    <p className="text-sm font-normal text-slate-500">قائمة حية بالحسابات التي دخلت المنصة كطلاب. الحالة تتحدث تلقائيًا من نشاطهم داخل الموقع.</p>
                </CardHeader>
                <CardContent>
                    {recentStudents.length === 0 ? (
                        <EmptyState icon={Users} title="لم يدخل أي طالب إلى المنصة بعد" description="سيظهر الطلاب هنا بعد تسجيل الدخول إلى المنصة." />
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {recentStudents.map((u) => {
                                const online = isOnline(u);
                                return (
                                    <div key={u.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                                                {(u.full_name || u.email || 'ط').charAt(0).toUpperCase()}
                                                <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{u.full_name || 'طالب'}</div>
                                                <div className="text-sm text-slate-400">{u.email || 'بدون بريد ظاهر'}</div>
                                            </div>
                                        </div>
                                        <div className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-bold sm:self-auto ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {online ? <Circle className="h-3 w-3 fill-current"/> : <Clock className="h-3.5 w-3.5"/>}
                                            {formatSeen(u)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}