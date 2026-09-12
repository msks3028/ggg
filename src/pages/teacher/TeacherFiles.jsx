import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/apiClient';
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
import { Plus, FileText, Pencil, Trash2, Download, Eye, EyeOff } from 'lucide-react';

const EMPTY = { name: '', description: '', course_id: '', target_grade: '', file_url: '', file_type: '', status: 'draft', download_permission: 'public' };

export default function TeacherFiles() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { courses } = useTeacherCourses();
    const [searchParams] = useSearchParams();
    const courseIdFromUrl = searchParams.get('courseId') || '';
    const editIdFromUrl = searchParams.get('editId') || '';
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [stats, setStats] = useState({});
    const [selectedGrade, setSelectedGrade] = useState(readTeacherGrade);
    const visibleFiles = files.filter((file) => matchesTeacherGrade(file, selectedGrade, courses));
    const changeGrade = (grade) => { setSelectedGrade(grade); saveTeacherGrade(grade); };

    const load = async () => {
        setLoading(true);
        try {
            const [data, dls] = await Promise.all([
                courseIdFromUrl
                    ? api.entities.Material.filter({ course_id: courseIdFromUrl }, '-created_date', 200)
                    : api.entities.Material.list('-created_date', 200),
                api.entities.MaterialDownload.list('-created_date', 1000),
            ]);
            // The server already scopes Material/MaterialDownload lists to
            // this teacher. Do not re-filter by user.id on the client: in
            // demo mode that id is a fixed placeholder that never matches the
            // real database teacher_id, which used to hide every real item.
            setFiles(data);
            const myDls = dls;
            const s = {};
            myDls.forEach((d) => { s[d.file_id] = (s[d.file_id] || 0) + 1; });
            setStats(s);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const openCreate = () => { setEditing(null); setForm({ ...EMPTY, course_id: courseIdFromUrl }); setOpen(true); };
    const openEdit = (f) => { setEditing(f); setForm({ ...f }); setOpen(true); };

    useEffect(() => { if (!courseIdFromUrl) return; if (editIdFromUrl) { const item = files.find((x) => String(x.id) === String(editIdFromUrl)); if (item) openEdit(item); return; } setEditing(null); setForm({ ...EMPTY, course_id: courseIdFromUrl }); setOpen(true); }, [courseIdFromUrl, editIdFromUrl, files]);

    const save = async () => {
        if (!form.name || !form.file_url) { toast({ variant: 'destructive', title: 'أدخل الاسم والملف' }); return; }
        setSaving(true);
        try {
            const payload = { ...form, teacher_id: user.id, course_id: courseIdFromUrl || form.course_id || '' };
            if (editing) { await api.entities.Material.update(editing.id, payload); toast({ title: 'تم التحديث' }); }
            else { await api.entities.Material.create(payload); toast({ title: 'تم رفع الملف' }); }
            setOpen(false);
            if (courseIdFromUrl) navigate(`/teacher/courses/${courseIdFromUrl}`);
            else load();
        } catch (err) { toast({ variant: 'destructive', title: 'خطأ', description: err?.message }); }
        finally { setSaving(false); }
    };

    const togglePublish = async (f) => {
        await api.entities.Material.update(f.id, { status: f.status === 'published' ? 'draft' : 'published' });
        if (courseIdFromUrl) navigate(`/teacher/courses/${courseIdFromUrl}`);
        else load();
    };

    const remove = async () => { await api.entities.Material.delete(toDelete.id); toast({ title: 'تم الحذف' }); load(); };

    const courseName = (id) => courses.find((c) => c.id === id)?.title || 'بدون كورس';

    return (
        <div>
            <PageHeader title={courseIdFromUrl ? `ملفات الكورس: ${courses.find((c) => String(c.id) === String(courseIdFromUrl))?.title || 'الكورس'}` : 'الملفات والملازم'} description={courseIdFromUrl ? 'ارفع ملفات هذا الكورس فقط. لن تظهر في الملفات العامة.' : 'رفع وإدارة الملفات التعليمية والملازم'}
                actions={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> ملف جديد</Button>} />

            {courseIdFromUrl ? <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm"><div><b className="text-indigo-900">وضع إضافة داخل الكورس</b><p className="mt-1 text-indigo-700">كل ملف ترفعه هنا سيتم ربطه بالكورس الحالي تلقائيًا.</p></div><Button variant="outline" size="sm" onClick={() => window.history.back()}>العودة للكورس</Button></div> : <TeacherGradeFilter value={selectedGrade} onChange={changeGrade} />}

            {loading ? (
                <div className="flex justify-center py-16"><div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>
            ) : visibleFiles.length === 0 ? (
                <EmptyState icon={FileText} title="لا توجد ملفات" description="ارفع أول ملف أو ملزمة"
                    action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> رفع ملف</Button>} />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleFiles.map((f) => (
                        <Card key={f.id} className="border-slate-200 transition hover:shadow-md">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FileText className="h-6 w-6" /></div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-slate-800">{f.name}</p>
                                        <p className="truncate text-xs text-slate-400">{courseName(f.course_id)}</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Download className="h-3.5 w-3.5" /> {stats[f.id] || 0} تحميل</span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs ${f.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{f.status === 'published' ? 'منشور' : 'مسودة'}</span>
                                </div>
                                <div className="mt-3 flex items-center gap-1">
                                    <Button size="sm" variant="outline" className="h-8" onClick={() => togglePublish(f)}>{f.status === 'published' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                                    <Button size="sm" variant="ghost" className="h-8" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                                    <Button size="sm" variant="ghost" className="h-8 text-rose-600" onClick={() => setToDelete(f)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{editing ? 'تعديل الملف' : 'رفع ملف جديد'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-1.5"><Label>اسم الملف</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>الوصف</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
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
                        <FileUpload folder="teacher-materials" label="الملف" value={form.file_url || ''} onChange={(v) => setForm({ ...form, file_url: v })} hint="PDF, DOCX, صور..." />
                        <div className="space-y-1.5"><Label>حالة النشر</Label><Select value={form.status || 'draft'} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">مسودة - غير منشور</SelectItem><SelectItem value="published">منشور للطلاب</SelectItem></SelectContent></Select></div>
                        <div className="space-y-1.5">
                            <Label>صلاحية التحميل</Label>
                            <Select value={form.download_permission} onValueChange={(v) => setForm({ ...form, download_permission: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">عام (لجميع الطلاب)</SelectItem>
                                    <SelectItem value="enrolled">للمسجلين في الكورس</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                        <Button onClick={save} disabled={saving}>{saving ? 'جارٍ...' : 'حفظ'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} title="حذف الملف" message={`حذف "${toDelete?.name}"؟`} destructive confirmText="حذف" />
        </div>
    );
}