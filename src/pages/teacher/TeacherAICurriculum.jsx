import React, { useEffect, useState } from "react";
import { Sparkles, Save, CheckCircle2 } from "lucide-react";
import { api } from "@/api/apiClient";
import { GRADES } from "@/lib/grades";
import PageHeader from "@/components/ui/PageHeader";

export default function TeacherAICurriculum() {
  const [grade, setGrade] = useState(GRADES[0]);
  const [content, setContent] = useState("");
  const [map, setMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await api.functions.invoke("aiCurriculumGet");
        if (!live) return;
        const items = res?.data?.items || [];
        const m = Object.fromEntries(items.map((i) => [i.grade, i.content]));
        setMap(m);
        setContent(m[grade] || "");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    setContent(map[grade] || "");
    setSaved(false);
  }, [grade]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.functions.invoke("aiCurriculumSave", { grade, content });
      setMap((prev) => ({ ...prev, [grade]: content }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl">
      <PageHeader
        title="المساعد الذكي — المنهج"
        description="اكتب هنا كل حاجة عاوز المساعد الذكي يعرفها عن كل صف. المساعد مش هيعرف ولا هيرد على أي حاجة مش موجودة هنا، وممنوع عليه يحل واجب أو امتحان لأي طالب — دوره يشرح بس."
      />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="mb-2 px-2 text-[11px] font-black text-slate-400">اختر الصف</div>
          <div className="space-y-1">
            {GRADES.map((g) => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-right text-[12px] font-bold transition ${
                  grade === g ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{g}</span>
                {map[g] ? <CheckCircle2 className={`h-4 w-4 ${grade === g ? "text-white" : "text-emerald-500"}`} /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Sparkles className="h-4 w-4" /></span>
            <div>
              <div className="text-sm font-black text-slate-800">منهج {grade}</div>
              <div className="text-[11px] text-slate-400">اكتب دروس/موضوعات الصف ده بأسلوبك، زي ما هتشرحها للطالب. كل ما تفصّل أكتر، المساعد هيشرح أدق.</div>
            </div>
          </div>
          <textarea
            dir="rtl"
            disabled={loading}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            placeholder="مثال: الفصل الأول - الكسور. الكسر عبارة عن جزء من كل... اشرح إزاي نجمع كسرين ليهم نفس المقام... إلخ"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />{saving ? "جارٍ الحفظ..." : "حفظ منهج هذا الصف"}
            </button>
            {saved && <span className="text-xs font-bold text-emerald-600">تم الحفظ ✓</span>}
          </div>
        </div>
      </div>
    </div>
  );
}