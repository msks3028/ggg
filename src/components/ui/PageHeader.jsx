import React from 'react';
export default function PageHeader({ title, description, actions }) {
 return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" dir="rtl">
   <div><div className="mb-2 inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black text-indigo-600">إدارة المنصة</div>
   <h1 className="text-[27px] font-black tracking-tight text-slate-800">{title}</h1>
   {description&&<p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}</div>
   {actions&&<div className="flex flex-wrap items-center gap-2">{actions}</div>}
 </div>;
}