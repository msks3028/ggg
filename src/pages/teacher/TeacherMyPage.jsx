import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/ui/PageHeader';
import FileUpload from '@/components/ui/FileUpload';
import { Save, GripVertical } from 'lucide-react';

const SECTIONS = [
    { key: 'cover', label: 'الغلاف' },
    { key: 'profile', label: 'البيانات الشخصية' },
    { key: 'bio', label: 'النبذة' },
    { key: 'courses', label: 'الكورسات' },
    { key: 'lessons', label: 'الحصص المسجلة' },
    { key: 'files', label: 'الملفات' },
    { key: 'exams', label: 'الاختبارات' },
    { key: 'assignments', label: 'الواجبات' },
    { key: 'announcements', label: 'الإعلانات' },
];

export default function TeacherMyPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const defaultProfile = () => ({ teacher_id:user.id, slug:`teacher-${String(user.id).slice(0,10)}`.toLowerCase(), page_title:user.full_name||'المدرس', bio:'', specialization:'', profile_image:user.photoURL||'', cover_image:'', logo:'', social_links:{}, theme_color:'#263b49', accent_color:'#5b66cf', section_order:SECTIONS.map(x=>x.key) });
    const load = async () => {
        if(!user?.id) return; setLoading(true);
        try {
            const list = await api.entities.TeacherProfile.filter({ teacher_id: user.id });
            if (list[0]) setProfile(list[0]);
            else setProfile(await api.entities.TeacherProfile.create(defaultProfile()));
        } catch (err) { toast({variant:'destructive',title:'تعذر تجهيز إعدادات المدرس',description:err?.message||'حاول مرة أخرى'}); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [user?.id]);

    const update = (field, value) => setProfile({ ...profile, [field]: value });
    const updateSocial = (field, value) => setProfile({ ...profile, social_links: { ...profile.social_links, [field]: value } });

    const moveSection = (idx, dir) => {
        const order = [...(profile.section_order || [])];
        const target = idx + dir;
        if (target < 0 || target >= order.length) return;
        [order[idx], order[target]] = [order[target], order[idx]];
        update('section_order', order);
    };

    const save = async () => {
        setSaving(true);
        try {
            await api.entities.TeacherProfile.update(profile.id, {
                page_title: profile.page_title,
                bio: profile.bio,
                specialization: profile.specialization,
                profile_image: profile.profile_image,
                cover_image: profile.cover_image,
                logo: profile.logo,
                social_links: profile.social_links || {},
                theme_color: profile.theme_color,
                accent_color: profile.accent_color,
                section_order: profile.section_order || [],
            });
            toast({ title: 'تم تطبيق التغييرات على المنصة', description: 'الطلاب سيشاهدون الهوية الجديدة تلقائيًا داخل الموقع الأساسي.' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'خطأ', description: err?.data?.error || err?.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center py-24"><div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
    if (!profile) {
        return (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
                <p className="text-slate-600">تعذر تحميل إعدادات المدرس.</p>
                <Button onClick={load}>إعادة المحاولة</Button>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="تخصيص الصفحة العامة"
                description="عدّل هوية المنصة من هنا. بعد الحفظ تُطبَّق التغييرات مباشرة على الموقع الأساسي عند المدرس والطلاب."
                actions={
                    <Button onClick={save} disabled={saving} className="gap-2">
                        <Save className="h-4 w-4" /> {saving ? 'جارٍ الحفظ والتطبيق...' : 'حفظ وتطبيق التغييرات'}
                    </Button>
                }
            />

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-slate-200">
                    <CardHeader><CardTitle>المعلومات الأساسية</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>عنوان الصفحة</Label>
                            <Input value={profile.page_title || ''} onChange={(e) => update('page_title', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>التخصص</Label>
                            <Input value={profile.specialization || ''} onChange={(e) => update('specialization', e.target.value)} placeholder="مثال: الرياضيات - الصف الثالث الثانوي" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>النبذة</Label>
                            <Textarea rows={4} value={profile.bio || ''} onChange={(e) => update('bio', e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader><CardTitle>هوية المنصة والشعار</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-slate-600">المدرس يغيّر هوية المنصة من هنا. بعد الضغط على حفظ تُطبَّق التغييرات مباشرة داخل الموقع الأساسي للمدرس والطلاب، بدون صفحة معاينة منفصلة.</div>
                        <FileUpload label="شعار المنصة وأيقونة تبويب الموقع" hint="هذا الشعار يظهر بجانب اسم المنصة وداخل تبويب المتصفح عند المدرس والطلاب." type="image" accept="image/*" folder="branding" value={profile.logo || ''} onChange={(v) => update('logo', v)} />
                        <FileUpload label="صورة الغلاف" type="image" accept="image/*" folder="teacher-branding" value={profile.cover_image || ''} onChange={(v) => update('cover_image', v)} />
                        <FileUpload label="صورة الملف الشخصي" type="image" accept="image/*" folder="teacher-profile" value={profile.profile_image || ''} onChange={(v) => update('profile_image', v)} />
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader><CardTitle>الألوان</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>اللون الأساسي</Label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={profile.theme_color || '#0f172a'} onChange={(e) => update('theme_color', e.target.value)} className="h-10 w-14 rounded border border-slate-200" />
                                    <Input value={profile.theme_color || ''} onChange={(e) => update('theme_color', e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>لون التمييز</Label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={profile.accent_color || '#2563eb'} onChange={(e) => update('accent_color', e.target.value)} className="h-10 w-14 rounded border border-slate-200" />
                                    <Input value={profile.accent_color || ''} onChange={(e) => update('accent_color', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader><CardTitle>روابط التواصل</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {['facebook', 'twitter', 'instagram', 'youtube', 'website', 'whatsapp'].map((s) => (
                            <div key={s} className="space-y-1">
                                <Label className="capitalize">{s}</Label>
                                <Input value={profile.social_links?.[s] || ''} onChange={(e) => updateSocial(s, e.target.value)} placeholder={`رابط ${s}`} dir="ltr" />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 lg:col-span-2">
                    <CardHeader><CardTitle>ترتيب أقسام الصفحة</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {(profile.section_order || []).map((key, idx) => {
                                const sec = SECTIONS.find((s) => s.key === key);
                                return (
                                    <div key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                                        <GripVertical className="h-4 w-4 text-slate-300" />
                                        <span className="flex-1 text-sm font-medium text-slate-700">{sec?.label || key}</span>
                                        <Button size="sm" variant="ghost" onClick={() => moveSection(idx, -1)} disabled={idx === 0}>↑</Button>
                                        <Button size="sm" variant="ghost" onClick={() => moveSection(idx, 1)} disabled={idx === (profile.section_order || []).length - 1}>↓</Button>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}