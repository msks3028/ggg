import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { isLocalFileUrl, openLocalFile } from '@/lib/localFiles';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FileUpload from '@/components/ui/FileUpload';
import { useTeacherCourses } from '@/lib/useTeacherCourses';
import { GRADES } from '@/lib/grades';
import TeacherGradeFilter, { matchesTeacherGrade } from '@/components/ui/TeacherGradeFilter';
import { readTeacherGrade, saveTeacherGrade } from '@/lib/teacherGrade';
import { Plus, ClipboardList, Pencil, Trash2, Eye, EyeOff, Inbox, Download, CheckCircle2 } from 'lucide-react';

const EMPTY = { title: '', description: '', course_id: '', target_grade: '', deadline: '', max_score: 100, attachment_url: '', status: 'draft' };

export default function TeacherAssignments() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { courses } = useTeacherCourses();
    const [searchParams] = useSearchParams();
    const courseIdFromUrl = searchParams.get('courseId') || '';
    const editIdFromUrl = searchParams.get('editId') || '';
    const [items, setItems] = useState([]);
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [gradeOpen, setGradeOpen] = useState(null);
    const [selectedGrade, setSelectedGrade] = useState(readTeacherGrade);
    const visibleItems = items.filter((item) => matchesTeacherGrade(item, selectedGrade, courses));
    const changeGrade = (grade) => { setSelectedGrade(grade); saveTeacherGrade(grade); };

    const load = async () => {
        setLoading(true);
        try {
            const [data, submissions] = await Promise.all([
                courseIdFromUrl
                    ? api.entities.Assignment.filter({ course_id: courseIdFromUrl }, '-created_date', 200)
                    : api.entities.Assignment.list('-created_date', 200),
                api.entities.AssignmentSubmission.list('-created_date', 500),
            ]);
            // The server already scopes Assignment/AssignmentSubmission lists
            // to this teacher. Do not re-filter by user.id on the client: in
            // demo mode that id is a fixed placeholder that never matches the
            // real database teacher_id, which used to hide every real item.
            setItems(data);
            setSubs(submissions);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const openCreate = () => { setEditing(null); setForm({ ...EMPTY, course_id: courseIdFromUrl }); setOpen(true); };
    const openEdit = (a) => { setEditing(a); setForm({ ...a }); setOpen(true); };

    useEffect(() => { if (!courseIdFromUrl) return; if (editIdFromUrl) { const item = items.find((x) => String(x.id) === String(editIdFromUrl)); if (item) openEdit(item); return; } setEditing(null); setForm({ ...EMPTY, course_id: courseIdFromUrl }); setOpen(true); }, [courseIdFromUrl, editIdFromUrl, items]);

    const save = async () => {
        if (!form.title) { toast({ variant: 'destructive', title: 'أدخل العنوان' }); return; }
        setSaving(true);
        try {
            const payload = { ...form, teacher_id: user.id, course_id: courseIdFromUrl || form.course_id || '', max_score: Number(form.max_score) || 100 };
            if (editing) { await api.entities.Assignment.update(editing.id, payload); toast({ title: 'تم التحديث' }); }
            else { await api.entities.Assignment.create(payload); toast({ title: 'تم إنشاء الواجب' }); }
            setOpen(false);
            if (courseIdFromUrl) navigate(`/teacher/courses/${courseIdFromUrl}`);
            else load();
        } catch (err) { toast({ variant: 'destructive', title: 'خطأ', description: err?.message }); }
        finally { setSaving(false); }
    };

    const togglePublish = async (a) => { await api.entities.Assignment.update(a.id, { status: a.status === 'published' ? 'draft' : 'published' }); if (courseIdFromUrl) navigate(`/teacher/courses/${courseIdFromUrl}`); else load(); };
    const remove = async () => { await api.entities.Assignment.delete(toDelete.id); toast({ title: 'تم الحذف' }); load(); };

    const subCount = (id) => subs.filter((s) => s.assignment_id === id).length;

    return (
        <div>
            <PageHeader title={courseIdFromUrl ? `واجبات الكورس: ${courses.find((c) => String(c.id) === String(courseIdFromUrl))?.title || 'الكورس'}` : 'الواجبات'} description={courseIdFromUrl ? 'أنشئ واجبات لهذا الكورس فقط. لن تظهر في الواجبات العامة.' : 'إنشاء الواجبات وتصحيح حلول الطلاب'}
                actions={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> واجب جديد</Button>} />

            {courseIdFromUrl ? <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm"><div><b className="text-indigo-900">وضع إضافة داخل الكورس</b><p className="mt-1 text-indigo-700">كل واجب تنشئه هنا سيتم ربطه بالكورس الحالي تلقائيًا.</p></div><Button variant="outline" size="sm" onClick={() => window.history.back()}>العودة للكورس</Button></div> : <TeacherGradeFilter value={selectedGrade} onChange={changeGrade} />}

            {loading ? (
                <div className="flex justify-center py-16"><div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>
            ) : visibleItems.length === 0 ? (
                <EmptyState icon={ClipboardList} title="لا توجد واجبات" description="أنشئ أول واجب"
                    action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> واجب جديد</Button>} />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleItems.map((a) => (
                        <Card key={a.id} className="border-slate-200 transition hover:shadow-md">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-semibold text-slate-800">{a.title}</p>
                                    <span className={`rounded-full px-2 py-0.5 text-xs ${a.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{a.status === 'published' ? 'منشور' : 'مسودة'}</span>
                                </div>
                                {a.deadline && <p className="mt-1 text-xs text-slate-400">آخر موعد: {new Date(a.deadline).toLocaleDateString('ar-EG')}</p>}
                                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                    <Inbox className="h-3.5 w-3.5" /> {subCount(a.id)} حلول مستلمة
                                </div>
                                <div className="mt-3 flex items-center gap-1">
                                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setGradeOpen({ assignment: a, submissions: subs.filter((s) => s.assignment_id === a.id) })}><CheckCircle2 className="h-3.5 w-3.5" /> الحلول</Button>
                                    <Button size="sm" variant="ghost" className="h-8" onClick={() => togglePublish(a)}>{a.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                                    <Button size="sm" variant="ghost" className="h-8" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                                    <Button size="sm" variant="ghost" className="h-8 text-rose-600" onClick={() => setToDelete(a)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{editing ? 'تعديل الواجب' : 'واجب جديد'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-1.5"><Label>العنوان</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>المطلوب</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>الكورس</Label>
                                {courseIdFromUrl ? <div className="flex min-h-10 items-center rounded-md border border-indigo-100 bg-indigo-50 px-3 text-sm font-bold text-indigo-700">{courses.find((c) => String(c.id) === String(courseIdFromUrl))?.title || 'الكورس الحالي'}</div> : <Select value={form.course_id || 'none'} onValueChange={(v) => { const id = v === 'none' ? '' : v; const course = courses.find((c) => c.id === id); setForm({ ...form, course_id: id, target_grade: course?.target_grade || '' }); }}>
                                    <SelectTrigger><SelectValue placeholder="بدون كورس" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">بدون كورس</SelectItem>
                                        {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>}
                            </div><div className="space-y-1.5"><Label>الصف الدراسي</Label>{form.course_id ? <div className="flex min-h-10 items-center rounded-md border border-indigo-100 bg-indigo-50 px-3 text-sm font-bold text-indigo-700">{courses.find((c) => c.id === form.course_id)?.target_grade || form.target_grade || 'غير محدد'}</div> : <Select value={form.target_grade || 'all'} onValueChange={(v)=>setForm({ ...form, target_grade: v === 'all' ? '' : v })}><SelectTrigger><SelectValue placeholder="كل الصفوف"/></SelectTrigger><SelectContent><SelectItem value="all">كل الصفوف</SelectItem>{GRADES.map((g)=><SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>}</div>
                            <div className="space-y-1.5"><Label>آخر موعد</Label><Input type="date" value={form.deadline ? form.deadline.slice(0, 10) : ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                        </div>
                        <div className="space-y-1.5"><Label>حالة النشر</Label><Select value={form.status || 'draft'} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">مسودة - غير منشور</SelectItem><SelectItem value="published">منشور للطلاب</SelectItem></SelectContent></Select></div>
                        <div className="space-y-1.5"><Label>الدرجة العظمى</Label><Input type="number" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} /></div>
                        <FileUpload label="ملف مرفق (اختياري)" value={form.attachment_url || ''} onChange={(v) => setForm({ ...form, attachment_url: v })} />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                        <Button onClick={save} disabled={saving}>{saving ? 'جارٍ...' : 'حفظ'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <GradeDialog data={gradeOpen} onClose={() => setGradeOpen(null)} onSaved={load} />

            <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} title="حذف الواجب" message={`حذف "${toDelete?.title}"؟`} destructive confirmText="حذف" />
        </div>
    );
}

function GradeDialog({ data, onClose, onSaved }) {
    const { toast } = useToast();
    const [active, setActive] = useState(null);
    const [score, setScore] = useState('');
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (active) { setScore(active.score ?? ''); setFeedback(active.feedback || ''); }
    }, [active]);

    if (!data) return null;

    const grade = async () => {
        setSaving(true);
        try {
            await api.entities.AssignmentSubmission.update(active.id, { score: Number(score) || 0, feedback, status: 'graded' });
            toast({ title: 'تم حفظ الدرجة' });
            onSaved();
            setActive(null);
        } catch (err) { toast({ variant: 'destructive', title: 'خطأ', description: err?.message }); }
        finally { setSaving(false); }
    };

    return (
        <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>حلول: {data.assignment.title}</DialogTitle></DialogHeader>
                <div className="grid gap-4 md:grid-cols-2 max-h-[70vh]">
                    <div className="space-y-2 overflow-y-auto">
                        {data.submissions.length === 0 ? <p className="text-sm text-slate-400 py-8 text-center">لا توجد حلول بعد</p> : data.submissions.map((s) => (
                            <button key={s.id} onClick={() => setActive(s)} className={`w-full text-right rounded-xl border p-3 transition ${active?.id === s.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <p className="text-sm font-medium text-slate-700">{s.student_id === active?.student_id ? 'الطالب الحالي' : 'طالب'}</p>
                                <p className="text-xs text-slate-400">{new Date(s.submitted_at).toLocaleDateString('ar-EG')}</p>
                                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${s.status === 'graded' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{s.status === 'graded' ? `مصحح: ${s.score}` : 'بانتظار التصحيح'}</span>
                            </button>
                        ))}
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                        {active ? (
                            <div className="space-y-3">
                                <button type="button" onClick={async () => { if (isLocalFileUrl(active.file_url)) await openLocalFile(active.file_url); else window.open(active.file_url, '_blank'); }} className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><Download className="h-4 w-4" /> عرض الحل</button>
                                <div className="space-y-1.5"><Label>الدرجة (من {data.assignment.max_score})</Label><Input type="number" value={score} onChange={(e) => setScore(e.target.value)} /></div>
                                <div className="space-y-1.5"><Label>ملاحظات</Label><Textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></div>
                                <Button onClick={grade} disabled={saving} className="w-full">{saving ? 'جارٍ...' : 'حفظ التصحيح'}</Button>
                            </div>
                        ) : <p className="py-12 text-center text-sm text-slate-400">اختر حلًا لتصحيحه</p>}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}