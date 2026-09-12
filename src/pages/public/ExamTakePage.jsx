import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { isLocalFileUrl, resolveFileUrl } from '@/lib/localFiles';
import EmptyState from '@/components/ui/EmptyState';
import { ArrowRight, Lock, Clock, Send, CheckCircle2, FileText, ExternalLink } from 'lucide-react';

export default function ExamTakePage() {
  const { slug, examId } = useParams();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState(null);
  const [pdfFrame, setPdfFrame] = useState('');

  const isPdf = exam?.exam_mode === 'pdf' || !!exam?.pdf_url;
  const pdfUrls = (() => {
    const raw = String(exam?.pdf_url || '').trim();
    if (!raw) return { raw:'', drivePreview:'', googleViewer:'' };
    // Supports all common Google Drive URL forms, including uc?export=download&id=...
    const byQuery = raw.match(/[?&]id=([^&#]+)/);
    const byPath = raw.match(/\/d\/([^/?#]+)/) || raw.match(/\/file\/d\/([^/?#]+)/);
    const fileId = decodeURIComponent(byQuery?.[1] || byPath?.[1] || '');
    const direct = fileId ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}` : raw;
    return {
      raw: direct,
      drivePreview: fileId ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview` : raw,
      googleViewer: `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(direct)}`,
    };
  })();
  const requestedReturn = searchParams.get('returnTo') || '';
  const backTo = requestedReturn.startsWith('/student') ? requestedReturn : (user?.role === 'STUDENT' ? '/student/exams' : (slug ? `/teacher/${slug}` : '/teacher/exams'));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const exams = await api.entities.Exam.filter({ id: examId });
        const e = exams[0];
        if (!e || (e.status !== 'published' && e.teacher_id !== user?.id)) { if (alive) setDenied(true); return; }
        let qs = [];
        try { qs = await api.entities.ExamQuestion.filter({ exam_id: examId }, undefined, 200); } catch (questionError) { console.warn('Question collection unavailable, using questions stored with exam', questionError); }
        const embedded = Array.isArray(e.questions) ? e.questions : [];
        const finalQuestions = qs.length ? qs : embedded;
        if (!alive) return;
        setExam(e); setQuestions(finalQuestions);
        const started = await api.functions.invoke('startExamAttempt', { exam_id: examId });
        if (!alive) return;
        setAttempt(started.data);
        setAnswers(started.data?.answers || {});
        if (started.data?.status === 'pending_grading' || started.data?.status === 'graded') setResult(started.data);
      } catch (err) {
        console.error(err);
        if (alive) setDenied(true);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [examId, user?.id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = String(exam?.pdf_url || '').trim();
      if (!raw) { if (alive) setPdfFrame(''); return; }
      try {
        const resolved = isLocalFileUrl(raw) ? await resolveFileUrl(raw) : raw;
        if (!alive) return;
        const idMatch = resolved.match(/[?&]id=([^&#]+)/) || resolved.match(/\/file\/d\/([^/?#]+)/) || resolved.match(/\/d\/([^/?#]+)/);
        const id = idMatch?.[1] ? decodeURIComponent(idMatch[1]) : '';
        setPdfFrame(id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` : resolved);
      } catch (e) {
        console.warn('PDF resolve failed', e);
        if (alive) setPdfFrame(raw);
      }
    })();
    return () => { alive = false; };
  }, [exam?.pdf_url]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = useMemo(() => {
    if (!attempt?.started_at || !exam?.duration) return Number(exam?.duration || 0) * 60;
    const started = new Date(attempt.started_at).getTime();
    return Math.max(0, Math.ceil((Number(exam.duration) * 60000 - (now - started)) / 1000));
  }, [attempt?.started_at, exam?.duration, now]);

  const timeLabel = `${String(Math.floor(remaining / 60)).padStart(2,'0')}:${String(remaining % 60).padStart(2,'0')}`;

  const submit = async (reason = 'student') => {
    if (submitting || result) return;
    if (reason === 'student') {
      if (isPdf && !String(answers.__pdf_response || '').trim()) {
        alert('اكتب إجابتك في مساحة الإجابة قبل التسليم.');
        return;
      }
      if (!isPdf && questions.some(q => !answers[q.id])) {
        alert('أجب عن جميع الأسئلة أولًا قبل التسليم.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await api.functions.invoke('submitExamAttempt', { exam_id: examId, answers, reason });
      setAttempt(res.data);
      setResult(res.data);
    } catch (err) {
      alert(err?.message || 'تعذّر تسليم الاختبار');
    } finally { setSubmitting(false); }
  };

  useEffect(() => {
    if (attempt?.status === 'in_progress' && remaining <= 0) submit('time_expired');
  }, [remaining, attempt?.status]);

  if (loading) return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /></div>;
  if (denied) return <div className="py-24"><EmptyState icon={Lock} title="لا يمكنك الوصول إلى هذا الاختبار" description="تأكد من تسجيل الدخول بحساب الطالب ومن أن الاختبار منشور." /></div>;

  if (result) return (
    <div className="min-h-screen bg-slate-50 py-10" dir="rtl">
      <div className="mx-auto max-w-2xl px-4">
        <Card className="border-violet-200"><CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-violet-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">{result.status === 'graded' ? 'تم إعلان نتيجتك' : 'تم تسليم الاختبار بنجاح'}</h1>
          {result.status === 'graded' ? <>
            <p className="mt-3 text-4xl font-black text-violet-700">{result.score}%</p>
            <p className="mt-2 text-slate-600">{result.passed ? 'اجتزت الاختبار 🎉' : 'لم تجتز درجة النجاح'}</p>
            {result.teacher_note && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">ملاحظة المدرس: {result.teacher_note}</p>}
          </> : <p className="mt-3 text-slate-600">إجابتك وصلت إلى المدرس. لن تظهر الإجابات الصحيحة أو نتيجة كل سؤال الآن؛ ستظهر النتيجة فقط بعد أن يصحح المدرس الاختبار ويعلنها.</p>}
          <div className="mt-6 flex justify-center gap-2"><Link to={backTo}><Button variant="outline">العودة</Button></Link><Link to="/student/results"><Button>نتائجي</Button></Link></div>
        </CardContent></Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8" dir="rtl">
      <div className="mx-auto max-w-6xl px-4">
        <Link to={backTo} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500"><ArrowRight className="h-4 w-4" /> العودة</Link>
        <Card className="sticky top-3 z-10 mb-6 border-slate-200 shadow-sm"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div><h1 className="text-xl font-bold text-slate-900">{exam?.title}</h1><p className="text-sm text-slate-500">{isPdf ? 'اختبار PDF داخل المنصة' : `${questions.length} سؤال`} • مدة الاختبار {exam?.duration} دقيقة</p></div>
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-lg font-black ${remaining < 60 ? 'bg-rose-50 text-rose-600' : 'bg-violet-50 text-violet-700'}`}><Clock className="h-5 w-5" /> {timeLabel}</div>
        </CardContent></Card>

        {isPdf ? <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <Card className="overflow-hidden border-slate-200"><CardContent className="p-0"><div className="flex items-center justify-between border-b bg-slate-50 p-4"><div className="flex items-center gap-2 font-bold text-slate-800"><FileText className="h-5 w-5 text-rose-600"/>{exam.pdf_name || 'ورقة الاختبار PDF'}</div><a href={pdfUrls.raw} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">فتح الملف <ExternalLink className="h-4 w-4"/></a></div><div className="relative h-[75vh] bg-slate-100">{pdfFrame ? <object data={pdfFrame} type="application/pdf" className="h-full w-full"><iframe title="اختبار PDF" src={pdfFrame} className="h-full w-full border-0" allow="fullscreen" /></object> : <div className="grid h-full place-items-center text-sm text-slate-500">جارٍ فتح ورقة الاختبار...</div>}<div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-500 shadow">يُفتح الاختبار داخل المنصة. إذا كان الملف قديمًا وغير متاح، يطلب من المدرس إعادة رفعه كملف عام للعرض.</div></div></CardContent></Card>
          <div className="space-y-4"><Card className="border-violet-200"><CardContent className="p-5"><h2 className="font-extrabold text-slate-900">اكتب إجاباتك هنا</h2><p className="mt-1 text-xs leading-5 text-slate-500">شاهد ورقة الأسئلة على اليسار، ثم اكتب إجابتك مرتبة داخل المنصة. سيستلمها المدرس كما كتبتها.</p><Textarea value={answers.__pdf_response || ''} onChange={e=>setAnswers(a=>({...a,__pdf_response:e.target.value}))} placeholder={'مثال:\n1) الإجابة الأولى...\n2) الإجابة الثانية...'} className="mt-4 min-h-[430px] resize-y text-base leading-8" /><p className="mt-2 text-xs text-slate-400">عدد الحروف: {String(answers.__pdf_response || '').length}</p></CardContent></Card><Button onClick={() => submit('student')} disabled={submitting} size="lg" className="w-full gap-2"><Send className="h-4 w-4" />{submitting ? 'جارٍ التسليم...' : 'تسليم الإجابات للمدرس'}</Button></div>
        </div> : <>
          <div className="space-y-4">
            {questions.length===0 ? <EmptyState icon={FileText} title="لم تتم إضافة أسئلة بعد" description="هذا الاختبار منشور لكن المدرس لم يضف الأسئلة بعد."/> : questions.map((q, i) => <Card key={q.id} className="border-slate-200"><CardContent className="p-5"><p className="font-semibold text-slate-800">{i + 1}. {q.question_text}</p><p className="mt-1 text-xs text-slate-400">الدرجة: {q.points}</p><RadioGroup value={answers[q.id] || ''} onValueChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} className="mt-4 space-y-2">{(q.options || []).map((opt, idx) => <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"><RadioGroupItem value={opt} id={`${q.id}-${idx}`} /><Label htmlFor={`${q.id}-${idx}`} className="flex-1 cursor-pointer text-slate-700">{opt}</Label></div>)}</RadioGroup></CardContent></Card>)}
          </div><div className="mt-6 flex justify-end"><Button onClick={() => submit('student')} disabled={submitting} size="lg" className="gap-2"><Send className="h-4 w-4" />{submitting ? 'جارٍ التسليم...' : 'تسليم الاختبار للمدرس'}</Button></div>
        </>}
      </div>
    </div>
  );
}
