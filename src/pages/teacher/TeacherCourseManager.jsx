import LocalFileImage from "@/components/ui/LocalFileImage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight, BookOpen, Video, ClipboardCheck, FileText, ClipboardList,
  Megaphone, Layers3, Plus, RefreshCw, Eye, EyeOff, Pencil, Trash2
} from "lucide-react";
import { api } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import FileUpload from "@/components/ui/FileUpload";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/use-toast";

const TYPE_META = {
  lessons: { label: "الفيديوهات والحصص", icon: Video, color: "bg-blue-50 text-blue-700" },
  exams: { label: "الاختبارات", icon: ClipboardCheck, color: "bg-violet-50 text-violet-700" },
  assignments: { label: "الواجبات", icon: ClipboardList, color: "bg-amber-50 text-amber-700" },
  materials: { label: "الملفات والملازم", icon: FileText, color: "bg-emerald-50 text-emerald-700" },
  announcements: { label: "الإعلانات", icon: Megaphone, color: "bg-rose-50 text-rose-700" },
  sections: { label: "أقسام الكورس", icon: Layers3, color: "bg-slate-100 text-slate-700" },
};


function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function PublishField({ value, onChange }) {
  return <Field label="حالة النشر"><Select value={value === 'published' ? 'published' : 'draft'} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">مسودة - غير منشور</SelectItem><SelectItem value="published">منشور للطلاب</SelectItem></SelectContent></Select></Field>;
}

export default function TeacherCourseManager() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState(null);
  const [content, setContent] = useState({
    lessons: [], exams: [], assignments: [], materials: [], announcements: [], sections: []
  });
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [courses, lessons, exams, assignments, materials, announcements, sections] = await Promise.all([
        api.entities.Course.list("-created_date", 500),
        api.entities.Lesson.filter({ course_id: courseId }, "-created_date", 1000),
        api.entities.Exam.filter({ course_id: courseId }, "-created_date", 1000),
        api.entities.Assignment.filter({ course_id: courseId }, "-created_date", 1000),
        api.entities.Material.filter({ course_id: courseId }, "-created_date", 1000),
        api.entities.Announcement.filter({ course_id: courseId }, "-created_date", 1000),
        api.entities.CourseSection.filter({ course_id: courseId }, "order", 500),
      ]);
      const found = courses.find((item) => String(item.id) === String(courseId));
      if (!found) {
        setCourse(null);
        toast({ variant: "destructive", title: "الكورس غير موجود أو لا تملكه." });
        return;
      }
      setCourse(found);
      const byCourse = (rows) => Array.isArray(rows) ? rows : [];
      setContent({
        lessons: byCourse(lessons),
        exams: byCourse(exams),
        assignments: byCourse(assignments),
        materials: byCourse(materials),
        announcements: byCourse(announcements),
        sections: byCourse(sections),
      });
    } catch (error) {
      console.error("Failed to load course manager:", error);
      toast({
        variant: "destructive",
        title: "تعذر تحميل محتوى الكورس",
        description: error?.message || "حاول مرة أخرى.",
      });
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => { load(); }, [load]);

  const total = useMemo(
    () => Object.values(content).reduce((sum, rows) => sum + rows.length, 0),
    [content]
  );

  const addLink = (path, editId = '') => {
    const query = new URLSearchParams({ courseId: courseId || '' });
    if (editId) query.set('editId', editId);
    return `${path}?${query.toString()}`;
  };

  const togglePublish = async (type, item) => {
    const entityName = { lessons: 'Lesson', exams: 'Exam', assignments: 'Assignment', materials: 'Material', announcements: 'Announcement' }[type];
    if (!entityName || !item?.id) return;
    try {
      const next = item.status === 'published' ? 'draft' : 'published';
      await api.entities[entityName].update(item.id, { status: next });
      toast({ title: next === 'published' ? 'تم النشر' : 'تم إلغاء النشر' });
      await load();
    } catch (error) {
      toast({ variant: 'destructive', title: 'تعذر تغيير حالة النشر', description: error?.message || 'حاول مرة أخرى.' });
    }
  };

  const openEditor = (type, item) => {
    setEditor({ type, item });
    setEditForm({ ...item });
  };

  const closeEditor = () => {
    if (!savingEdit) setEditor(null);
  };

  const saveEditor = async () => {
    if (!editor?.item?.id) return;
    const entityName = { lessons: 'Lesson', exams: 'Exam', assignments: 'Assignment', materials: 'Material', announcements: 'Announcement' }[editor.type];
    if (!entityName) return;
    setSavingEdit(true);
    try {
      const payload = { ...editForm, course_id: courseId };
      if (editor.type === 'lessons') {
        payload.title = String(payload.title || '').trim();
        payload.description = String(payload.description || '');
        payload.video_url = String(payload.video_url || '');
        payload.thumbnail = String(payload.thumbnail || '');
        payload.status = payload.status === 'published' ? 'published' : 'draft';
      } else if (editor.type === 'materials') {
        payload.name = String(payload.name || '').trim();
        payload.title = String(payload.title || payload.name || '').trim();
        payload.description = String(payload.description || '');
        payload.file_url = String(payload.file_url || '');
        payload.file_type = String(payload.file_type || '');
        payload.status = payload.status === 'published' ? 'published' : 'draft';
      } else if (editor.type === 'assignments') {
        payload.title = String(payload.title || '').trim();
        payload.description = String(payload.description || '');
        payload.attachment_url = String(payload.attachment_url || '');
        payload.status = payload.status === 'published' ? 'published' : 'draft';
      } else if (editor.type === 'announcements') {
        payload.title = String(payload.title || '').trim();
        payload.message = String(payload.message || payload.content || '');
        payload.content = payload.message;
        payload.status = payload.status === 'published' ? 'published' : 'draft';
      } else if (editor.type === 'exams') {
        payload.title = String(payload.title || '').trim();
        payload.description = String(payload.description || '');
        payload.duration = Number(payload.duration || 0);
        payload.passing_score = Number(payload.passing_score || 0);
        payload.status = payload.status === 'published' ? 'published' : 'draft';
        payload.pdf_url = String(payload.pdf_url || '');
        payload.pdf_name = String(payload.pdf_name || '');
      }
      if (!payload.title && editor.type !== 'materials') throw new Error('أدخل العنوان أولاً');
      if (editor.type === 'materials' && !payload.name) throw new Error('أدخل اسم الملف أولاً');
      await api.entities[entityName].update(editor.item.id, payload);
      toast({ title: 'تم حفظ تعديلات المحتوى داخل الكورس' });
      setEditor(null);
      await load();
    } catch (error) {
      toast({ variant: 'destructive', title: 'تعذر حفظ التعديل', description: error?.message || 'حاول مرة أخرى.' });
    } finally {
      setSavingEdit(false);
    }
  };

  const removeContent = async (type, item) => {
    const entityName = { lessons: 'Lesson', exams: 'Exam', assignments: 'Assignment', materials: 'Material', announcements: 'Announcement' }[type];
    if (!entityName || !item?.id) return;
    const label = item.title || item.name || 'هذا المحتوى';
    if (!window.confirm(`هل تريد حذف "${label}" نهائيًا؟`)) return;
    try {
      await api.entities[entityName].delete(item.id);
      toast({ title: 'تم حذف المحتوى' });
      await load();
    } catch (error) {
      toast({ variant: 'destructive', title: 'تعذر حذف المحتوى', description: error?.message || 'حاول مرة أخرى.' });
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" /></div>;
  }

  if (!course) {
    return (
      <div className="p-6">
        <EmptyState icon={BookOpen} title="الكورس غير موجود" description="قد يكون تم حذفه أو لا تملك صلاحية الوصول إليه." action={<Button onClick={() => navigate("/teacher/courses")}>العودة إلى الكورسات</Button>} />
      </div>
    );
  }

  const blocks = [
    ["lessons", content.lessons, "/teacher/lessons"],
    ["exams", content.exams, "/teacher/exams"],
    ["assignments", content.assignments, "/teacher/assignments"],
    ["materials", content.materials, "/teacher/files"],
    ["announcements", content.announcements, "/teacher/announcements"],
  ];

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        title={`إدارة كورس: ${course.title}`}
        description={`${course.target_grade || "بدون صف محدد"} • ${total} عنصر داخل الكورس`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/teacher/courses")}><ArrowRight className="ml-2 h-4 w-4" />الكورسات</Button>
            <Button variant="outline" onClick={load}><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button>
          </div>
        }
      />

      <Card className="overflow-hidden border-slate-200">
        <div className="flex flex-col gap-5 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white bg-white shadow-sm">
            {course.cover_image ? (
              <LocalFileImage
                src={course.cover_image}
                alt={course.title || "صورة الكورس"}
                className="h-full w-full object-cover"
                fallback={<BookOpen className="h-9 w-9 text-indigo-400" />}
              />
            ) : <BookOpen className="h-9 w-9 text-indigo-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">{course.title}</h2>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-600">{course.target_grade}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${course.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {course.status === "published" ? "منشور" : "مسودة"}
              </span>
            </div>
            <p className="text-sm leading-6 text-slate-500">{course.description || "هذا هو محتوى الكورس بالكامل. يمكنك فتح أي نوع من المحتوى لإدارته."}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {blocks.map(([key, rows]) => {
          const meta = TYPE_META[key];
          const Icon = meta.icon;
          return (
            <Card key={key} className="border-slate-200">
              <CardContent className="p-4">
                <div className={`mb-3 grid h-11 w-11 place-items-center rounded-xl ${meta.color}`}><Icon className="h-5 w-5" /></div>
                <p className="text-xs font-semibold text-slate-500">{meta.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{rows.length}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {blocks.map(([key, rows, path]) => {
          const meta = TYPE_META[key];
          const Icon = meta.icon;
          return (
            <Card key={key} className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5 text-slate-500" />{meta.label}</CardTitle>
                <Button size="sm" onClick={() => navigate(addLink(path))}><Plus className="ml-1 h-4 w-4" />إضافة</Button>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">لا يوجد محتوى من هذا النوع داخل الكورس.</div>
                ) : (
                  <div className="space-y-2">
                    {rows.slice(0, 8).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800">{item.title || item.name || "بدون عنوان"}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.status === "published" ? "منشور للطلاب" : "مسودة"}{item.target_grade ? ` • ${item.target_grade}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {item.status === "published" ? <><Eye className="inline h-3 w-3" /> منشور</> : <><EyeOff className="inline h-3 w-3" /> مسودة</>}
                          </span>
                          <Button size="sm" variant="outline" className="h-8 gap-1 px-2" title={item.status === 'published' ? 'إلغاء النشر' : 'نشر'} onClick={() => togglePublish(key, item)}>
                            {item.status === 'published' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{item.status === 'published' ? 'إلغاء' : 'نشر'}</span>
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 gap-1 px-2" title="تعديل بالكامل" onClick={() => openEditor(key, item)}>
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">تعديل</span>
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-rose-600" title="حذف" onClick={() => removeContent(key, item)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {rows.length > 8 && <p className="pt-2 text-center text-xs text-slate-400">يظهر هنا أول 8 عناصر — افتح الإدارة لرؤية الباقي.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg"><Layers3 className="h-5 w-5 text-slate-500" />أقسام الكورس</CardTitle>
            <span className="text-xs text-slate-400">{content.sections.length} قسم</span>
          </CardHeader>
          <CardContent>
            {content.sections.length === 0
              ? <p className="text-sm text-slate-400">لا توجد أقسام مضافة حاليًا.</p>
              : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{content.sections.map((section) => <div key={section.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="font-bold text-slate-800">{section.title}</p><p className="mt-1 text-xs text-slate-400">{section.description || "بدون وصف"}</p></div>)}</div>
            }
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editor} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent dir="rtl" className="w-[calc(100vw-2rem)] max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل المحتوى داخل الكورس</DialogTitle>
            <p className="text-xs text-slate-500">عدّل كل البيانات المتاحة هنا. الكورس الحالي ثابت ولا يمكن نقل المحتوى منه إلى محتوى عام.</p>
          </DialogHeader>
          {editor && <div className="max-h-[68vh] space-y-4 overflow-y-auto py-2">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm">
              <span className="text-indigo-600">الكورس</span>
              <div className="mt-1 font-black text-indigo-900">{course.title}</div>
              <div className="mt-1 text-xs text-indigo-700">{course.target_grade || 'بدون صف محدد'}</div>
            </div>

            {editor.type === 'lessons' && <>
              <Field label="عنوان الفيديو / الحصة"><Input value={editForm.title || ''} onChange={e=>setEditForm({...editForm,title:e.target.value})}/></Field>
              <Field label="الوصف"><Textarea rows={4} value={editForm.description || ''} onChange={e=>setEditForm({...editForm,description:e.target.value})}/></Field>
              <FileUpload label="الفيديو" folder="teacher-videos" accept="video/*" value={editForm.video_url || ''} onChange={v=>setEditForm({...editForm,video_url:v})} hint="يمكن استبدال الفيديو الحالي"/>
              <FileUpload label="الصورة المصغرة" folder="teacher-thumbnails" type="image" accept="image/*" value={editForm.thumbnail || ''} onChange={v=>setEditForm({...editForm,thumbnail:v})}/>
              <div className="grid grid-cols-2 gap-3"><Field label="الترتيب"><Input type="number" value={editForm.sort_order ?? editForm.order ?? 0} onChange={e=>setEditForm({...editForm,sort_order:Number(e.target.value),order:Number(e.target.value)})}/></Field><PublishField value={editForm.status} onChange={v=>setEditForm({...editForm,status:v})}/></div>
            </>}

            {editor.type === 'materials' && <>
              <Field label="اسم الملف"><Input value={editForm.name || ''} onChange={e=>setEditForm({...editForm,name:e.target.value})}/></Field>
              <Field label="العنوان"><Input value={editForm.title || ''} onChange={e=>setEditForm({...editForm,title:e.target.value})}/></Field>
              <Field label="الوصف"><Textarea rows={4} value={editForm.description || ''} onChange={e=>setEditForm({...editForm,description:e.target.value})}/></Field>
              <FileUpload label="الملف / PDF" folder="teacher-files" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*" value={editForm.file_url || ''} onChange={v=>setEditForm({...editForm,file_url:v})} hint="يمكن استبدال الملف الحالي"/>
              <PublishField value={editForm.status} onChange={v=>setEditForm({...editForm,status:v})}/>
            </>}

            {editor.type === 'assignments' && <>
              <Field label="عنوان الواجب"><Input value={editForm.title || ''} onChange={e=>setEditForm({...editForm,title:e.target.value})}/></Field>
              <Field label="الوصف والتعليمات"><Textarea rows={5} value={editForm.description || ''} onChange={e=>setEditForm({...editForm,description:e.target.value})}/></Field>
              <FileUpload label="ملف مرفق" folder="teacher-assignments" value={editForm.attachment_url || ''} onChange={v=>setEditForm({...editForm,attachment_url:v})} hint="اختياري"/>
              <div className="grid grid-cols-2 gap-3"><Field label="موعد التسليم"><Input type="datetime-local" value={editForm.due_date || editForm.deadline || ''} onChange={e=>setEditForm({...editForm,due_date:e.target.value,deadline:e.target.value})}/></Field><Field label="الدرجة القصوى"><Input type="number" value={editForm.max_score ?? 100} onChange={e=>setEditForm({...editForm,max_score:Number(e.target.value)})}/></Field></div>
              <PublishField value={editForm.status} onChange={v=>setEditForm({...editForm,status:v})}/>
            </>}

            {editor.type === 'announcements' && <>
              <Field label="عنوان الإعلان"><Input value={editForm.title || ''} onChange={e=>setEditForm({...editForm,title:e.target.value})}/></Field>
              <Field label="نص الإعلان"><Textarea rows={7} value={editForm.message || editForm.content || ''} onChange={e=>setEditForm({...editForm,message:e.target.value,content:e.target.value})}/></Field>
              <Field label="التاريخ"><Input type="datetime-local" value={editForm.date || ''} onChange={e=>setEditForm({...editForm,date:e.target.value})}/></Field>
              <PublishField value={editForm.status} onChange={v=>setEditForm({...editForm,status:v})}/>
            </>}

            {editor.type === 'exams' && <>
              <Field label="عنوان الاختبار"><Input value={editForm.title || ''} onChange={e=>setEditForm({...editForm,title:e.target.value})}/></Field>
              <Field label="وصف الاختبار"><Textarea rows={4} value={editForm.description || ''} onChange={e=>setEditForm({...editForm,description:e.target.value})}/></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="المدة بالدقائق"><Input type="number" value={editForm.duration ?? 0} onChange={e=>setEditForm({...editForm,duration:e.target.value})}/></Field><Field label="درجة النجاح %"><Input type="number" min="0" max="100" value={editForm.passing_score ?? 0} onChange={e=>setEditForm({...editForm,passing_score:e.target.value})}/></Field></div>
              <PublishField value={editForm.status} onChange={v=>setEditForm({...editForm,status:v})}/>
              {editForm.pdf_url !== undefined && <FileUpload label="ملف اختبار PDF" folder="teacher-exams" accept="application/pdf,.pdf" value={editForm.pdf_url || ''} onChange={v=>setEditForm({...editForm,pdf_url:v})} hint="اختياري"/>}
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">أسئلة الاختبار الحالية محفوظة كما هي. تعديل الأسئلة يتم من إدارة أسئلة الاختبار حتى لا يتم فقد أي سؤال بالخطأ.</div>
            </>}
          </div>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeEditor} disabled={savingEdit}>إلغاء</Button>
            <Button onClick={saveEditor} disabled={savingEdit}>{savingEdit ? 'جارٍ الحفظ...' : 'حفظ كل التعديلات'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
