import React from 'react';
import {cn} from '@/lib/utils';
export default function StatCard({icon:Icon,label,value,hint,tone='default'}){
 const tones={default:'border-slate-200 bg-white',blue:'border-blue-100 bg-white',green:'border-emerald-100 bg-white',amber:'border-amber-100 bg-white',violet:'border-indigo-100 bg-white'};
 const icons={default:'bg-slate-100 text-slate-600',blue:'bg-blue-50 text-blue-600',green:'bg-emerald-50 text-emerald-600',amber:'bg-amber-50 text-amber-600',violet:'bg-indigo-50 text-indigo-600'};
 return <div className={cn('relative overflow-hidden rounded-[22px] border p-5 shadow-[0_8px_30px_rgba(16,42,67,.055)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(16,42,67,.09)]',tones[tone])} dir="rtl">
  <div className="absolute left-0 top-0 h-1 w-16 bg-[#1677ff] opacity-70"/>
  <div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-400">{label}</p><p className="mt-2 text-[29px] font-black tracking-tight text-[#102a43]">{value}</p>{hint&&<p className="mt-1 text-[11px] text-slate-400">{hint}</p>}</div>{Icon&&<div className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl',icons[tone])}><Icon className="h-5 w-5"/></div>}</div>
 </div>
}