import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/apiClient';
import LocalFileImage from '@/components/ui/LocalFileImage';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import EmptyState from '@/components/ui/EmptyState';
import { Flag, Play, ClipboardCheck, ClipboardList, Megaphone, BookOpen, FileText, AlertCircle, Facebook, Twitter, Instagram, Youtube, Globe, MessageCircle, GraduationCap } from 'lucide-react';

export default function TeacherPublicPage() {
    const { slug } = useParams();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [link, setLink] = useState(null);
    const [profile, setProfile] = useState(null);
    const [content, setContent] = useState({ courses: [], lessons: [], materials: [], exams: [], assignments: [], announcements: [] });
    const [reportOpen, setReportOpen] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.functions.invoke('getPublicTeacher', { slug });
                const d = res.data || res;
                if (d.status === 'ok') {
                    setLink({ teacher_id: d.teacher_id, teacher_name: d.teacher_name, status: 'active' });
                    setProfile(d.profile);
                    setContent({ courses: d.courses, lessons: d.lessons, materials: d.materials, exams: d.exams, assignments: d.assignments, announcements: d.announcements });
                } else if (d.status === 'not_ready') {
                    setLink({ teacher_id: '', teacher_name: d.teacher_name, status: 'active' });
                } else if (d.status === 'disabled') {
                    setLink({ teacher_id: '', teacher_name: '', status: 'disabled' });
                } else {
                    setLink(null);
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [slug]);

    if (loading) return <div className="flex justify-center py-24"><div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;

    if (!link) return <div className="py-24"><EmptyState icon={AlertCircle} title="الرابط غير موجود" description="تحقق من صحة الرابط" /></div>;
    if (link.status !== 'active') return <div className="py-24"><EmptyState icon={AlertCircle} title="هذه الصفحة معطّلة" description="تم تعطيل الرابط من قبل المدير" /></div>;
    if (!link.teacher_id) return <div className="py-24"><EmptyState icon={AlertCircle} title="صفحة غير جاهزة بعد" description="لم يقم المدرّس بتفعيل حسابه بعد" /></div>;

    const teacherId = link.teacher_id;
    const accent = profile?.accent_color || '#2563eb';
    const theme = profile?.theme_color || '#0f172a';
    const order = profile?.section_order?.length ? profile.section_order : ['cover', 'profile', 'bio', 'courses', 'lessons', 'files', 'exams', 'assignments', 'announcements'];

    return (
        <div className="min-h-screen bg-slate-50 pb-16">
            {order.map((section) => {
                switch (section) {
                    case 'cover': return <CoverSection key="cover" profile={profile} theme={theme} link={link} />;
                    case 'profile': return <ProfileSection key="profile" profile={profile} link={link} accent={accent} />;
                    case 'bio': return profile?.bio ? <BioSection key="bio" bio={profile.bio} /> : null;
                    case 'courses': return <SectionWrapper key="courses" title="الكورسات" icon={BookOpen}>{content.courses.length ? <CourseGrid courses={content.courses} teacherId={teacherId} user={user} /> : <Empty text="لا توجد كورسات" />}</SectionWrapper>;
                    case 'lessons': return <SectionWrapper key="lessons" title="الحصص المسجلة" icon={Play}>{content.lessons.length ? <LessonGrid lessons={content.lessons} slug={slug} /> : <Empty text="لا توجد حصص منشورة" />}</SectionWrapper>;
                    case 'files': return <SectionWrapper key="files" title="الملفات والملازم" icon={FileText}>{content.materials.length ? <FileList materials={content.materials} teacherId={teacherId} /> : <Empty text="لا توجد ملفات" />}</SectionWrapper>;
                    case 'exams': return <SectionWrapper key="exams" title="الاختبارات" icon={ClipboardCheck}>{content.exams.length ? <ExamList exams={content.exams} slug={slug} /> : <Empty text="لا توجد اختبارات" />}</SectionWrapper>;
                    case 'assignments': return <SectionWrapper key="assignments" title="الواجبات" icon={ClipboardList}>{content.assignments.length ? <AssignmentList assignments={content.assignments} slug={slug} /> : <Empty text="لا توجد واجبات" />}</SectionWrapper>;
                    case 'announcements': return <SectionWrapper key="announcements" title="الإعلانات" icon={Megaphone}>{content.announcements.length ? <AnnouncementList items={content.announcements} /> : <Empty text="لا توجد إعلانات" />}</SectionWrapper>;
                    default: return null;
                }
            })}

            <div className="mx-auto mt-8 max-w-5xl px-4">
                <Button variant="outline" className="gap-2" onClick={() => setReportOpen(true)}><Flag className="h-4 w-4" /> الإبلاغ عن مشكلة</Button>
            </div>

            <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} teacherId={teacherId} teacherName={link.teacher_name} user={user} />
        </div>
    );
}

function CoverSection({ profile, theme, link }) {
    return (
        <div className="relative h-56 w-full overflow-hidden sm:h-72" style={{ backgroundColor: theme }}>
            {profile?.cover_image && <LocalFileImage src={profile.cover_image} alt="" className="h-full w-full object-cover opacity-90" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-0 right-0 p-6 text-white sm:p-10">
                <h1 className="text-3xl font-extrabold sm:text-4xl">{profile?.page_title || link.teacher_name || 'صفحة المدرّس'}</h1>
            </div>
        </div>
    );
}

function ProfileSection({ profile, link, accent }) {
    const socials = profile?.social_links || {};
    const socialItems = [
        { key: 'facebook', icon: Facebook, url: socials.facebook },
        { key: 'twitter', icon: Twitter, url: socials.twitter },
        { key: 'instagram', icon: Instagram, url: socials.instagram },
        { key: 'youtube', icon: Youtube, url: socials.youtube },
        { key: 'website', icon: Globe, url: socials.website },
        { key: 'whatsapp', icon: MessageCircle, url: socials.whatsapp },
    ].filter((s) => s.url);
    return (
        <div className="mx-auto -mt-12 max-w-5xl px-4">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
                <div className="h-28 w-28 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg">
                    {profile?.profile_image ? <LocalFileImage src={profile.profile_image} alt="" className="h-full w-full object-cover" /> : (
                        <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: accent }}><GraduationCap className="h-12 w-12 text-white" /></div>
                    )}
                </div>
                <div className="flex-1 text-center sm:text-right">
                    {profile?.specialization && <p className="text-sm font-medium" style={{ color: accent }}>{profile.specialization}</p>}
                    <div className="mt-2 flex justify-center gap-2 sm:justify-start">
                        {socialItems.map((s) => <a key={s.key} href={s.url} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"><s.icon className="h-4 w-4" /></a>)}
                    </div>
                </div>
            </div>
        </div>
    );
}

function BioSection({ bio }) {
    return (
        <div className="mx-auto mt-6 max-w-3xl px-4">
            <p className="text-center text-slate-600 leading-relaxed whitespace-pre-line">{bio}</p>
        </div>
    );
}

function SectionWrapper({ title, icon: Icon, children }) {
    return (
        <div className="mx-auto mt-10 max-w-5xl px-4">
            <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white"><Icon className="h-5 w-5" /></div>
                <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            </div>
            {children}
        </div>
    );
}

function Empty({ text }) { return <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">{text}</p>; }

function CourseGrid({ courses, teacherId, user }) {
    const { toast } = useToast();
    const [enrolled, setEnrolled] = useState([]);
    const [loadingId, setLoadingId] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const data = await api.entities.Enrollment.list('-created_date', 200);
                setEnrolled(data.filter((e) => e.student_id === user?.id).map((e) => e.course_id));
            } catch { /* ignore */ }
        })();
    }, [user]);

    const enroll = async (c) => {
        if (!user) return;
        if (enrolled.includes(c.id)) return;
        setLoadingId(c.id);
        try {
            await api.entities.Enrollment.create({
                student_id: user.id, teacher_id: teacherId, course_id: c.id,
                enrolled_at: new Date().toISOString(), progress: 0
            });
            setEnrolled([...enrolled, c.id]);
            toast({ title: 'تم الاشتراك في الكورس' });
        } catch (err) { toast({ variant: 'destructive', title: 'خطأ', description: err?.message }); }
        finally { setLoadingId(''); }
    };

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
                <Card key={c.id} className="overflow-hidden border-slate-200 transition hover:shadow-md">
                    <div className="h-32 bg-slate-100">{c.cover_image && <LocalFileImage src={c.cover_image} alt="" className="h-full w-full object-cover" />}</div>
                    <CardContent className="p-4">
                        <p className="font-semibold text-slate-800">{c.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description}</p>
                        <Button
                            size="sm"
                            variant={enrolled.includes(c.id) ? 'secondary' : 'default'}
                            className="mt-3 w-full"
                            disabled={enrolled.includes(c.id) || loadingId === c.id}
                            onClick={() => enroll(c)}
                        >
                            {enrolled.includes(c.id) ? 'مشترك ✓' : loadingId === c.id ? '...' : 'اشترك في الكورس'}
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}


function LessonGrid({ lessons, slug }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((l) => (
                <Link key={l.id} to={`/teacher/${slug}/lesson/${l.id}`}>
                    <Card className="overflow-hidden border-slate-200 transition hover:shadow-md">
                        <div className="relative h-36 bg-slate-100">
                            {l.thumbnail ? <LocalFileImage src={l.thumbnail} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300"><Play className="h-10 w-10" /></div>}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition hover:opacity-100"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90"><Play className="h-6 w-6 text-slate-900" /></div></div>
                            {l.is_free && <span className="absolute top-2 right-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">مجاني</span>}
                        </div>
                        <CardContent className="p-3"><p className="font-medium text-slate-800 line-clamp-1">{l.title}</p></CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}

function FileList({ materials, teacherId, slug }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {materials.map((m) => (
                <Link key={m.id} to={`/material/${m.id}?returnTo=${encodeURIComponent(`/teacher/${slug}`)}`} className="block">
                    <Card className="border-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FileText className="h-6 w-6" /></div>
                        <div className="min-w-0 flex-1"><p className="truncate font-medium text-slate-800">{m.name}</p>{m.description && <p className="truncate text-xs text-slate-400">{m.description}</p>}</div>
                        <span className="text-xs font-bold text-indigo-600">فتح داخل الموقع</span>
                    </CardContent></Card>
                </Link>
            ))}
        </div>
    );
}

function ExamList({ exams, slug }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {exams.map((e) => (
                <Card key={e.id} className="border-slate-200"><CardContent className="p-4">
                    <p className="font-semibold text-slate-800">{e.title}</p>
                    <div className="mt-1 flex gap-3 text-xs text-slate-400"><span>المدة: {e.duration} دقيقة</span><span>النجاح: {e.passing_score}%</span></div>
                    <Link to={`/teacher/${slug}/exam/${e.id}`}><Button size="sm" className="mt-3 gap-1"><ClipboardCheck className="h-4 w-4" /> بدء الاختبار</Button></Link>
                </CardContent></Card>
            ))}
        </div>
    );
}

function AssignmentList({ assignments, slug }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {assignments.map((a) => (
                <Card key={a.id} className="border-slate-200"><CardContent className="p-4">
                    <p className="font-semibold text-slate-800">{a.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{a.description}</p>
                    {a.deadline && <p className="mt-1 text-xs text-slate-400">آخر موعد: {new Date(a.deadline).toLocaleDateString('ar-EG')}</p>}
                    <Link to={`/teacher/${slug}/assignment/${a.id}`}><Button size="sm" variant="outline" className="mt-3 gap-1"><ClipboardList className="h-4 w-4" /> فتح الواجب</Button></Link>
                </CardContent></Card>
            ))}
        </div>
    );
}

function AnnouncementList({ items }) {
    return (
        <div className="space-y-3">
            {items.map((a) => (
                <Card key={a.id} className="border-slate-200"><CardContent className="flex items-start gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Megaphone className="h-5 w-5" /></div>
                    <div><p className="font-semibold text-slate-800">{a.title}</p><p className="mt-0.5 text-sm text-slate-600">{a.message}</p><p className="mt-1 text-xs text-slate-400">{new Date(a.date || a.created_date).toLocaleDateString('ar-EG')}</p></div>
                </CardContent></Card>
            ))}
        </div>
    );
}

function ReportDialog({ open, onClose, teacherId, teacherName, user }) {
    const { toast } = useToast();
    const [type, setType] = useState('other');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async () => {
        if (!message) { toast({ variant: 'destructive', title: 'اكتب رسالة البلاغ' }); return; }
        setSaving(true);
        try {
            await api.entities.ProblemReport.create({
                student_id: user?.id || '',
                student_name: user?.full_name || user?.email || '',
                teacher_id: teacherId,
                teacher_name: teacherName || '',
                problem_type: type,
                message,
                status: 'open'
            });
            toast({ title: 'تم إرسال البلاغ' });
            setMessage(''); setType('other'); onClose();
        } catch (err) { toast({ variant: 'destructive', title: 'خطأ', description: err?.message }); }
        finally { setSaving(false); }
    };
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>الإبلاغ عن مشكلة</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>نوع المشكلة</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="video">مشكلة فيديو</SelectItem>
                                <SelectItem value="file">مشكلة ملف</SelectItem>
                                <SelectItem value="exam">مشكلة اختبار</SelectItem>
                                <SelectItem value="assignment">مشكلة واجب</SelectItem>
                                <SelectItem value="login">مشكلة تسجيل دخول</SelectItem>
                                <SelectItem value="other">أخرى</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5"><Label>الرسالة</Label><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
                </div>
                <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>إلغاء</Button><Button onClick={submit} disabled={saving}>{saving ? 'جارٍ...' : 'إرسال'}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}