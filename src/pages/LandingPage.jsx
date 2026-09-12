import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  FileText,
  PlayCircle,
  ClipboardCheck,
  BarChart3,
  Users,
  Sparkles,
  Menu,
  X,
  Star,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { GRADES } from "@/lib/grades";

const gradeGroups = [
  { title: "المرحلة الابتدائية", subtitle: "من أولى ابتدائي إلى سادسة ابتدائي", grades: GRADES.slice(0, 6), icon: "🎒" },
  { title: "المرحلة الإعدادية", subtitle: "ثلاث سنوات من التعلم المنظم", grades: GRADES.slice(6, 9), icon: "📚" },
  { title: "المرحلة الثانوية", subtitle: "من أولى إلى ثالثة ثانوي", grades: GRADES.slice(9, 12), icon: "🎓" },
];

const features = [
  { icon: PlayCircle, title: "فيديوهات ودروس", text: "شاهد شرح المدرسين في أي وقت وبطريقة منظمة." },
  { icon: ClipboardCheck, title: "اختبارات مستمرة", text: "اختبر نفسك وتابع نتائجك وتقدمك أولًا بأول." },
  { icon: FileText, title: "ملفات ومذكرات", text: "كل ملفاتك ومذكراتك التعليمية في مكان واحد." },
  { icon: BarChart3, title: "متابعة مستواك", text: "اعرف تقدمك ونتائجك وساعد نفسك على التحسن." },
];

const steps = [
  ["01", "اختار صفك", "حدد الصف الدراسي المناسب لك مرة واحدة."],
  ["02", "اكتشف الكورسات", "شاهد المدرسين والكورسات المتاحة لصفك."],
  ["03", "ابدأ التعلم", "ادخل للكورس وشاهد الفيديوهات والاختبارات والملفات."],
  ["04", "تابع تقدمك", "راجع نتائجك وإنجازك واستمر في التطور."],
];

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LandingPage() {
  const { user, enterDemoRole } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const dashboardPath = user?.role === "TEACHER" ? "/teacher" : "/student";
  const primaryPath = user ? dashboardPath : "/";

  const enterTeacher = () => { enterDemoRole("TEACHER"); navigate("/teacher", { replace: true }); };
  const enterStudent = () => { enterDemoRole("STUDENT"); navigate("/student", { replace: true }); };

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f7fbff] text-slate-900">
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[24px] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_18px_55px_rgba(30,80,120,.10)] backdrop-blur-xl sm:px-6">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3"
            aria-label="الرئيسية"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <BookOpen className="h-6 w-6" />
            </span>
            <span className="text-right">
              <span className="block text-lg font-black tracking-tight">Lurnova</span>
              <span className="block text-[11px] font-semibold text-slate-400">منصة تعليمية متكاملة</span>
            </span>
          </button>

          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 lg:flex">
            <button onClick={() => scrollTo("how")} className="transition hover:text-indigo-600">كيف تعمل؟</button>
            <button onClick={() => scrollTo("grades")} className="transition hover:text-indigo-600">الصفوف الدراسية</button>
            <button onClick={() => scrollTo("features")} className="transition hover:text-indigo-600">مميزات المنصة</button>
            <button onClick={() => scrollTo("about")} className="transition hover:text-indigo-600">عن المنصة</button>
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <button
                onClick={() => navigate(dashboardPath)}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
              >
                الدخول إلى حسابي <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button onClick={enterTeacher} className="inline-flex h-11 items-center gap-2 rounded-xl border border-indigo-600 px-5 text-sm font-black text-indigo-600 transition hover:bg-indigo-50">
                  دخول المدرس
                </button>
                <button onClick={enterStudent} className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700">
                  دخول الطالب
                </button>
              </>
            )}
          </div>

          <button
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="القائمة"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="mx-auto mt-2 max-w-7xl rounded-2xl border border-slate-100 bg-white p-4 shadow-xl lg:hidden">
            <div className="grid gap-2 text-right text-sm font-bold">
              {[
                ["how", "كيف تعمل؟"],
                ["grades", "الصفوف الدراسية"],
                ["features", "مميزات المنصة"],
                ["about", "عن المنصة"],
              ].map(([id, label]) => (
                <button key={id} onClick={() => { setMobileOpen(false); scrollTo(id); }} className="rounded-xl px-4 py-3 text-slate-700 hover:bg-slate-50">{label}</button>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-3">
                <button onClick={() => { setMobileOpen(false); enterTeacher(); }} className="rounded-xl border border-indigo-600 py-3 text-center text-indigo-600">دخول المدرس</button>
                <button onClick={() => { setMobileOpen(false); enterStudent(); }} className="rounded-xl bg-indigo-600 py-3 text-center text-white">دخول الطالب</button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <div className="absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="absolute -left-40 top-40 -z-10 h-[430px] w-[430px] rounded-full bg-sky-200/50 blur-3xl" />

          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pb-24 lg:pt-24">
            <div className="text-center lg:text-right">
              <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2 text-xs font-black text-indigo-600 shadow-sm lg:mx-0">
                <Sparkles className="h-4 w-4" /> كل احتياجاتك التعليمية في مكان واحد
              </div>
              <h1 className="text-4xl font-black leading-[1.25] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                منصة تعليمية
                <span className="block bg-gradient-to-l from-indigo-600 via-blue-600 to-sky-500 bg-clip-text text-transparent">
                  تساعدك توصل لأفضل مستوى
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-8 text-slate-500 sm:text-lg lg:mx-0">
                اختار صفك، اكتشف أفضل الكورسات، ذاكر من الفيديوهات والملفات،
                وحل الاختبارات وتابع مستواك في تجربة تعليمية بسيطة ومنظمة.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
                <button onClick={enterTeacher} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-base font-black text-white shadow-[0_16px_35px_rgba(79,70,229,.25)] transition hover:-translate-y-0.5 hover:bg-indigo-700">
                  دخول صفحة المدرس <ArrowLeft className="h-5 w-5" />
                </button>
                <button onClick={enterStudent} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-indigo-100 bg-white px-6 text-base font-black text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50">
                  دخول صفحة الطالب <ArrowLeft className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3 text-xs font-bold text-slate-400">دخول تجريبي مباشر بدون بريد أو كلمة مرور</div>

              <div className="mt-9 flex flex-wrap justify-center gap-5 text-xs font-bold text-slate-500 lg:justify-start">
                {["فيديوهات", "اختبارات", "ملفات", "متابعة الدرجات"].map((x) => (
                  <span key={x} className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {x}</span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-indigo-200/50 to-sky-100/30 blur-2xl" />
              <div className="relative overflow-hidden rounded-[36px] border border-white bg-white p-4 shadow-[0_30px_90px_rgba(37,99,235,.14)]">
                <div className="rounded-[28px] bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-6 text-white sm:p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white/70">رحلتك التعليمية</div>
                      <div className="mt-1 text-2xl font-black">ابدأ من صفك</div>
                    </div>
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15"><GraduationCap className="h-8 w-8" /></div>
                  </div>
                  <div className="mt-7 grid grid-cols-2 gap-3">
                    {[
                      [PlayCircle, "دروس فيديو"],
                      [ClipboardCheck, "اختبارات"],
                      [FileText, "ملفات"],
                      [BarChart3, "إحصائيات"],
                    ].map(([Icon, label]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                        <Icon className="h-6 w-6 text-white/90" />
                        <div className="mt-3 text-sm font-black">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 p-2 pt-5 text-center">
                  <div className="rounded-2xl bg-indigo-50 p-4"><div className="text-2xl font-black text-indigo-600">12</div><div className="mt-1 text-[11px] font-bold text-slate-400">صف دراسي</div></div>
                  <div className="rounded-2xl bg-sky-50 p-4"><div className="text-2xl font-black text-sky-600">24/7</div><div className="mt-1 text-[11px] font-bold text-slate-400">تعلم</div></div>
                  <div className="rounded-2xl bg-emerald-50 p-4"><div className="text-2xl font-black text-emerald-600">∞</div><div className="mt-1 text-[11px] font-bold text-slate-400">محتوى منظم</div></div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-white bg-white px-5 py-3 shadow-xl sm:block">
                <div className="flex items-center gap-2 text-sm font-black text-slate-700"><Star className="h-5 w-5 fill-amber-400 text-amber-400" /> تعلم أسهل وتنظيم أفضل</div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="scroll-mt-28 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-black text-indigo-600">بخطوات بسيطة</span>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">إزاي تشتغل المنصة؟</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">كل خطوة مصممة علشان توصلك للمحتوى المناسب بدون تعقيد.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(([num, title, text]) => (
                <div key={num} className="group rounded-[26px] border border-slate-100 bg-slate-50/70 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_20px_50px_rgba(15,23,42,.08)]">
                  <div className="flex items-center justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-sm font-black text-white">{num}</span>
                    <span className="text-3xl opacity-30">✦</span>
                  </div>
                  <h3 className="mt-6 text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="grades" className="scroll-mt-28 bg-gradient-to-b from-[#f7fbff] to-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="text-xs font-black text-indigo-600">اختر مرحلتك</span>
                <h2 className="mt-2 text-3xl font-black sm:text-4xl">صفوف دراسية منظمة</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">بعد تسجيل الدخول، اختار صفك الدراسي ليظهر لك المحتوى والكورسات المناسبة له.</p>
              </div>
              <Link to="/register" className="text-sm font-black text-indigo-600 hover:text-indigo-700">إنشاء حساب طالب ←</Link>
            </div>

            <div className="mt-9 grid gap-5 lg:grid-cols-3">
              {gradeGroups.map((group, index) => (
                <div key={group.title} className={`overflow-hidden rounded-[30px] border p-6 shadow-sm ${index === 0 ? "border-sky-100 bg-gradient-to-br from-sky-50 to-white" : index === 1 ? "border-indigo-100 bg-gradient-to-br from-indigo-50 to-white" : "border-violet-100 bg-gradient-to-br from-violet-50 to-white"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-3xl">{group.icon}</span>
                      <h3 className="mt-3 text-xl font-black">{group.title}</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{group.subtitle}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-400 shadow-sm">{group.grades.length} صفوف</span>
                  </div>
                  <div className="mt-6 grid gap-2">
                    {group.grades.map((grade) => (
                      <button key={grade} onClick={() => navigate("/register")} className="flex items-center justify-between rounded-2xl border border-white bg-white/80 px-4 py-3 text-right text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600">
                        <span>{grade}</span><ArrowLeft className="h-4 w-4 text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-28 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-black text-indigo-600">كل ما تحتاجه</span>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">تعلم، اختبر، تابع تقدمك</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">المنصة تجمع أدوات التعلم الأساسية في مكان واحد وبواجهة سهلة.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-[0_12px_35px_rgba(30,60,75,.05)] transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="grid h-13 w-13 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Icon className="h-6 w-6" /></div>
                  <h3 className="mt-5 text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-28 px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-slate-950 px-6 py-12 text-white shadow-[0_30px_80px_rgba(15,23,42,.18)] sm:px-12 lg:px-16">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70">
                  <Users className="h-4 w-4" /> للطلاب والمدرسين
                </div>
                <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
                  مساحة واحدة تجمع رحلة الطالب ومحتوى المدرس
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-8 text-white/55">
                  المدرس ينظم الكورسات والفيديوهات والاختبارات والملفات حسب الصف،
                  والطالب يشاهد المحتوى المناسب له ويتابع مستواه من حسابه.
                </p>
              </div>
              <Link to={user ? dashboardPath : "/register"} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-slate-950 transition hover:bg-indigo-50">
                {user ? "الدخول إلى حسابي" : "ابدأ الآن"} <ArrowLeft className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="pb-16 pt-2 sm:pb-20">
          <div className="mx-auto max-w-3xl px-5 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-indigo-500" />
            <h2 className="mt-4 text-2xl font-black sm:text-3xl">جاهز تبدأ؟</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">سجل حسابك واختار صفك وابدأ الوصول للمحتوى المناسب لك.</p>
            <Link to={primaryPath} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">
              {user ? "الذهاب إلى حسابي" : "إنشاء حساب"} <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 text-center text-xs font-semibold text-slate-400 sm:flex-row sm:px-8">
          <div>© 2026 Lurnova — منصة تعليمية متكاملة</div>
          <div>تعلم بطريقة أبسط، وتابع تقدمك بشكل أوضح.</div>
        </div>
      </footer>
    </div>
  );
}
