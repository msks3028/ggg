import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/api/apiClient";
import { GRADES } from "@/lib/grades";
import { useToast } from "@/components/ui/use-toast";

export default function StudentGradeSelection() {
  const { user, checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [grade, setGrade] = useState(user?.grade || "");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!grade) return;
    setSaving(true);
    try {
      await api.auth.updateMe({ grade });
      const updated = await checkUserAuth();
      if (!updated?.grade) throw new Error("تعذر حفظ الصف الدراسي.");
      const target = typeof location.state?.from === "string" &&
        location.state.from.startsWith("/") &&
        !location.state.from.startsWith("//")
        ? location.state.from
        : "/student";
      navigate(target, { replace: true });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "تعذر حفظ الصف الدراسي",
        description: error?.message || "حاول مرة أخرى.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center p-4 sm:p-8">
      <Card className="w-full overflow-hidden rounded-[2rem] border-slate-200 shadow-[0_25px_70px_-35px_rgba(15,23,42,.35)]">
        <CardHeader className="bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-7 text-center sm:p-10">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
            <GraduationCap className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-black sm:text-3xl">اختر صفك الدراسي</CardTitle>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            اختر الصف مرة واحدة حتى نعرض لك الكورسات والفيديوهات والملفات والاختبارات المناسبة لك.
          </p>
        </CardHeader>
        <CardContent className="p-5 sm:p-8">
          <form onSubmit={submit}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {GRADES.map((item) => {
                const selected = grade === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setGrade(item)}
                    className={`rounded-2xl border p-4 text-right text-sm font-bold transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>{item}</span>
                      {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-600" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <Button
              type="submit"
              disabled={!grade || saving}
              className="mt-7 h-12 w-full rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700"
            >
              {saving ? (
                <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ حفظ الصف...</>
              ) : (
                <>متابعة إلى حسابي <ArrowLeft className="mr-2 h-4 w-4" /></>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
