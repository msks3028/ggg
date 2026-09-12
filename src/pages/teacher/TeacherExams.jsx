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
import { Plus, ClipboardCheck, Pencil, Trash2, ListChecks, Eye, EyeOff, X, Users, CheckCircle2, FileText, Upload } from 'lucide-react';

const EMPTY = { title:'', description:'', course_id:'', target_grade:'', duration:30, passing_score:50, status:'draft', exam_mode:'manual', pdf_url:'', pdf_name:'', questions:[] };

export default function TeacherExams() {
  const { user } = useAuth(); const { toast } = useToast(); const navigate = useNavigate(); const { courses } = useTeacherCourses();
  const [searchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get('courseId') || '';
  const editIdFromUrl = searchParams.get('editId') || '';
  const [exams,setExams]=useState([]), [attempts,setAttempts]=useState([]), [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true), [open,setOpen]=useState(false), [editing,setEditing]=useState(null), [form,setForm]=useState(EMPTY), [saving,setSaving]=useState(false), [toDelete,setToDelete]=useState(null);
  const [questionsOpen,setQuestionsOpen]=useState(null), [questions,setQuestions]=useState([]), [attemptsOpen,setAttemptsOpen]=useState(null);
  const [selectedGrade, setSelectedGrade] = useState(readTeacherGrade);
  const visibleExams = exams.filter((exam) => matchesTeacherGrade(exam, selectedGrade, courses));
  const changeGrade = (grade) => { setSelectedGrade(grade); saveTeacherGrade(grade); };

  const load=async()=>{ setLoading(true); try {
    const [e,a,u]=await Promise.all([courseIdFromUrl?api.entities.Exam.filter({course_id:courseIdFromUrl},'-created_date',200):api.entities.Exam.list('-created_date',200),api.entities.ExamAttempt.list('-created_date',1000),api.entities.User.list('-created_date',1000)]);
    setExams((Array.isArray(e) ? e : []));
    setAttempts(Array.isArray(a) ? a : []);
    setUsers(Array.isArray(u) ? u : []);
  } catch (err) {
    console.error('Failed to load exams:', err);
    toast({variant:'destructive',title:'تعذر تحميل الاختبارات',description:err?.message||'حاول مرة أخرى'});
  } finally { setLoading(false); }};
  useEffect(()=>{load();},[user?.id]);

  const save=async()=>{ if(!form.title){toast({variant:'destructive',title:'أدخل عنوان الاختبار'});return;} if(form.exam_mode==='pdf'&&!form.pdf_url){toast({variant:'destructive',title:'ارفع ملف الاختبار PDF أولًا'});return;} setSaving(true); try {
    const payload={...form,teacher_id:user.id,course_id:courseIdFromUrl||form.course_id||'',duration:Number(form.duration)||30,passing_score:Number(form.passing_score)||50,status:form.status||'draft',exam_mode:form.exam_mode||'manual',pdf_url:form.pdf_url||'',pdf_name:form.pdf_name||'',questions:Array.isArray(form.questions)?form.questions:[]};
    const saved = editing ? await api.entities.Exam.update(editing.id,payload) : await api.entities.Exam.create(payload);
    if (!saved?.id) throw new Error('الخادم لم يُرجع الاختبار بعد الحفظ.');
    toast({title:editing?'تم تحديث الاختبار':'تم إنشاء الاختبار'});
    setExams(current => [saved, ...current.filter(x => x.id !== saved.id)]);
    setOpen(false);
    if (!editing && saved.exam_mode !== 'pdf' && !courseIdFromUrl) { setQuestions([]); setQuestionsOpen(saved); }
    if (courseIdFromUrl) navigate(`/teacher/courses/${courseIdFromUrl}`);
    else await load();
  } catch(err){toast({variant:'destructive',title:'خطأ',description:err?.message});} finally{setSaving(false);} };
  const togglePublish=async e=>{await api.entities.Exam.update(e.id,{status:e.status==='published'?'draft':'published'});if(courseIdFromUrl) navigate(`/teacher/courses/${courseIdFromUrl}`);else load();};
  const remove=async()=>{await api.entities.Exam.delete(toDelete.id);setToDelete(null);load();};
  useEffect(()=>{ if(!courseIdFromUrl) return; if(editIdFromUrl){ const item=exams.find(x=>String(x.id)===String(editIdFromUrl)); if(item){ setEditing(item); setForm({...item}); setOpen(true); return; } } setEditing(null); setForm({...EMPTY,course_id:courseIdFromUrl}); setOpen(true); },[courseIdFromUrl,editIdFromUrl,exams]);

  const openQuestions=async exam=>{setQuestionsOpen(exam); const remote=await api.entities.ExamQuestion.filter({exam_id:exam.id},undefined,200); setQuestions(remote.length?remote:(Array.isArray(exam.questions)?exam.questions:[]));};
  const statsFor=id=>{const a=attempts.filter(x=>x.exam_id===id);return {total:a.length,active:a.filter(x=>x.status==='in_progress').length,pending:a.filter(x=>x.status==='pending_grading').length,graded:a.filter(x=>x.status==='graded').length};};

  return <div>
    <PageHeader title={courseIdFromUrl ? `اختبارات الكورس: ${courses.find(c=>String(c.id)===String(courseIdFromUrl))?.title||'الكورس'}` : 'الاختبارات'} description={courseIdFromUrl ? 'أنشئ اختبارات لهذا الكورس فقط. لن تظهر في الاختبارات العامة.' : 'أنشئ الاختبار، تابع كل من دخله، ثم صحّح المحاولات بنفسك'} actions={<Button onClick={()=>{setEditing(null);setForm({...EMPTY,course_id:courseIdFromUrl});setOpen(true)}} className="gap-2"><Plus className="h-4 w-4"/>اختبار جديد</Button>}/>
    <TeacherGradeFilter value={selectedGrade} onChange={changeGrade} />
    {loading?<div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"/></div>:visibleExams.length===0?<EmptyState icon={ClipboardCheck} title="لا توجد اختبارات" description="أنشئ أول اختبار ليتمكن الطلاب من الدخول إليه."/>:
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleExams.map(e=>{const s=statsFor(e.id);return <Card key={e.id} className="border-slate-200"><CardContent className="p-4">
      <div className="flex items-start justify-between gap-2"><p className="font-bold text-slate-800">{e.title}</p><span className={`rounded-full px-2 py-1 text-xs ${e.status==='published'?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{e.status==='published'?'منشور':'مسودة'}</span></div>
      <p className="mt-2 text-xs text-slate-500">المدة: {e.duration} دقيقة • النجاح: {e.passing_score}%</p>{e.exam_mode==='pdf'&&<p className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700"><FileText className="h-3.5 w-3.5"/> اختبار PDF</p>}
      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs"><div className="rounded-lg bg-blue-50 p-2"><b>{s.total}</b><br/>دخلوا</div><div className="rounded-lg bg-slate-50 p-2"><b>{s.active}</b><br/>داخل الآن</div><div className="rounded-lg bg-amber-50 p-2 text-amber-700"><b>{s.pending}</b><br/>بانتظارك</div><div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><b>{s.graded}</b><br/>تم التصحيح</div></div>
      <div className="mt-4 flex flex-wrap gap-1">{e.exam_mode!=='pdf'&&<Button size="sm" variant="outline" onClick={()=>openQuestions(e)}><ListChecks className="h-4 w-4"/> الأسئلة</Button>}<Button size="sm" variant="outline" onClick={()=>setAttemptsOpen(e)} className="gap-1"><Users className="h-4 w-4"/> الطلاب</Button><Button size="sm" variant="ghost" onClick={()=>togglePublish(e)}>{e.status==='published'?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</Button><Button size="sm" variant="ghost" onClick={()=>{setEditing(e);setForm({...e});setOpen(true)}}><Pencil className="h-4 w-4"/></Button><Button size="sm" variant="ghost" className="text-rose-600" onClick={()=>setToDelete(e)}><Trash2 className="h-4 w-4"/></Button></div>
    </CardContent></Card>})}</div>}

    <Dialog open={open} onOpenChange={o=>!o&&setOpen(false)}><DialogContent dir="rtl" className="w-[calc(100vw-2rem)] max-w-[560px] overflow-hidden"><DialogHeader><DialogTitle>{editing?'تعديل الاختبار':'اختبار جديد'}</DialogTitle><p className="text-xs text-slate-500">اختَر حالة النشر بنفسك. يمكنك تعديل الاختبار أو نشره/إخفاءه لاحقًا.</p></DialogHeader><div className="w-full min-w-0 space-y-4 py-2">
      <div className="min-w-0 w-full"><Label>العنوان</Label><Input className="max-w-full" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div><div className="min-w-0 w-full"><Label>الوصف</Label><Textarea className="max-w-full" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
      <div className="min-w-0 w-full"><Label>نوع الاختبار</Label><Select value={form.exam_mode||'manual'} onValueChange={v=>setForm({...form,exam_mode:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="manual">أسئلة داخل المنصة</SelectItem><SelectItem value="pdf">رفع اختبار PDF</SelectItem></SelectContent></Select></div>
      {form.exam_mode==='pdf'&&<div className="min-w-0 w-full overflow-hidden rounded-xl border border-rose-100 bg-rose-50/40 p-3"><div className="mb-2 flex items-center gap-2 text-sm font-bold text-rose-700"><Upload className="h-4 w-4"/> ملف الاختبار PDF</div><FileUpload folder="teacher-exams" value={form.pdf_url||''} onChange={url=>setForm({...form,pdf_url:url,pdf_name:url?form.pdf_name||'اختبار PDF':''})} accept="application/pdf,.pdf" label="رفع ملف PDF" hint="الطالب سيشاهد الملف داخل المنصة ويكتب إجاباته من نفس الصفحة" /></div>}
      <div className="min-w-0 w-full"><Label>الكورس</Label>{courseIdFromUrl?<div className="flex min-h-10 items-center rounded-md border border-indigo-100 bg-indigo-50 px-3 text-sm font-bold text-indigo-700">{courses.find(c=>String(c.id)===String(courseIdFromUrl))?.title||'الكورس الحالي'}</div>:<Select value={form.course_id||'none'} onValueChange={v=>{const id=v==='none'?'':v;const course=courses.find(c=>c.id===id);setForm({...form,course_id:id,target_grade:course?.target_grade||''})}}><SelectTrigger><SelectValue placeholder="بدون كورس"/></SelectTrigger><SelectContent><SelectItem value="none">بدون كورس</SelectItem>{courses.map(c=><SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>}{!courseIdFromUrl&&null}</div><div><Label>الصف الدراسي</Label>{form.course_id?<div className="flex min-h-10 items-center rounded-md border border-indigo-100 bg-indigo-50 px-3 text-sm font-bold text-indigo-700">{courses.find(c=>c.id===form.course_id)?.target_grade||form.target_grade||'غير محدد'}</div>:<Select value={form.target_grade||'all'} onValueChange={v=>setForm({...form,target_grade:v==='all'?'':v})}><SelectTrigger><SelectValue placeholder="كل الصفوف"/></SelectTrigger><SelectContent><SelectItem value="all">كل الصفوف</SelectItem>{GRADES.map(g=><SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>}</div>
      <div className="min-w-0 w-full"><Label>حالة النشر</Label><Select value={form.status||'draft'} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="draft">مسودة - غير منشور</SelectItem><SelectItem value="published">منشور للطلاب</SelectItem></SelectContent></Select></div>
      <div className="grid grid-cols-2 gap-3"><div><Label>المدة (دقيقة)</Label><Input type="number" value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}/></div><div><Label>درجة النجاح (%)</Label><Input type="number" value={form.passing_score} onChange={e=>setForm({...form,passing_score:e.target.value})}/></div></div>
    </div><DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving?'جارٍ الحفظ...':'حفظ'}</Button></DialogFooter></DialogContent></Dialog>

    <QuestionsDialog exam={questionsOpen} onClose={()=>setQuestionsOpen(null)} questions={questions} setQuestions={setQuestions}/>
    <AttemptsDialog exam={attemptsOpen} attempts={attempts.filter(a=>a.exam_id===attemptsOpen?.id)} users={users} onClose={()=>setAttemptsOpen(null)} onChanged={load}/>
    <ConfirmDialog open={!!toDelete} onClose={()=>setToDelete(null)} onConfirm={remove} title="حذف الاختبار" message={`حذف "${toDelete?.title}"؟`} destructive confirmText="حذف"/>
  </div>;
}

function AttemptsDialog({exam,attempts,users,onClose,onChanged}) {
  const { toast }=useToast();
  const [selected,setSelected]=useState(null), [score,setScore]=useState(''), [note,setNote]=useState(''), [saving,setSaving]=useState(false);
  if(!exam) return null;
  const name=a=>a.student_name||users.find(u=>u.id===a.student_id)?.full_name||users.find(u=>u.id===a.student_id)?.email||'طالب';
  const grade=async()=>{if(!selected)return; if(score===''){toast({variant:'destructive',title:'أدخل الدرجة من 100'});return;}setSaving(true);try{await api.functions.invoke('gradeExamAttempt',{attempt_id:selected.id,score,note:undefined,teacher_note:note});toast({title:'تم التصحيح وإعلان النتيجة للطالب'});setSelected(null);onChanged();}catch(e){toast({variant:'destructive',title:e?.message||'تعذر الحفظ'});}finally{setSaving(false);}};
  return <Dialog open={!!exam} onOpenChange={o=>!o&&onClose()}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>طلاب اختبار: {exam.title}</DialogTitle></DialogHeader>
    {!selected?<div className="max-h-[65vh] overflow-auto"><p className="mb-3 text-sm text-slate-500">كل طالب يفتح الاختبار يظهر هنا فورًا، حتى قبل التسليم.</p>{attempts.length===0?<EmptyState icon={Users} title="لم يدخل أي طالب الاختبار بعد"/>:<div className="space-y-2">{attempts.map(a=>{const status=a.status||'graded';return <button key={a.id} onClick={()=>{setSelected(a);setScore(a.score??'');setNote(a.teacher_note||'')}} className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 text-right hover:bg-slate-50"><div><b>{name(a)}</b><p className="mt-1 text-xs text-slate-400">بدأ: {a.started_at?new Date(a.started_at).toLocaleString('ar-EG'):'—'} • سلّم: {a.submitted_at?new Date(a.submitted_at).toLocaleString('ar-EG'):'لم يسلّم بعد'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${status==='pending_grading'?'bg-amber-100 text-amber-700':status==='graded'?'bg-emerald-100 text-emerald-700':'bg-blue-100 text-blue-700'}`}>{status==='pending_grading'?'بانتظار التصحيح':status==='graded'?`تم التصحيح: ${a.score}%`:'داخل الاختبار'}</span></button>})}</div>}</div>:
    <div className="max-h-[65vh] overflow-auto space-y-4"><Button variant="ghost" onClick={()=>setSelected(null)}>← العودة للقائمة</Button><Card><CardContent className="p-4"><h3 className="font-bold">{name(selected)}</h3><p className="mt-2 text-sm text-slate-500">الإجابات:</p><div className="mt-3 space-y-2">{Object.entries(selected.answers||{}).map(([id,answer],i)=>{const q=(exam.questions||[]).find(x=>x.id===id);return <div key={id} className="rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap"><b>{id==='__pdf_response'?'إجابة الطالب على اختبار PDF':q?`السؤال: ${q.question_text}`:`السؤال ${i+1}`}:</b><div className="mt-1">إجابة الطالب: {String(answer)}</div></div>})}</div></CardContent></Card>
      {selected.status==='pending_grading'?<><div><Label>الدرجة النهائية من 100</Label><Input type="number" min="0" max="100" value={score} onChange={e=>setScore(e.target.value)}/></div><div><Label>ملاحظة للطالب (اختياري)</Label><Textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="تظهر للطالب مع النتيجة"/></div><Button onClick={grade} disabled={saving} className="w-full gap-2"><CheckCircle2 className="h-4 w-4"/>{saving?'جارٍ الحفظ...':'تصحيح وإعلان النتيجة'}</Button></>:<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{selected.status==='in_progress'?'الطالب لم يسلّم الاختبار بعد.':'تم تصحيح هذه المحاولة.'}</p>}
    </div>}
  </DialogContent></Dialog>;
}

function QuestionsDialog({exam,onClose,questions,setQuestions}) {
  const {user}=useAuth(); const {toast}=useToast(); const [form,setForm]=useState({question_text:'',type:'multiple_choice',options:['','','',''],correct_answer:'',points:1}); const [saving,setSaving]=useState(false);
  if(!exam)return null; const add=async()=>{if(!form.question_text||!form.correct_answer){toast({variant:'destructive',title:'أكمل بيانات السؤال'});return;}setSaving(true);try{const created=await api.entities.ExamQuestion.create({exam_id:exam.id,teacher_id:user.id,question_text:form.question_text,type:form.type,options:form.type==='true_false'?['صح','خطأ']:form.options.filter(Boolean),correct_answer:form.correct_answer,points:Number(form.points)||1});
    const next=[...questions,created]; setQuestions(next);
    await api.entities.Exam.update(exam.id,{questions:next.map(q=>({id:q.id,question_text:q.question_text,type:q.type,options:q.options||[],correct_answer:q.correct_answer,points:Number(q.points)||1}))});
    setForm({question_text:'',type:'multiple_choice',options:['','','',''],correct_answer:'',points:1}); toast({title:'تمت إضافة السؤال وسيظهر للطلاب'});}finally{setSaving(false);}};
  return <Dialog open={!!exam} onOpenChange={o=>!o&&onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>أسئلة: {exam.title}</DialogTitle></DialogHeader><div className="max-h-[70vh] space-y-4 overflow-y-auto"><div className="space-y-3 rounded-xl border p-4"><div><Label>نص السؤال</Label><Textarea value={form.question_text} onChange={e=>setForm({...form,question_text:e.target.value})}/></div><div className="grid grid-cols-2 gap-3"><Select value={form.type} onValueChange={v=>setForm({...form,type:v,correct_answer:'',options:v==='true_false'?['صح','خطأ']:['','','','']})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="multiple_choice">اختيار من متعدد</SelectItem><SelectItem value="true_false">صح / خطأ</SelectItem></SelectContent></Select><Input type="number" value={form.points} onChange={e=>setForm({...form,points:e.target.value})}/></div>{form.type==='multiple_choice'?<div>{form.options.map((o,i)=><div key={i} className="mt-2 flex gap-2"><input type="radio" checked={form.correct_answer===o} onChange={()=>o&&setForm({...form,correct_answer:o})}/><Input value={o} placeholder={`اختيار ${i+1}`} onChange={e=>{const a=[...form.options];a[i]=e.target.value;setForm({...form,options:a})}}/></div>)}</div>:<Select value={form.correct_answer} onValueChange={v=>setForm({...form,correct_answer:v})}><SelectTrigger><SelectValue placeholder="الإجابة الصحيحة"/></SelectTrigger><SelectContent><SelectItem value="صح">صح</SelectItem><SelectItem value="خطأ">خطأ</SelectItem></SelectContent></Select>}<Button onClick={add} disabled={saving}><Plus className="h-4 w-4"/> إضافة السؤال</Button></div><div>{questions.map((q,i)=><div key={q.id} className="flex justify-between border-b p-3"><span>{i+1}. {q.question_text}</span><button onClick={async()=>{await api.entities.ExamQuestion.delete(q.id);const next=questions.filter(x=>x.id!==q.id);setQuestions(next);await api.entities.Exam.update(exam.id,{questions:next.map(x=>({id:x.id,question_text:x.question_text,type:x.type,options:x.options||[],correct_answer:x.correct_answer,points:Number(x.points)||1}))})}}><X className="h-4 w-4 text-rose-500"/></button></div>)}</div></div><DialogFooter><Button onClick={onClose}>تم</Button></DialogFooter></DialogContent></Dialog>;
}
