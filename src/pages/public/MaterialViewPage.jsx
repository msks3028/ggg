import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { gradeMatches } from '@/lib/grades';
import EmptyState from '@/components/ui/EmptyState';
import ContentPreview from '@/components/ui/ContentPreview';
import { ArrowRight, Download, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isLocalFileUrl, openLocalFile } from '@/lib/localFiles';

export default function MaterialViewPage(){
  const { materialId } = useParams(); const { user }=useAuth(); const [searchParams]=useSearchParams();
  const requestedReturn=searchParams.get('returnTo')||'';
  const backTo=(requestedReturn.startsWith('/student')||requestedReturn.startsWith('/teacher/'))?requestedReturn:'/student/files';
  const [material,setMaterial]=useState(null); const [course,setCourse]=useState(null); const [loading,setLoading]=useState(true); const [denied,setDenied]=useState(false);
  useEffect(()=>{let alive=true;(async()=>{try{
    const [items,courses,users]=await Promise.all([api.entities.Material.filter({id:materialId}),api.entities.Course.list('-created_date',500),api.entities.User.filter({id:user?.id})]);
    const m=items[0]; if(!m){setDenied(true);return;}
    const c=courses.find(x=>x.id===m.course_id); const effectiveGrade=c?.target_grade||m.target_grade||''; const isOwner=m.teacher_id===user?.id;
    if((m.status!=='published' && !isOwner) || (!isOwner && !gradeMatches(effectiveGrade,users[0]?.grade||user?.grade))){setDenied(true);return;}
    if(alive){setMaterial(m);setCourse(c||null);}
  }catch{if(alive)setDenied(true)}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[materialId,user?.id]);
  const download=async()=>{if(!material?.file_url)return;await api.functions.invoke('trackMaterialDownload',{file_id:material.id,teacher_id:material.teacher_id,course_id:material.course_id||''}).catch(()=>{});if(isLocalFileUrl(material.file_url)) await openLocalFile(material.file_url,{download:true});else{const a=document.createElement('a');a.href=material.file_url;a.download='';a.target='_self';document.body.appendChild(a);a.click();a.remove();}};
  if(loading)return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"/></div>;
  if(denied)return <div className="py-24"><EmptyState icon={Lock} title="لا يمكنك الوصول إلى هذا الملف" /></div>;
  return <div dir="rtl" className="min-h-screen bg-slate-100 py-6"><div className="mx-auto max-w-7xl px-4">
    <Link to={backTo} className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-indigo-600"><ArrowRight className="h-4 w-4"/> العودة للمحتوى</Link>
    <div className="mb-5 rounded-3xl bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="mb-2 flex flex-wrap gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{course?.title||'محتوى عام'}</span><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">ملف دراسي</span></div><h1 className="text-2xl font-black text-slate-900">{material.name||material.title}</h1>{material.description&&<p className="mt-2 text-sm leading-7 text-slate-500">{material.description}</p>}</div><Button variant="outline" onClick={download} className="gap-2"><Download className="h-4 w-4"/>تحميل نسخة</Button></div></div>
    <ContentPreview item={material} title={material.name||material.title||'الملف'} />
  </div></div>;
}
