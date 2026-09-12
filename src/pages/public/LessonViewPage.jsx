import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import EmptyState from '@/components/ui/EmptyState';
import { gradeMatches } from '@/lib/grades';
import { ArrowRight, Play, AlertCircle, Lock } from 'lucide-react';
import { assetUrl, apiUrl } from '@/lib/apiBase';

const driveIdFromUrl = (value = '') => {
    const text = String(value);
    const patterns = [/\/d\/([^/]+)/, /[?&]id=([^&]+)/];
    for (const pattern of patterns) { const m = text.match(pattern); if (m?.[1]) return decodeURIComponent(m[1]); }
    return '';
};

export default function LessonViewPage() {
    const { slug, lessonId } = useParams();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const requestedReturn = searchParams.get('returnTo') || '';
    const backTo = requestedReturn.startsWith('/student') ? requestedReturn : (user?.role === 'STUDENT' ? '/student/videos' : (slug ? `/teacher/${slug}` : '/teacher/lessons'));
    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [accessMessage, setAccessMessage] = useState('لا يمكنك الوصول إلى هذه الحصة');
    const [videoSrc, setVideoSrc] = useState('');
    const [videoError, setVideoError] = useState('');
    const driveVideoId = driveIdFromUrl(lesson?.video_url);
    const videoRef = useRef(null);
    const lastSync = useRef(0);

    useEffect(() => {
        (async () => {
            try {
                const [lessons, enrollments] = await Promise.all([
                    api.entities.Lesson.filter({ id: lessonId }),
                    api.entities.Enrollment.list('-created_date', 500),
                ]);
                const l = lessons[0];
                if (!l) { setNotFound(true); return; }
                const isOwner = l.teacher_id === user?.id;
                const enrollment = enrollments.find(e => e.student_id === user?.id && e.course_id === l.course_id);
                // Students who can open the course are allowed to open its published content.
                // Do not re-block them here merely because an enrollment row is absent; the
                // course page already applies the platform's grade/visibility rules.
                const courseList = l.course_id ? await api.entities.Course.filter({ id: l.course_id }) : [];
                const course = courseList[0];
                const courseGradeAllowed = !l.course_id || !!(course && gradeMatches(course.target_grade || '', user?.grade));
                const globalGradeAllowed = !l.course_id && gradeMatches(l.target_grade || '', user?.grade);
                const legacyEnrollmentAllowed = !!enrollment || l.is_free === true;
                if ((l.status !== 'published' && !isOwner) || (!isOwner && ((l.course_id && !courseGradeAllowed && !legacyEnrollmentAllowed) || (!l.course_id && !globalGradeAllowed && !legacyEnrollmentAllowed)))) {
                    setAccessMessage('هذه الحصة غير متاحة لحسابك');
                    setAccessDenied(true);
                    return;
                }
                setLesson(l);
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        })();
    }, [slug, lessonId]);

    useEffect(() => {
        const value = lesson?.video_url;
        setVideoError('');
        if (!value) {
            setVideoSrc('');
            return undefined;
        }
        const normalized = assetUrl(value);
        if (normalized.startsWith('/uploads/') || normalized.includes('/uploads/')) {
            let alive = true;
            (async () => {
                const id = encodeURIComponent(lesson?.id || lessonId);
                // IMPORTANT: these must use apiUrl(), not assetUrl(). assetUrl()
                // only rewrites "/uploads/..." paths to the backend origin and
                // returns any other path (like "/api/...") completely
                // unchanged — i.e. relative to the FRONTEND's own domain. In
                // production the frontend (Vercel) and backend (Railway) are
                // different domains, and Vercel's catch-all SPA rewrite turns
                // an unmatched "/api/..." request into the index.html page
                // instead of reaching the backend at all. That alone was
                // enough to break playback regardless of cookies/CORS.
                //
                // We also fetch a short-lived, single-video token using a
                // normal authenticated fetch (works fine cross-site) and pass
                // it in the <video> src's query string, so the browser never
                // needs to send the login cookie to a third-party domain.
                try {
                    const tokenRes = await fetch(apiUrl(`/api/video/lessons/${id}/token`), { credentials: 'include', cache: 'no-store' });
                    const body = await tokenRes.json().catch(() => null);
                    if (!alive) return;
                    if (tokenRes.ok && body?.ok && body.token) {
                        setVideoSrc(`${apiUrl(`/api/video/lessons/${id}/stream`)}?token=${encodeURIComponent(body.token)}`);
                    } else {
                        // Fall back to the cookie-based stream — still works
                        // for same-site/local setups and for the teacher's
                        // own preview.
                        setVideoSrc(apiUrl(`/api/video/lessons/${id}/stream`));
                    }
                } catch (err) {
                    console.error('Video token fetch failed:', err);
                    if (alive) setVideoSrc(apiUrl(`/api/video/lessons/${id}/stream`));
                }
            })();
            return () => { alive = false; };
        }
        setVideoSrc(normalized);
        return undefined;
    }, [lesson?.video_url]);

    const trackView = async (completionPercentage = 0, watchDuration = null) => {
        if (!lesson || !user) return;
        try {
            await api.functions.invoke('trackLessonView', {
                lesson_id: lesson.id,
                course_id: lesson.course_id || '',
                teacher_id: lesson.teacher_id,
                watch_duration: watchDuration ?? Math.round(videoRef.current?.currentTime || 0),
                completion_percentage: completionPercentage
            });
        } catch { /* ignore tracking errors */ }
    };

    const handleTimeUpdate = async () => {
        const v = videoRef.current;
        if (!v || !lesson || !user) return;
        const now = Date.now();
        if (now - lastSync.current < 5000) return; // throttle to every 5s
        lastSync.current = now;
        const duration = v.duration || 0;
        const completion = duration > 0 ? Math.round((v.currentTime / duration) * 100) : 0;
        await trackView(completion, Math.round(v.currentTime));
    };

    if (loading) return <div className="flex justify-center py-24"><div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
    if (notFound) return <div className="py-24"><EmptyState icon={AlertCircle} title="الحصة غير موجودة" /></div>;
    if (accessDenied) return <div className="py-24"><EmptyState icon={Lock} title={accessMessage} /></div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto max-w-6xl px-4 py-6">
                <Link to={backTo} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white">
                    <ArrowRight className="h-4 w-4" /> العودة
                </Link>
                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl shadow-black/30">
                    {lesson?.video_url && (driveVideoId || videoSrc) ? (
                        driveVideoId ? (
                            <iframe
                                src={`https://drive.google.com/file/d/${driveVideoId}/preview`}
                                title={lesson?.title || 'الفيديو'}
                                className="aspect-video w-full border-0"
                                allow="autoplay; encrypted-media"
                                allowFullScreen
                                onLoad={() => trackView(0, 0)}
                            />
                        ) : (
                            <video
                                ref={videoRef}
                                src={videoSrc}
                                controls
                                playsInline
                                preload="metadata"
                                className="aspect-video w-full bg-black"
                                onError={() => setVideoError('تعذر تشغيل ملف الفيديو من الخادم. جرّب إعادة رفع الفيديو من صفحة المدرس.')}
                                onLoadedMetadata={() => setVideoError('')}
                                onPlay={() => trackView(0, Math.round(videoRef.current?.currentTime || 0))}
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={() => trackView(100, Math.round(videoRef.current?.duration || 0))}
                            />
                        )
                    ) : (
                        <div className="flex aspect-video w-full items-center justify-center text-slate-400"><Play className="h-12 w-12" /></div>
                    )}
                </div>
                {videoError && <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{videoError}</div>}
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold"><span className="rounded-full bg-indigo-500/20 px-3 py-1 text-indigo-200">فيديو تعليمي</span>{lesson?.course_id && <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">داخل الكورس</span>}</div><h1 className="text-2xl font-black">{lesson?.title}</h1>
                    {lesson?.description && <p className="mt-2 text-slate-300 leading-relaxed">{lesson.description}</p>}
                </div>
            </div>
        </div>
    );
}