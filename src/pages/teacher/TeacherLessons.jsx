import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, getDemoRoleHeader } from '@/api/apiClient';
import { apiUrl } from '@/lib/apiBase';
import LocalFileImage from '@/components/ui/LocalFileImage';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FileUpload from '@/components/ui/FileUpload';
import { useTeacherCourses } from '@/lib/useTeacherCourses';
import { GRADES } from '@/lib/grades';
import TeacherGradeFilter, {
    matchesTeacherGrade
} from '@/components/ui/TeacherGradeFilter';
import {
    readTeacherGrade,
    saveTeacherGrade
} from '@/lib/teacherGrade';

import {
    Plus,
    BookOpen,
    Pencil,
    Trash2,
    Globe,
    Video,
    Eye,
    EyeOff,
    Loader2
} from 'lucide-react';

const EMPTY = {
    title: '',
    description: '',
    course_id: '',
    target_grade: '',
    section_id: '',
    thumbnail: '',
    video_url: '',
    status: 'draft',
    is_free: false,
    order: 0
};

/*
|--------------------------------------------------------------------------
| GLOBAL VIDEO CREATE
|--------------------------------------------------------------------------
| Uploads the video and creates the Lesson in one request.
|--------------------------------------------------------------------------
*/

function createGlobalVideo({
    file,
    title,
    description,
    target_grade,
    status,
    is_free,
    onProgress
}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        const params = new URLSearchParams({
            title,
            description,
            target_grade,
            status,
            is_free: is_free ? 'true' : 'false',
            filename: file.name || 'video.mp4'
        });

        xhr.open(
            'POST',
            apiUrl(`/api/videos?${params.toString()}`)
        );

        xhr.withCredentials = true;

        const demoRole = getDemoRoleHeader();

        if (demoRole) {
            xhr.setRequestHeader(
                'X-Lurnova-Demo-Role',
                demoRole
            );
        }

        xhr.setRequestHeader(
            'Content-Type',
            file.type || 'video/mp4'
        );

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round(
                    (event.loaded / event.total) * 100
                );

                onProgress?.(percent);
            }
        };

        xhr.onload = () => {
            let body = null;

            try {
                body = JSON.parse(
                    xhr.responseText || '{}'
                );
            } catch {
                body = null;
            }

            console.log(
                '[video-create] response',
                xhr.status,
                body
            );

            if (
                xhr.status >= 200 &&
                xhr.status < 300 &&
                body?.ok &&
                body?.item
            ) {
                resolve(body.item);
            } else {
                reject(
                    new Error(
                        body?.message ||
                        `تعذر حفظ الفيديو (كود ${xhr.status}).`
                    )
                );
            }
        };

        xhr.onerror = () => {
            reject(
                new Error(
                    'تعذر الاتصال بالخادم. تأكد إن السيرفر (backend) شغال.'
                )
            );
        };

        xhr.onabort = () => {
            reject(
                new Error('تم إلغاء الرفع.')
            );
        };

        xhr.send(file);
    });
}

export default function TeacherLessons() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { courses } = useTeacherCourses();

    const [searchParams] = useSearchParams();

    const courseIdFromUrl =
        searchParams.get('courseId') || '';

    const editIdFromUrl =
        searchParams.get('editId') || '';

    const [lessons, setLessons] = useState([]);

    const [loading, setLoading] =
        useState(true);

    const [open, setOpen] =
        useState(false);

    const [editing, setEditing] =
        useState(null);

    const [form, setForm] =
        useState(EMPTY);

    const [videoFile, setVideoFile] =
        useState(null);

    const [saving, setSaving] =
        useState(false);

    const [uploadPercent, setUploadPercent] =
        useState(0);

    const [saveError, setSaveError] =
        useState('');

    const [loadError, setLoadError] =
        useState('');

    const [toDelete, setToDelete] =
        useState(null);

    const [selectedGrade, setSelectedGrade] =
        useState(readTeacherGrade);

    const visibleLessons =
        lessons.filter((lesson) =>
            matchesTeacherGrade(
                lesson,
                selectedGrade,
                courses
            )
        );

    const changeGrade = (grade) => {
        setSelectedGrade(grade);
        saveTeacherGrade(grade);
    };

    const errorRef =
        useRef(null);

    const isGlobalMode =
        !courseIdFromUrl;

    /*
    |--------------------------------------------------------------------------
    | LOAD LESSONS
    |--------------------------------------------------------------------------
    */

    const load = async () => {
        if (!user?.id) {
            return;
        }

        setLoading(true);
        setLoadError('');

        try {
            let data;

            /*
            |--------------------------------------------------------------------------
            | COURSE LESSONS
            |--------------------------------------------------------------------------
            */

            if (courseIdFromUrl) {
                data =
                    await api.entities.Lesson.filter(
                        {
                            course_id:
                                courseIdFromUrl
                        },
                        '-created_date',
                        200
                    );
            }

            /*
            |--------------------------------------------------------------------------
            | GLOBAL VIDEO LIBRARY
            |--------------------------------------------------------------------------
            */

            else {
                const demoRole =
                    getDemoRoleHeader();

                const res =
                    await fetch(
                        apiUrl('/api/videos'),
                        {
                            credentials:
                                'include',

                            cache:
                                'no-store',

                            headers:
                                demoRole
                                    ? {
                                        'X-Lurnova-Demo-Role':
                                            demoRole
                                    }
                                    : {}
                        }
                    );

                const body =
                    await res
                        .json()
                        .catch(() => null);

                console.log(
                    '[videos-list] response',
                    res.status,
                    body
                );

                if (
                    !res.ok ||
                    !body?.ok
                ) {
                    throw new Error(
                        body?.message ||
                        `تعذر تحميل الفيديوهات (كود ${res.status}).`
                    );
                }

                data =
                    body.items || [];
            }

            /*
            |--------------------------------------------------------------------------
            | The server already returns only this teacher's own lessons
            | (for course lessons: filtered by course ownership; for the
            | global video library: filtered by teacher_id server-side).
            | Do NOT re-filter by user.id on the client: in demo mode the
            | client-side "user" object uses a fixed placeholder id that
            | never matches the real database teacher_id, which used to
            | wipe out every real lesson from this list.
            |--------------------------------------------------------------------------
            */

            setLessons(
                Array.isArray(data) ? data : []
            );
        } catch (err) {
            console.error(
                'Lesson list failed:',
                err
            );

            setLoadError(
                err?.message ||
                'تعذر تحميل الحصص من الخادم.'
            );

            setLessons([]);
        } finally {
            setLoading(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | INITIAL LOAD
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (user?.id) {
            load();
        }
    }, [
        user?.id,
        courseIdFromUrl
    ]);

    /*
    |--------------------------------------------------------------------------
    | CREATE
    |--------------------------------------------------------------------------
    */

    const openCreate = () => {
        setEditing(null);

        setForm({
            ...EMPTY,
            course_id:
                courseIdFromUrl
        });

        setVideoFile(null);
        setSaveError('');
        setUploadPercent(0);

        setOpen(true);
    };

    /*
    |--------------------------------------------------------------------------
    | EDIT
    |--------------------------------------------------------------------------
    */

    const openEdit = (lesson) => {
        setEditing(lesson);

        setForm({
            ...EMPTY,
            ...lesson,
            order:
                lesson.order ??
                lesson.sort_order ??
                0
        });

        setVideoFile(null);
        setSaveError('');
        setUploadPercent(0);

        setOpen(true);
    };

    /*
    |--------------------------------------------------------------------------
    | OPEN EDIT FROM URL
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!courseIdFromUrl) {
            return;
        }

        if (editIdFromUrl) {
            const item =
                lessons.find(
                    (x) =>
                        String(x.id) ===
                        String(editIdFromUrl)
                );

            if (item) {
                openEdit(item);
            }

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Only open new lesson when there is no edit id.
        |--------------------------------------------------------------------------
        */

        setEditing(null);

        setForm({
            ...EMPTY,
            course_id:
                courseIdFromUrl
        });

        setOpen(true);
    }, [
        courseIdFromUrl,
        editIdFromUrl
    ]);

    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    const showError = (message) => {
        setSaveError(message);

        requestAnimationFrame(() => {
            errorRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    };

    /*
    |--------------------------------------------------------------------------
    | SAVE
    |--------------------------------------------------------------------------
    */

    const save = async () => {
        if (!form.title.trim()) {
            showError(
                'أدخل عنوان الحصة أولاً.'
            );

            return;
        }

        if (!user?.id) {
            showError(
                'انتهت جلسة تسجيل الدخول. سجّل الخروج ثم ادخل مرة أخرى.'
            );

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | COURSE VIDEO
        |--------------------------------------------------------------------------
        */

        if (courseIdFromUrl) {
            if (
                !String(
                    form.video_url || ''
                ).trim()
            ) {
                showError(
                    'ارفع ملف الفيديو أولًا وانتظر ظهور "تم رفع الملف والتحقق منه بنجاح".'
                );

                return;
            }

            setSaving(true);
            setSaveError('');

            try {
                const payload = {
                    ...form,

                    title:
                        form.title.trim(),

                    teacher_id:
                        user.id,

                    course_id:
                        courseIdFromUrl,

                    section_id:
                        form.section_id || '',

                    sort_order:
                        Number(
                            form.sort_order ??
                            form.order ??
                            0
                        ) || 0
                };

                delete payload.order;

                let saved;

                /*
                |--------------------------------------------------------------------------
                | UPDATE COURSE LESSON
                |--------------------------------------------------------------------------
                */

                if (editing?.id) {
                    saved =
                        await api.entities.Lesson.update(
                            editing.id,
                            payload
                        );

                    /*
                    |--------------------------------------------------------------------------
                    | IMPORTANT:
                    | Update local list immediately.
                    |--------------------------------------------------------------------------
                    */

                    setLessons(
                        (previous) =>
                            previous.map(
                                (item) =>
                                    String(
                                        item.id
                                    ) ===
                                    String(
                                        saved?.id ||
                                        editing.id
                                    )
                                        ? {
                                            ...item,
                                            ...saved,
                                            ...payload
                                        }
                                        : item
                            )
                    );

                    toast({
                        title:
                            'تم تحديث الحصة بنجاح'
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | CREATE COURSE LESSON
                |--------------------------------------------------------------------------
                */

                else {
                    saved =
                        await api.entities.Lesson.create(
                            payload
                        );

                    /*
                    |--------------------------------------------------------------------------
                    | IMPORTANT:
                    | Add newly created lesson immediately.
                    |--------------------------------------------------------------------------
                    */

                    if (saved?.id) {
                        setLessons(
                            (previous) => [
                                saved,
                                ...previous.filter(
                                    (item) =>
                                        String(
                                            item.id
                                        ) !==
                                        String(
                                            saved.id
                                        )
                                )
                            ]
                        );
                    }

                    toast({
                        title:
                            'تم إضافة الفيديو بنجاح'
                    });
                }

                setOpen(false);

                navigate(
                    `/teacher/courses/${courseIdFromUrl}`
                );
            } catch (err) {
                console.error(
                    'Lesson save failed:',
                    err
                );

                showError(
                    err?.data?.error ||
                    err?.message ||
                    'تعذر حفظ الحصة. حاول مرة أخرى.'
                );
            } finally {
                setSaving(false);
            }

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | GLOBAL VIDEO EDIT
        |--------------------------------------------------------------------------
        */

        if (editing?.id) {
            setSaving(true);
            setSaveError('');

            try {
                const demoRole =
                    getDemoRoleHeader();

                const res =
                    await fetch(
                        apiUrl(
                            `/api/videos/${encodeURIComponent(
                                editing.id
                            )}`
                        ),
                        {
                            method:
                                'PATCH',

                            credentials:
                                'include',

                            headers: {
                                'Content-Type':
                                    'application/json',

                                ...(demoRole
                                    ? {
                                        'X-Lurnova-Demo-Role':
                                            demoRole
                                    }
                                    : {})
                            },

                            body:
                                JSON.stringify({
                                    title:
                                        form.title.trim(),

                                    description:
                                        form.description,

                                    thumbnail:
                                        form.thumbnail,

                                    target_grade:
                                        form.target_grade,

                                    status:
                                        form.status,

                                    is_free:
                                        !!form.is_free
                                })
                        }
                    );

                const body =
                    await res
                        .json()
                        .catch(() => null);

                console.log(
                    '[video-update] response',
                    res.status,
                    body
                );

                if (
                    !res.ok ||
                    !body?.ok
                ) {
                    throw new Error(
                        body?.message ||
                        `تعذر حفظ التعديل (كود ${res.status}).`
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | USE API RESPONSE IF AVAILABLE
                |--------------------------------------------------------------------------
                */

                const updated =
                    body.item || {
                        ...editing,
                        title:
                            form.title.trim(),
                        description:
                            form.description,
                        thumbnail:
                            form.thumbnail,
                        target_grade:
                            form.target_grade,
                        status:
                            form.status,
                        is_free:
                            !!form.is_free
                    };

                /*
                |--------------------------------------------------------------------------
                | IMPORTANT:
                | Update the visible list immediately.
                |--------------------------------------------------------------------------
                */

                setLessons(
                    (previous) =>
                        previous.map(
                            (item) =>
                                String(
                                    item.id
                                ) ===
                                String(
                                    editing.id
                                )
                                    ? {
                                        ...item,
                                        ...updated
                                    }
                                    : item
                        )
                );

                toast({
                    title:
                        'تم تحديث الفيديو بنجاح'
                });

                setOpen(false);
            } catch (err) {
                console.error(
                    'Video update failed:',
                    err
                );

                showError(
                    err?.message ||
                    'تعذر حفظ التعديل. حاول مرة أخرى.'
                );
            } finally {
                setSaving(false);
            }

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | GLOBAL VIDEO CREATE
        |--------------------------------------------------------------------------
        */

        if (!videoFile) {
            showError(
                'اختر ملف الفيديو أولًا.'
            );

            return;
        }

        setSaving(true);
        setSaveError('');
        setUploadPercent(0);

        try {
            /*
            |--------------------------------------------------------------------------
            | CREATE VIDEO
            |--------------------------------------------------------------------------
            */

            const item =
                await createGlobalVideo({
                    file:
                        videoFile,

                    title:
                        form.title.trim(),

                    description:
                        form.description || '',

                    target_grade:
                        form.target_grade || '',

                    status:
                        form.status || 'draft',

                    is_free:
                        !!form.is_free,

                    onProgress:
                        setUploadPercent
                });

            if (!item?.id) {
                throw new Error(
                    'تم رفع الفيديو لكن الخادم لم يُرجع رقم الفيديو.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | ATTACH THUMBNAIL
            |--------------------------------------------------------------------------
            */

            let createdLesson = {
                ...item
            };

            if (form.thumbnail) {
                try {
                    const demoRole =
                        getDemoRoleHeader();

                    const thumbnailRes =
                        await fetch(
                            apiUrl(
                                `/api/videos/${encodeURIComponent(
                                    item.id
                                )}`
                            ),
                            {
                                method:
                                    'PATCH',

                                credentials:
                                    'include',

                                headers: {
                                    'Content-Type':
                                        'application/json',

                                    ...(demoRole
                                        ? {
                                            'X-Lurnova-Demo-Role':
                                                demoRole
                                        }
                                        : {})
                                },

                                body:
                                    JSON.stringify({
                                        thumbnail:
                                            form.thumbnail
                                    })
                            }
                        );

                    const thumbnailBody =
                        await thumbnailRes
                            .json()
                            .catch(
                                () => null
                            );

                    /*
                    |--------------------------------------------------------------------------
                    | Keep the thumbnail in local state
                    |--------------------------------------------------------------------------
                    */

                    if (
                        thumbnailRes.ok &&
                        thumbnailBody?.ok
                    ) {
                        createdLesson = {
                            ...createdLesson,
                            ...(thumbnailBody.item ||
                                {}),
                            thumbnail:
                                thumbnailBody
                                    ?.item
                                    ?.thumbnail ||
                                form.thumbnail
                        };
                    } else {
                        createdLesson = {
                            ...createdLesson,
                            thumbnail:
                                form.thumbnail
                        };
                    }
                } catch (error) {
                    console.warn(
                        '[video-thumbnail] attach failed',
                        error
                    );

                    /*
                    |--------------------------------------------------------------------------
                    | Even if thumbnail fails, video itself remains visible.
                    |--------------------------------------------------------------------------
                    */

                    createdLesson = {
                        ...createdLesson,
                        thumbnail:
                            form.thumbnail
                    };
                }
            }

            /*
            |--------------------------------------------------------------------------
            | THE IMPORTANT FIX
            |--------------------------------------------------------------------------
            |
            | Do NOT wait for load().
            |
            | The API already returned the newly created Lesson.
            | Put it directly into the React state.
            |
            */

            setLessons(
                (previous) => [
                    createdLesson,
                    ...previous.filter(
                        (lesson) =>
                            String(
                                lesson.id
                            ) !==
                            String(
                                createdLesson.id
                            )
                    )
                ]
            );

            /*
            |--------------------------------------------------------------------------
            | Show ALL grades after successful creation.
            |--------------------------------------------------------------------------
            */

            changeGrade('all');

            toast({
                title:
                    'تم إضافة الفيديو بنجاح',
                description:
                    'الفيديو ظهر الآن في قائمة الفيديوهات ويمكنك تعديله.'
            });

            /*
            |--------------------------------------------------------------------------
            | Close dialog AFTER state update
            |--------------------------------------------------------------------------
            */

            setOpen(false);

            /*
            |--------------------------------------------------------------------------
            | Reset temporary upload state
            |--------------------------------------------------------------------------
            */

            setVideoFile(null);
            setUploadPercent(0);
        } catch (err) {
            console.error(
                'Video create failed:',
                err
            );

            showError(
                err?.message ||
                'تعذر حفظ الفيديو. حاول مرة أخرى.'
            );
        } finally {
            setSaving(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | PUBLISH / UNPUBLISH
    |--------------------------------------------------------------------------
    */

    const togglePublish = async (lesson) => {
        const next =
            lesson.status === 'published'
                ? 'draft'
                : 'published';

        try {
            /*
            |--------------------------------------------------------------------------
            | COURSE VIDEO
            |--------------------------------------------------------------------------
            */

            if (courseIdFromUrl) {
                const updated =
                    await api.entities.Lesson.update(
                        lesson.id,
                        {
                            status: next
                        }
                    );

                setLessons(
                    (previous) =>
                        previous.map(
                            (item) =>
                                String(
                                    item.id
                                ) ===
                                String(
                                    lesson.id
                                )
                                    ? {
                                        ...item,
                                        ...(updated ||
                                            {}),
                                        status:
                                            next
                                    }
                                    : item
                        )
                );
            }

            /*
            |--------------------------------------------------------------------------
            | GLOBAL VIDEO
            |--------------------------------------------------------------------------
            */

            else {
                const demoRole =
                    getDemoRoleHeader();

                const res =
                    await fetch(
                        apiUrl(
                            `/api/videos/${encodeURIComponent(
                                lesson.id
                            )}`
                        ),
                        {
                            method:
                                'PATCH',

                            credentials:
                                'include',

                            headers: {
                                'Content-Type':
                                    'application/json',

                                ...(demoRole
                                    ? {
                                        'X-Lurnova-Demo-Role':
                                            demoRole
                                    }
                                    : {})
                            },

                            body:
                                JSON.stringify({
                                    status:
                                        next
                                })
                        }
                    );

                const body =
                    await res
                        .json()
                        .catch(() => null);

                if (
                    !res.ok ||
                    !body?.ok
                ) {
                    throw new Error(
                        body?.message ||
                        'تعذر تغيير حالة النشر.'
                    );
                }

                setLessons(
                    (previous) =>
                        previous.map(
                            (item) =>
                                String(
                                    item.id
                                ) ===
                                String(
                                    lesson.id
                                )
                                    ? {
                                        ...item,
                                        ...(body.item ||
                                            {}),
                                        status:
                                            next
                                    }
                                    : item
                        )
                );
            }

            toast({
                title:
                    next === 'published'
                        ? 'تم النشر'
                        : 'تم إلغاء النشر'
            });

            if (courseIdFromUrl) {
                navigate(
                    `/teacher/courses/${courseIdFromUrl}`
                );
            }
        } catch (err) {
            console.error(
                'Toggle publish failed:',
                err
            );

            toast({
                variant:
                    'destructive',

                title:
                    'تعذر تغيير حالة النشر',

                description:
                    err?.message
            });
        }
    };

    /*
    |--------------------------------------------------------------------------
    | DELETE
    |--------------------------------------------------------------------------
    */

    const remove = async () => {
        if (!toDelete?.id) {
            return;
        }

        try {
            /*
            |--------------------------------------------------------------------------
            | COURSE VIDEO
            |--------------------------------------------------------------------------
            */

            if (courseIdFromUrl) {
                await api.entities.Lesson.delete(
                    toDelete.id
                );
            }

            /*
            |--------------------------------------------------------------------------
            | GLOBAL VIDEO
            |--------------------------------------------------------------------------
            */

            else {
                const demoRole =
                    getDemoRoleHeader();

                const res =
                    await fetch(
                        apiUrl(
                            `/api/videos/${encodeURIComponent(
                                toDelete.id
                            )}`
                        ),
                        {
                            method:
                                'DELETE',

                            credentials:
                                'include',

                            headers:
                                demoRole
                                    ? {
                                        'X-Lurnova-Demo-Role':
                                            demoRole
                                    }
                                    : {}
                        }
                    );

                const body =
                    await res
                        .json()
                        .catch(() => null);

                if (
                    !res.ok ||
                    !body?.ok
                ) {
                    throw new Error(
                        body?.message ||
                        'تعذر حذف الحصة.'
                    );
                }
            }

            /*
            |--------------------------------------------------------------------------
            | Remove immediately from UI
            |--------------------------------------------------------------------------
            */

            setLessons(
                (previous) =>
                    previous.filter(
                        (item) =>
                            String(
                                item.id
                            ) !==
                            String(
                                toDelete.id
                            )
                    )
            );

            setToDelete(null);

            toast({
                title:
                    'تم حذف الحصة'
            });
        } catch (err) {
            console.error(
                'Delete failed:',
                err
            );

            toast({
                variant:
                    'destructive',

                title:
                    'تعذر حذف الحصة',

                description:
                    err?.message
            });
        }
    };

    /*
    |--------------------------------------------------------------------------
    | COURSE NAME
    |--------------------------------------------------------------------------
    */

    const courseName = (id) => {
        return (
            courses.find(
                (course) =>
                    String(course.id) ===
                    String(id)
            )?.title ||
            'بدون كورس'
        );
    };

    /*
    |--------------------------------------------------------------------------
    | UI
    |--------------------------------------------------------------------------
    */

    return (
        <div>
            <PageHeader
                title={
                    courseIdFromUrl
                        ? `محتوى الكورس: ${
                            courses.find(
                                (course) =>
                                    String(
                                        course.id
                                    ) ===
                                    String(
                                        courseIdFromUrl
                                    )
                            )?.title ||
                            'الكورس'
                        }`
                        : 'الحصص المسجلة'
                }

                description={
                    courseIdFromUrl
                        ? 'أضف الفيديوهات والحصص لهذا الكورس فقط. المحتوى لن يظهر في الأقسام العامة.'
                        : 'إنشاء وإدارة الحصص والفيديوهات المسجلة'
                }

                actions={
                    <Button
                        onClick={
                            openCreate
                        }
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        حصة جديدة
                    </Button>
                }
            />

            {loadError && (
                <div
                    role="alert"
                    className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                    {loadError}

                    <button
                        type="button"
                        onClick={load}
                        className="mr-3 font-bold underline"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            )}

            {courseIdFromUrl ? (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm">
                    <div>
                        <b className="text-indigo-900">
                            وضع إضافة داخل الكورس
                        </b>

                        <p className="mt-1 text-indigo-700">
                            كل محتوى تنشئه هنا سيتم ربطه بهذا الكورس تلقائيًا.
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            window.history.back()
                        }
                    >
                        العودة للكورس
                    </Button>
                </div>
            ) : (
                <TeacherGradeFilter
                    value={selectedGrade}
                    onChange={changeGrade}
                />
            )}

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
            ) : visibleLessons.length === 0 ? (
                <EmptyState
                    icon={BookOpen}
                    title="لا توجد حصص بعد"
                    description="ابدأ بإضافة أول حصة مسجلة"
                    action={
                        <Button
                            onClick={
                                openCreate
                            }
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            حصة جديدة
                        </Button>
                    }
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleLessons.map(
                        (lesson) => (
                            <Card
                                key={
                                    lesson.id
                                }
                                className="course-reference-card"
                            >
                                <div className="course-reference-media">
                                    {lesson.thumbnail ? (
                                        <LocalFileImage
                                            src={
                                                lesson.thumbnail
                                            }
                                            alt={
                                                lesson.title
                                            }
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-slate-300">
                                            <Video className="h-10 w-10" />
                                        </div>
                                    )}

                                    <span
                                        className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                                            lesson.status ===
                                            'published'
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-slate-700 text-white'
                                        }`}
                                    >
                                        {lesson.status ===
                                        'published'
                                            ? 'منشور'
                                            : 'مسودة'}
                                    </span>

                                    {lesson.is_free && (
                                        <span className="absolute top-2 left-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">
                                            مجاني
                                        </span>
                                    )}
                                </div>

                                <CardContent className="course-reference-body">
                                    <span className="course-reference-chip">
                                        {courseName(
                                            lesson.course_id
                                        )}
                                    </span>

                                    <p className="course-reference-title line-clamp-1">
                                        {lesson.title}
                                    </p>

                                    <p className="course-reference-text">
                                        {lesson.description ||
                                            'فيديو تعليمي مخصص لطلاب الصف المحدد.'}
                                    </p>

                                    <div className="course-reference-footer">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 gap-1"
                                            onClick={() =>
                                                togglePublish(
                                                    lesson
                                                )
                                            }
                                        >
                                            {lesson.status ===
                                            'published' ? (
                                                <>
                                                    <EyeOff className="h-3.5 w-3.5" />
                                                    إلغاء
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="h-3.5 w-3.5" />
                                                    نشر
                                                </>
                                            )}
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8"
                                            onClick={() =>
                                                openEdit(
                                                    lesson
                                                )
                                            }
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 text-rose-600"
                                            onClick={() =>
                                                setToDelete(
                                                    lesson
                                                )
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    )}
                </div>
            )}

            {/* ============================================================
                CREATE / EDIT DIALOG
            ============================================================ */}

            <Dialog
                open={open}
                onOpenChange={(value) =>
                    !value &&
                    !saving &&
                    setOpen(false)
                }
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editing
                                ? 'تعديل الحصة'
                                : 'حصة جديدة'}
                        </DialogTitle>
                    </DialogHeader>

                    {saveError && (
                        <div
                            ref={errorRef}
                            role="alert"
                            className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700"
                        >
                            {saveError}
                        </div>
                    )}

                    <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-1.5">
                            <Label>
                                عنوان الحصة
                            </Label>

                            <Input
                                value={
                                    form.title
                                }
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        title:
                                            event
                                                .target
                                                .value
                                    })
                                }
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>
                                الوصف
                            </Label>

                            <Textarea
                                rows={2}
                                value={
                                    form.description
                                }
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        description:
                                            event
                                                .target
                                                .value
                                    })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>
                                    الكورس
                                </Label>

                                {courseIdFromUrl ? (
                                    <div className="flex min-h-10 items-center rounded-md border border-indigo-100 bg-indigo-50 px-3 text-sm font-bold text-indigo-700">
                                        {
                                            courses.find(
                                                (course) =>
                                                    String(
                                                        course.id
                                                    ) ===
                                                    String(
                                                        courseIdFromUrl
                                                    )
                                            )?.title ||
                                            'الكورس الحالي'
                                        }
                                    </div>
                                ) : (
                                    <div className="flex min-h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                                        بدون كورس (فيديو عام)
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label>
                                    الصف الدراسي
                                </Label>

                                <Select
                                    value={
                                        form.target_grade ||
                                        'all'
                                    }
                                    onValueChange={(
                                        value
                                    ) =>
                                        setForm({
                                            ...form,
                                            target_grade:
                                                value ===
                                                'all'
                                                    ? ''
                                                    : value
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="كل الصفوف" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="all">
                                            كل الصفوف
                                        </SelectItem>

                                        {GRADES.map(
                                            (grade) => (
                                                <SelectItem
                                                    key={
                                                        grade
                                                    }
                                                    value={
                                                        grade
                                                    }
                                                >
                                                    {
                                                        grade
                                                    }
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>
                                    الترتيب
                                </Label>

                                <Input
                                    type="number"
                                    value={
                                        form.order ??
                                        form.sort_order ??
                                        0
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setForm({
                                            ...form,
                                            order:
                                                Number(
                                                    event
                                                        .target
                                                        .value
                                                )
                                        })
                                    }
                                />
                            </div>
                        </div>

                        {/* ==================================================
                            GLOBAL VIDEO UPLOAD
                        ================================================== */}

                        {isGlobalMode &&
                        !editing ? (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-700">
                                    ملف الفيديو
                                </p>

                                {!videoFile ? (
                                    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-5 text-center hover:border-blue-300 hover:bg-blue-50/40">
                                        <Video className="h-7 w-7 text-slate-400" />

                                        <span className="text-sm font-medium text-slate-600">
                                            اختر ملف الفيديو (MP4, WebM...)
                                        </span>

                                        <input
                                            type="file"
                                            accept="video/*"
                                            className="hidden"
                                            onChange={(
                                                event
                                            ) =>
                                                setVideoFile(
                                                    event
                                                        .target
                                                        .files?.[0] ||
                                                    null
                                                )
                                            }
                                        />
                                    </label>
                                ) : (
                                    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <span
                                            className="truncate text-sm text-slate-600"
                                            dir="ltr"
                                        >
                                            {
                                                videoFile.name
                                            }
                                        </span>

                                        {!saving && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setVideoFile(
                                                        null
                                                    )
                                                }
                                                className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-white"
                                            >
                                                إزالة
                                            </button>
                                        )}
                                    </div>
                                )}

                                {saving && (
                                    <div className="space-y-1">
                                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                                            <div
                                                className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
                                                style={{
                                                    width: `${uploadPercent}%`
                                                }}
                                            />
                                        </div>

                                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            جارٍ رفع وحفظ الفيديو...
                                            {' '}
                                            {uploadPercent}%
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <FileUpload
                                label="رابط الفيديو"
                                folder="teacher-videos"
                                accept="video/*"
                                value={
                                    form.video_url ||
                                    ''
                                }
                                onChange={(value) =>
                                    setForm({
                                        ...form,
                                        video_url:
                                            value
                                    })
                                }
                                hint="MP4, WebM..."
                            />
                        )}

                        {/* ==================================================
                            THUMBNAIL
                        ================================================== */}

                        <FileUpload
                            label="صورة مصغّرة"
                            folder="teacher-thumbnails"
                            type="image"
                            accept="image/*"
                            value={
                                form.thumbnail ||
                                ''
                            }
                            onChange={(value) =>
                                setForm({
                                    ...form,
                                    thumbnail:
                                        value
                                })
                            }
                        />

                        {/* ==================================================
                            STATUS
                        ================================================== */}

                        <div className="space-y-1.5">
                            <Label>
                                حالة النشر
                            </Label>

                            <Select
                                value={
                                    form.status ||
                                    'draft'
                                }
                                onValueChange={(
                                    value
                                ) =>
                                    setForm({
                                        ...form,
                                        status:
                                            value
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="draft">
                                        مسودة - غير منشور
                                    </SelectItem>

                                    <SelectItem value="published">
                                        منشور للطلاب
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* ==================================================
                            FREE
                        ================================================== */}

                        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-blue-500" />

                                <span className="text-sm">
                                    محتوى مجاني (متاح للجميع)
                                </span>
                            </div>

                            <Switch
                                checked={
                                    !!form.is_free
                                }
                                onCheckedChange={(
                                    value
                                ) =>
                                    setForm({
                                        ...form,
                                        is_free:
                                            value
                                    })
                                }
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() =>
                                setOpen(false)
                            }
                            disabled={saving}
                        >
                            إلغاء
                        </Button>

                        <Button
                            onClick={save}
                            disabled={saving}
                        >
                            {saving
                                ? 'جارٍ الحفظ...'
                                : 'حفظ'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============================================================
                DELETE CONFIRM
            ============================================================ */}

            <ConfirmDialog
                open={!!toDelete}
                onClose={() =>
                    setToDelete(null)
                }
                onConfirm={remove}
                title="حذف الحصة"
                message={`حذف "${toDelete?.title}"؟`}
                destructive
                confirmText="حذف"
            />
        </div>
    );
}