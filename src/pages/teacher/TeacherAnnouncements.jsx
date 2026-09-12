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
import { useTeacherCourses } from '@/lib/useTeacherCourses';
import TeacherGradeFilter, { matchesTeacherGrade } from '@/components/ui/TeacherGradeFilter';
import { readTeacherGrade, saveTeacherGrade } from '@/lib/teacherGrade';
import { Plus, Megaphone, Pencil, Trash2 } from 'lucide-react';

const EMPTY = { title: '', message: '', course_id: '', target_grade: '', status: 'draft' };

export default function TeacherAnnouncements() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { courses } = useTeacherCourses();
    const [searchParams] = useSearchParams();
    const courseIdFromUrl = searchParams.get('courseId') || '';
    const editIdFromUrl = searchParams.get('editId') || '';
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [selectedGrade, setSelectedGrade] = useState(readTeacherGrade);
    const visibleItems = items.filter((item) => matchesTeacherGrade(item, selectedGrade, courses));
    const changeGrade = (grade) => { setSelectedGrade(grade); saveTeacherGrade(grade); };

    const load = async () => {
        setLoading(true);
        try {
            const data = courseIdFromUrl
                ? await api.entities.Announcement.filter({ course_id: courseIdFromUrl }, '-created_date', 200)
                : await api.entities.Announcement.list('-created_date', 200);
            // The server already scopes the Announcement list to this
            // teacher. Do not re-filter by user.id on the client: in demo
            // mode that id is a fixed placeholder that never matches the
            // real database teacher_id, which used to hide every real item.
            setItems(data);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const openCreate = () => { setEditing(null); setForm({ ...EMPTY, course_id: courseIdFromUrl }); setOpen(true); };
    const openEdit = (a) => { setEditing(a); setForm({ title: a.title, message: a.message, course_id: a.course_id || '', target_grade: a.target_grade || '', status: a.status || 'draft' }); setOpen(true); };

    useEffect(() => { if (!courseIdFromUrl) return; if (editIdFromUrl) { const item = items.find((x) => String(x.id) === String(editIdFromUrl)); if (item) openEdit(item); return; } setEditing(null); setForm({ ...EMPTY, course_id: courseIdFromUrl }); setOpen(true); }, [courseIdFromUrl, editIdFromUrl, items]);

    const save = async () => {
        if (!form.title || !form.message) { toast({ variant: 'destructive', title: 'أكمل البيانات' }); return; }
        setSaving(true);
        try {
            if (editing) { await api.entities.Announcement.update(editing.id, { ...form, course_id: courseIdFromUrl || form.course_id || '' }); toast({ title: 'تم تحديث الإعلان' }); }
            else { await api.entities.Announcement.create({ ...form, teacher_id: user.id, course_id: courseIdFromUrl || form.course_id || '', date: new Date().toISOString() }); toast({ title: form.status === 'published' ? 'تم نشر الإعلان' : 'تم حفظ الإعلان كمسودة' }); }
            setOpen(false);
            if (courseIdFromUrl) navigate(`/teacher/courses/${courseIdFromUrl}`);
            else load();
        } catch (err) { toast({ variant: 'destructive', title: 'خطأ', description: err?.message }); }
        finally { setSaving(false); }
    };

    const togglePublish = async (a) => { await api.entities.Announcement.update(a.id, { status: a.status === 'published' ? 'draft' : 'published' }); if (courseIdFromUrl) navigate(`/teacher/courses/${courseIdFromUrl}`); else load(); };

    const remove = async () => { await api.entities.Announcement.delete(toDelete.id); toast({ title: 'تم الحذف' }); load(); };
    const courseName = (id) => courses.find((c) => c.id === id)?.title || 'عام';

    return (
        <div>
            <PageHeader title={courseIdFromUrl ? `إعلانات الكورس: ${courses.find((c) => String(c.id) === String(courseIdFromUrl))?.title || 'الكورس'}` : 'الإعلانات'} description={courseIdFromUrl ? 'انشر إعلانات لهذا الكورس فقط. لن تظهر في الإعلانات العامة.' : 'نشر إعلانات لطلابك'}
                actions={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> إعلان جديد</Button>} />

            {courseIdFromUrl ? <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm"><div><b className="text-indigo-900">وضع إضافة داخل الكورس</b><p className="mt-1 text-indigo-700">كل إعلان تنشئه هنا سيتم ربطه بالكورس الحالي تلقائيًا.</p></div><Button variant="outline" size="sm" onClick={() => window.history.back()}>العودة للكورس</Button></div> : <TeacherGradeFilter value={selectedGrade} onChange={changeGrade} />}

            {loading ? (
                <div className="flex justify-center py-16"><div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>
            ) : visibleItems.length === 0 ? (
                <EmptyState icon={Megaphone} title="لا توجد إعلانات" description="انشر أول إعلان لطلابك"
                    action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> إعلان جديد</Button>} />
            ) : (
                <div className="space-y-3">
                    {visibleItems.map((a) => (
                        <Card key={a.id} className="border-slate-200 transition hover:shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Megaphone className="h-5 w-5" /></div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{a.title}</p>
                                            <p className="mt-1 text-sm text-slate-600">{a.message}</p>
                                            <div className="mt-2 flex gap-3 text-xs text-slate-400">
                                                <span>{courseName(a.course_id)}</span>
                                                <span>{new Date(a.date || a.created_date).toLocaleDateString('ar-EG')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <span className={`rounded-full px-2 py-1 text-[11px] ${a.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{a.status === 'published' ? 'منشور' : 'مسودة'}</span><Button size="sm" variant="ghost" className="h-8" onClick={() => togglePublish(a)}>{a.status === 'published' ? 'إلغاء النشر' : 'نشر'}</Button><Button size="sm" variant="ghost" className="h-8" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                                        <Button size="sm" variant="ghost" className="h-8 text-rose-600" onClick={() => setToDelete(a)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{editing ? 'تعديل الإعلان' : 'إعلان جديد'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5"><Label>العنوان</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>الرسالة</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>حالة النشر</Label><Select value={form.status || 'draft'} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">مسودة - غير منشور</SelectItem><SelectItem value="published">منشور للطلاب</SelectItem></SelectContent></Select></div>
                        <div className="space-y-1.5">
                            <Label>الكورس (اختياري)</Label>
                            {courseIdFromUrl ? <div className="flex min-h-10 items-center rounded-md border border-indigo-100 bg-indigo-50 px-3 text-sm font-bold text-indigo-700">{courses.find((c) => String(c.id) === String(courseIdFromUrl))?.title || 'الكورس الحالي'}</div> : <Select value={form.course_id || 'none'} onValueChange={(v) => { const id = v === 'none' ? '' : v; const course = courses.find((c) => c.id === id); setForm({ ...form, course_id: id, target_grade: course?.target_grade || '' }); }}>
                                <SelectTrigger><SelectValue placeholder="عام لكل الطلاب" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">عام لكل الطلاب</SelectItem>
                                    {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                                </SelectContent>
                            </Select>}
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                        <Button onClick={save} disabled={saving}>{saving ? 'جارٍ...' : (form.status === 'published' ? 'حفظ ونشر' : 'حفظ كمسودة')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} title="حذف الإعلان" message={`حذف "${toDelete?.title}"؟`} destructive confirmText="حذف" />
        </div>
    );
}