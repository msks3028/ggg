import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getDemoRoleHeader } from '@/api/apiClient';
import { apiUrl } from '@/lib/apiBase';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Play } from 'lucide-react';
import LocalFileImage from '@/components/ui/LocalFileImage';

export default function StudentVideos() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [slugs, setSlugs] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        setError('');
        setLoading(true);
        (async () => {
            try {
                // Rebuilt dedicated endpoint: the server already applies every
                // visibility rule (published + grade match, or free content),
                // so whatever comes back here is exactly what should show.
                const res = await fetch(apiUrl('/api/videos'), {
                    credentials: 'include',
                    cache: 'no-store',
                    headers: getDemoRoleHeader() ? { 'X-Lurnova-Demo-Role': getDemoRoleHeader() } : {},
                });
                const body = await res.json().catch(() => null);
                console.log('[student-videos] response', res.status, body);
                if (!res.ok || !body?.ok) throw new Error(body?.message || `تعذر تحميل الفيديوهات (كود ${res.status}).`);
                const profiles = await api.entities.TeacherProfile.list('-updated_date', 1000).catch(() => []);
                if (!alive) return;
                setItems(body.items || []);
                setSlugs(Object.fromEntries(profiles.filter((x) => x.teacher_id && x.slug).map((x) => [x.teacher_id, x.slug])));
            } catch (err) {
                console.error('Student videos load failed:', err);
                if (alive) setError(err?.message || 'تعذر تحميل الفيديوهات.');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [user?.grade]);

    return (
        <div dir="rtl">
            <PageHeader title="الفيديوهات" description="كل الحصص والفيديوهات المنشورة لصفك الدراسي" />
            {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            {loading ? (
                <div className="flex justify-center py-16"><div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>
            ) : !items.length && !error ? (
                <EmptyState icon={Play} title="لا توجد فيديوهات لصفك بعد" />
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((x) => {
                        const slug = slugs[x.teacher_id];
                        return (
                            <Link key={x.id} to={slug ? `/teacher/${slug}/lesson/${x.id}?returnTo=${encodeURIComponent('/student/videos')}` : `/lesson/${x.id}?returnTo=${encodeURIComponent('/student/videos')}`} className="course-reference-card">
                                <div className="course-reference-media">
                                    {x.thumbnail ? <LocalFileImage src={x.thumbnail} alt={x.title} className="h-full w-full object-cover" /> : (
                                        <div className="content-icon-media"><Play className="h-16 w-16 text-indigo-300" /><span className="accent-bar" /></div>
                                    )}
                                </div>
                                <div className="course-reference-body">
                                    <span className="course-reference-chip">فيديو</span>
                                    <h3 className="course-reference-title">{x.title}</h3>
                                    <p className="course-reference-text">{x.description || 'حصة تعليمية جاهزة للمشاهدة.'}</p>
                                    <div className="course-reference-footer"><span>متاح الآن</span><span className="course-reference-action">شاهد الآن ↗</span></div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
