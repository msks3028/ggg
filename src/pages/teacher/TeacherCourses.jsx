import LocalFileImage from "@/components/ui/LocalFileImage";
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { GRADES } from '@/lib/grades';
import TeacherGradeFilter, { matchesTeacherGrade } from '@/components/ui/TeacherGradeFilter';
import { readTeacherGrade, saveTeacherGrade } from '@/lib/teacherGrade';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';

import {
  Plus,
  BookOpen,
  Pencil,
  Trash2,
  Bookmark,
  ArrowUpLeft,
  Eye,
  EyeOff,
} from 'lucide-react';

import FileUpload from '@/components/ui/FileUpload';
import { useToast } from '@/components/ui/use-toast';

const EMPTY = {
  title: '',
  description: '',
  target_grade: '',
  cover_image: '',
  status: 'published',
};

export default function TeacherCourses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(readTeacherGrade);

  const visibleItems = items.filter((course) => matchesTeacherGrade(course, selectedGrade));
  const changeGrade = (grade) => { setSelectedGrade(grade); saveTeacherGrade(grade); };

  const load = async () => {
    try {
      const all = await api.entities.Course.list('-created_date', 500);

      setItems(Array.isArray(all) ? all : []);
    } catch (err) {
      console.error('Failed to load courses:', err);

      toast({
        variant: 'destructive',
        title: 'تعذر تحميل الكورسات',
        description: err?.message || 'حاول مرة أخرى',
      });
    }
  };

  useEffect(() => {
    if (user?.id) {
      load();
    }
  }, [user?.id]);

  const save = async () => {
    if (!form.title.trim() || !form.target_grade) {
      toast({
        variant: 'destructive',
        title: 'أدخل اسم الكورس واختر الصف الدراسي.',
      });
      return;
    }

    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'انتهت جلسة تسجيل الدخول.',
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        teacher_id: user.id,
        cover_image: form.cover_image || '',
        status: form.status || 'published',
      };

      const saved = editing
        ? await api.entities.Course.update(editing.id, payload)
        : await api.entities.Course.create(payload);

      if (!saved?.id) throw new Error('الخادم لم يُرجع الكورس بعد الحفظ.');

      toast({
        title: editing ? 'تم تحديث الكورس' : 'تم إنشاء الكورس بنجاح',
      });

      setItems((current) => {
        const next = current.filter((item) => item.id !== saved.id);
        return [saved, ...next];
      });

      await load();

      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
    } catch (err) {
      console.error('Failed to save course:', err);

      toast({
        variant: 'destructive',
        title: 'تعذر حفظ الكورس',
        description: err?.message || 'حاول مرة أخرى',
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (course) => {
    try {
      const status =
        course.status === 'published'
          ? 'draft'
          : 'published';

      await api.entities.Course.update(course.id, {
        status,
      });

      toast({
        title:
          status === 'published'
            ? 'تم نشر الكورس'
            : 'تم تحويل الكورس إلى مسودة',
      });

      await load();
    } catch (err) {
      console.error('Failed to change course status:', err);

      toast({
        variant: 'destructive',
        title: 'تعذر تغيير حالة الكورس',
        description: err?.message || 'حاول مرة أخرى',
      });
    }
  };

  const deleteCourse = async (course) => {
    if (!confirm(`حذف الكورس "${course.title}"؟`)) {
      return;
    }

    try {
      await api.entities.Course.delete(course.id);

      toast({
        title: 'تم حذف الكورس',
      });

      await load();
    } catch (err) {
      console.error('Failed to delete course:', err);

      toast({
        variant: 'destructive',
        title: 'تعذر حذف الكورس',
        description: err?.message || 'حاول مرة أخرى',
      });
    }
  };

  const openNewCourse = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEditCourse = (course) => {
    setEditing(course);

    setForm({
      title: course.title || '',
      description: course.description || '',
      target_grade: course.target_grade || '',
      cover_image: course.cover_image || '',
      status: course.status || 'published',
    });

    setOpen(true);
  };

  return (
    <div className="course-reference-page" dir="rtl">
      <PageHeader
        title="الصفوف والكورسات"
        description="اختر الصف الدراسي ثم اعرض كورسات هذا الصف وأدِر محتواه"
        actions={
          <Button
            onClick={openNewCourse}
            className="rounded-xl shadow-sm"
          >
            <Plus className="ml-2 h-4 w-4" />
            كورس جديد
          </Button>
        }
      />

      <TeacherGradeFilter value={selectedGrade} onChange={changeGrade} />

      {visibleItems.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="لا توجد كورسات"
          description="أنشئ كورسًا ثم أضف له فيديوهات واختبارات وواجبات."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((course, index) => (
            <Card
              key={course.id}
              className="course-reference-card"
            >
              <div className="course-reference-media">
                {course.cover_image ? (
                  <LocalFileImage
                    src={course.cover_image}
                    alt={course.title || "صورة الكورس"}
                    className="h-full w-full object-cover"
                    fallback={<div className="absolute inset-0 grid place-items-center"><BookOpen className="h-12 w-12 text-indigo-300" /></div>}
                  />
                ) : (
                  <>
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${[
                          'from-indigo-100 via-white to-slate-200',
                          'from-sky-100 via-white to-indigo-100',
                          'from-amber-100 via-white to-slate-100',
                        ][index % 3]
                        }`}
                    />

                    <BookOpen className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-indigo-300" />
                  </>
                )}

                <span className="course-reference-bookmark">
                  <Bookmark className="h-4 w-4" />
                </span>
              </div>

              <CardContent className="course-reference-body">
                <div className="flex items-center justify-between">
                  <span className="course-reference-chip">
                    {course.target_grade}
                  </span>

                  <span
                    className={`text-[10px] font-bold ${course.status === 'published'
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                      }`}
                  >
                    {course.status === 'published'
                      ? 'منشور'
                      : 'مسودة'}
                  </span>
                </div>

                <h3 className="course-reference-title">
                  {course.title}
                </h3>

                <p className="course-reference-text">
                  {course.description ||
                    'كورس تعليمي منظم يحتوي على حصص واختبارات وواجبات للطلاب.'}
                </p>

                <div className="course-reference-footer">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title={
                        course.status === 'published'
                          ? 'إخفاء الكورس'
                          : 'نشر الكورس'
                      }
                      className="h-9 w-9 rounded-full"
                      onClick={() => togglePublish(course)}
                    >
                      {course.status === 'published' ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      title="تعديل الكورس"
                      className="h-9 w-9 rounded-full"
                      onClick={() => openEditCourse(course)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      title="حذف الكورس"
                      className="h-9 w-9 rounded-full text-rose-600"
                      onClick={() => deleteCourse(course)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    className="course-reference-action h-auto px-3 py-2 font-bold"
                    onClick={() => navigate(`/teacher/courses/${course.id}`)}
                  >
                    إدارة الكورس
                    <ArrowUpLeft className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'تعديل الكورس' : 'كورس جديد'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              value={form.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  title: e.target.value,
                })
              }
              placeholder="اسم الكورس"
            />

            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              placeholder="وصف الكورس"
            />

            <FileUpload
              label="صورة الكورس"
              type="image"
              accept="image/*"
              value={form.cover_image || ''}
              onChange={(value) =>
                setForm({
                  ...form,
                  cover_image: value,
                })
              }
              folder="course-covers"
              hint="صورة تظهر على بطاقة الكورس عند المدرس والطلاب."
            />

            <Select
              value={form.target_grade}
              onValueChange={(value) =>
                setForm({
                  ...form,
                  target_grade: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الصف الدراسي" />
              </SelectTrigger>

              <SelectContent>
                {GRADES.map((grade) => (
                  <SelectItem
                    key={grade}
                    value={grade}
                  >
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              إلغاء
            </Button>

            <Button
              onClick={save}
              disabled={saving}
            >
              {saving ? 'جارٍ الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
