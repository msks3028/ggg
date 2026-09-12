import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Megaphone } from 'lucide-react';

export default function StudentNotifications() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                // Gather teacher ids the student engaged with
                const [views, downloads, attempts, subs, enrolls] = await Promise.all([
                    api.entities.LessonView.filter({ student_id: user?.id }, '-created_date', 100),
                    api.entities.MaterialDownload.filter({ student_id: user?.id }, '-created_date', 100),
                    api.entities.ExamAttempt.filter({ student_id: user?.id }, '-created_date', 100),
                    api.entities.AssignmentSubmission.filter({ student_id: user?.id }, '-created_date', 100),
                    api.entities.Enrollment.filter({ student_id: user?.id }, '-created_date', 100),
                ]);
                const teacherIds = new Set();
                [...views.filter(r=>r.student_id===user?.id), ...downloads.filter(r=>r.student_id===user?.id), ...attempts.filter(r=>r.student_id===user?.id), ...subs.filter(r=>r.student_id===user?.id), ...enrolls.filter(r=>r.student_id===user?.id)].forEach((r) => r.teacher_id && teacherIds.add(r.teacher_id));
                if (teacherIds.size === 0) { setLoading(false); return; }
                const announcements = await api.entities.Announcement.list('-created_date', 100);
                setItems(announcements.filter((a) => teacherIds.has(a.teacher_id)));
            } finally { setLoading(false); }
        })();
    }, [user?.id]);

    if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin" /></div>;

    return (
        <div>
            <PageHeader title="الإشعارات" description="إعلانات من مدرّسيك" />

            {items.length === 0 ? (
                <EmptyState icon={Megaphone} title="لا توجد إشعارات" description="ستظهر هنا إعلانات المدرّسين الذين تتابع محتواهم" />
            ) : (
                <div className="space-y-3">
                    {items.map((a) => (
                        <Card key={a.id} className="border-slate-200"><CardContent className="flex items-start gap-3 p-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Megaphone className="h-5 w-5" /></div>
                            <div>
                                <p className="font-semibold text-slate-800">{a.title}</p>
                                <p className="mt-0.5 text-sm text-slate-600">{a.message}</p>
                                <p className="mt-1 text-xs text-slate-400">{new Date(a.date || a.created_date).toLocaleDateString('ar-EG')}</p>
                            </div>
                        </CardContent></Card>
                    ))}
                </div>
            )}
        </div>
    );
}