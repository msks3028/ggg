import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { gradeMatches } from '@/lib/grades';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import FileUpload from '@/components/ui/FileUpload';
import EmptyState from '@/components/ui/EmptyState';
import { ArrowRight, Lock, Download, CheckCircle2, Clock } from 'lucide-react';
import ContentPreview from '@/components/ui/ContentPreview';

export default function AssignmentSubmitPage() {
    const { slug, assignmentId } = useParams();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const requestedReturn = searchParams.get('returnTo') || '';
    const backTo = requestedReturn.startsWith('/student') ? requestedReturn : (user?.role === 'STUDENT' ? '/student/assignments' : (slug ? `/teacher/${slug}` : '/teacher/assignments'));
    const { toast } = useToast();
    const [assignment, setAssignment] = useState(null);
    const [existing, setExisting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [denied, setDenied] = useState(false);
    const [fileUrl, setFileUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const items = await api.entities.Assignment.filter({ id: assignmentId });
                const a = items[0];
                if (!a) { setDenied(true); return; }
                if (a.status !== 'published' && a.teacher_id !== user.id) { setDenied(true); return; }
                const [courses, users] = await Promise.all([api.entities.Course.filter({ id: a.course_id || '__none__' }), api.entities.User.filter({ id: user.id })]);
                const effectiveGrade = a.target_grade || courses[0]?.target_grade || '';
                if (!gradeMatches(effectiveGrade, users[0]?.grade || user.grade) && a.teacher_id !== user.id) { setDenied(true); return; }
                setAssignment(a);
                const subs = await api.entities.AssignmentSubmission.filter({ assignment_id: assignmentId, student_id: user.id });
                if (subs[0]) { setExisting(subs[0]); setFileUrl(subs[0].file_url); }
            } finally { setLoading(false); }
        })();
    }, [slug, assignmentId]);

    const submit = async () => {
        if (!fileUrl) { toast({ variant: 'destructive', title: 'ارفع ملف الحل أولًا' }); return; }
        setSubmitting(true);
        try {
            if (existing) {
                await api.entities.AssignmentSubmission.update(existing.id, { file_url: fileUrl, submitted_at: new Date().toISOString(), status: 'submitted' });
            } else {
                await api.entities.AssignmentSubmission.create({
                    student_id: user.id, teacher_id: assignment.teacher_id, assignment_id: assignment.id,
                    course_id: assignment.course_id || '', file_url: fileUrl,
                    submitted_at: new Date().toISOString(), status: 'submitted'
                });
            }
            setSubmitted(true);
            toast({ title: 'تم تسليم الواجب' });
        } catch (err) { toast({ variant: 'destructive', title: 'خطأ', description: err?.message }); }
        finally { setSubmitting(false); }
    };

    if (loading) return <div className="flex justify-center py-24"><div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
    if (denied) return <div className="py-24"><EmptyState icon={Lock} title="لا يمكنك الوصول إلى هذا الواجب" /></div>;

    if (submitted || (existing && existing.status === 'graded')) {
        return (
            <div className="min-h-screen bg-slate-50 py-10">
                <div className="mx-auto max-w-2xl px-4">
                    <Card className="border-slate-200"><CardContent className="p-8 text-center">
                        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
                        <h1 className="mt-4 text-xl font-bold text-slate-900">{existing?.status === 'graded' ? 'تم تصحيح واجبك' : 'تم تسليم واجبك'}</h1>
                        {existing?.status === 'graded' && (
                            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-right">
                                <p className="text-sm text-slate-500">الدرجة: <span className="font-bold text-slate-900">{existing.score} / {assignment.max_score}</span></p>
                                {existing.feedback && <p className="mt-2 text-sm text-slate-600">ملاحظات المدرّس: {existing.feedback}</p>}
                            </div>
                        )}
                        <Link to={backTo}><Button variant="outline" className="mt-6">العودة</Button></Link>
                    </CardContent></Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="mx-auto max-w-3xl px-4">
                <Link to={backTo} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowRight className="h-4 w-4" /> العودة</Link>
                <Card className="mb-6 border-slate-200"><CardContent className="p-6">
                    <h1 className="text-2xl font-bold text-slate-900">{assignment?.title}</h1>
                    {assignment?.description && <p className="mt-3 whitespace-pre-line text-slate-600">{assignment.description}</p>}
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                        {assignment?.deadline && <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> آخر موعد: {new Date(assignment.deadline).toLocaleDateString('ar-EG')}</span>}
                        <span>الدرجة العظمى: {assignment?.max_score}</span>
                    </div>
                    {assignment?.attachment_url && <div className="mt-5"><h2 className="mb-3 font-bold text-slate-800">ملف الواجب</h2><ContentPreview item={{file_url: assignment.attachment_url, file_type: assignment.attachment_type || assignment.file_type}} title="ملف الواجب" /></div>}
                </CardContent></Card>

                <Card className="border-slate-200"><CardContent className="p-6">
                    <h2 className="mb-2 font-semibold text-slate-800">رفع الحل</h2>
                    <FileUpload value={fileUrl} onChange={setFileUrl} folder="student-submissions" hint="ارفع ملف الحل الخاص بك" />
                    <Button onClick={submit} disabled={submitting} className="mt-4">{submitting ? 'جارٍ التسليم...' : (existing ? 'إعادة التسليم' : 'تسليم الواجب')}</Button>
                </CardContent></Card>
            </div>
        </div>
    );
}