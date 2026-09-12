import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Send, GraduationCap } from "lucide-react";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { GRADES } from "@/lib/grades";
import PageHeader from "@/components/ui/PageHeader";

export default function StudentAI() {
  const { user } = useAuth();
  const [grade, setGrade] = useState(user?.grade || "");
  const [confirmed, setConfirmed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const startChat = () => {
    if (!user?.grade || grade !== user.grade) return;
    setConfirmed(true);
    setMessages([
      { role: "assistant", content: `تمام، أنا هساعدك في منهج ${grade}. اسألني في أي سؤال وهساعدك تفهمه خطوة خطوة — بس مش هحل الواجب أو الامتحان بدالك، دوري إني أشرحلك.` },
    ]);
  };

  const send = async () => {
    const question = input.trim();
    if (!question || sending) return;
    setInput("");
    const nextMessages = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const res = await api.functions.invoke("aiTutorChat", {
        grade,
        question,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      });
      const answer = res?.data?.answer || "معلش، حصلت مشكلة. جرّب تاني.";
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: err?.message || "تعذر الوصول للمساعد الذكي دلوقتي." }]);
    } finally {
      setSending(false);
    }
  };

  if (!confirmed) {
    return (
      <div dir="rtl">
        <PageHeader title="المساعد الذكي" description="بيساعدك تفهم أسئلتك خطوة خطوة، من غير ما يحل الواجب أو الامتحان بدالك." />
        <div className="mx-auto max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Sparkles className="h-8 w-8" /></div>
          <h2 className="text-lg font-black text-slate-800">قبل ما نبدأ، انت في أنهي صف؟</h2>
          <p className="mt-1 text-xs text-slate-400">عشان أركّز معاك في منهج صفك بالظبط.</p>
          <select
            dir="rtl"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
          >
            <option value="">اختر الصف الدراسي</option>
            {user?.grade ? <option value={user.grade}>{user.grade}</option> : GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button
            onClick={startChat}
            disabled={!user?.grade || grade !== user.grade}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-500 disabled:opacity-40"
          >
            <GraduationCap className="h-4 w-4" />ابدأ المحادثة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex h-[calc(100vh-140px)] flex-col">
      <PageHeader title="المساعد الذكي" description={`بيساعدك تفهم منهج ${grade} — بيشرح ومايحلش الواجب بدالك.`} />
      <div className="flex-1 space-y-4 overflow-y-auto rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
              m.role === "user" ? "bg-slate-100 text-slate-700" : "bg-indigo-50 text-indigo-900"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-end">
            <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-400">جارٍ الكتابة...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          dir="rtl"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="اسألني عن درس أو فكرة مش فاهمها..."
          className="h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-500 disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}