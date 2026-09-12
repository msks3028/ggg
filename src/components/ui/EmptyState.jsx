import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'لا توجد بيانات', description, action, icon: Icon = Inbox }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Icon className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-700">{title}</h3>
            {description && <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}