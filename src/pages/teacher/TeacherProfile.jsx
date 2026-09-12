import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/ui/PageHeader';
import { GraduationCap, Mail, BadgeCheck } from 'lucide-react';

export default function TeacherProfile() {
    const { user, checkUserAuth } = useAuth();
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (user) setName(user.full_name || ''); }, [user]);

    const save = async () => {
        setSaving(true);
        try {
            await api.auth.updateMe({ full_name: name });
            await checkUserAuth();
            toast({ title: 'تم حفظ التعديلات' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'خطأ', description: err?.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <PageHeader title="الملف الشخصي" description="بيانات حسابك كمدرّس" />
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="border-slate-200">
                    <CardContent className="flex flex-col items-center p-6 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                            {(user?.full_name || user?.email || 'م').charAt(0).toUpperCase()}
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-slate-900">{user?.full_name || 'مدرّس'}</h3>
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            <GraduationCap className="h-3.5 w-3.5" /> مدرّس
                        </span>
                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Mail className="h-4 w-4" /> {user?.email}</div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 lg:col-span-2">
                    <CardHeader><CardTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-blue-600" /> تعديل البيانات</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5"><Label>الاسم</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                        <div className="space-y-1.5"><Label>البريد الإلكتروني</Label><Input value={user?.email || ''} disabled className="bg-slate-50" /></div>
                        <Button onClick={save} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}