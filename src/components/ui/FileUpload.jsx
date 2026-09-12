import React, { useEffect, useRef, useState } from 'react';
import { uploadFileToServer } from '@/api/apiClient';
import LocalFileImage from '@/components/ui/LocalFileImage';
import { UploadCloud, X, Loader2, PauseCircle, Wifi, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatBytes(bytes = 0) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatSpeed(bytesPerSecond = 0) {
    if (!bytesPerSecond) return '...';
    return `${formatBytes(bytesPerSecond)}/ث`; 
}

function formatEta(bytesLeft = 0, speed = 0) {
    if (!speed || !Number.isFinite(speed) || speed <= 0) return 'جارٍ الحساب...';
    const seconds = Math.max(0, Math.round(bytesLeft / speed));
    if (seconds < 60) return `${seconds} ث`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} د`;
    const hours = Math.floor(minutes / 60);
    return `${hours} س ${minutes % 60} د`;
}

// All teacher/student files are uploaded to the Express server.
// Images are stored as normal files too, so they are visible to every device
// instead of being converted into large data URLs or stored in browser storage.

export default function FileUpload({ value, onChange, accept, label = 'رفع ملف', hint, type = 'file', folder = 'teacher-files' }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [fileName, setFileName] = useState('');
    const [fileSize, setFileSize] = useState(0);
    const [transferred, setTransferred] = useState(0);
    const [speed, setSpeed] = useState(0);
    const [status, setStatus] = useState('');
    const [startedAt, setStartedAt] = useState(0);
    const inputRef = useRef(null);
    const controllerRef = useRef(null);

    useEffect(() => () => controllerRef.current?.abort(), []);


    const handleChooseFile = () => { if (!uploading) { setError(''); inputRef.current?.click(); } };

    const handleFile = async (file) => {
        if (!file) return;
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setUploading(true);
        setError('');
        setProgress(0);
        setTransferred(0);
        setSpeed(0);
        setFileName(file.name);
        setFileSize(file.size);
        setStartedAt(Date.now());
        setStatus('جاري تجهيز الرفع...');

        try {
            const started = Date.now();
            const res = await uploadFileToServer({
                file,
                signal: controller.signal,
                folder,
                onProgress: (percent) => {
                    const safePercent = Number(percent) || 0;
                    const bytesTransferred = Math.round((file.size || 0) * safePercent / 100);
                    const elapsedSeconds = Math.max(0.1, (Date.now() - started) / 1000);
                    setProgress(safePercent);
                    setTransferred(bytesTransferred);
                    setSpeed(bytesTransferred / elapsedSeconds);
                },
                onStatus: (message) => setStatus(message || ''),
            });
            onChange(res?.file?.file_url || res?.file_url || '');
            setProgress(100);
            setTransferred(file.size);
            setStatus('تم رفع الملف بنجاح');
        } catch (err) {
            if (err?.code !== 'storage/canceled' && err?.code !== 'upload-canceled' && !controller.signal.aborted) {
                const code = err?.code ? ` (${err.code})` : '';
                setError(`${err?.message || 'تعذّر رفع الملف'}${code}`);
                setStatus('فشل الرفع');
            }
        } finally {
            if (controllerRef.current === controller) controllerRef.current = null;
            setUploading(false);
        }
    };
    const cancelUpload = () => controllerRef.current?.abort();
    const remaining = Math.max(0, fileSize - transferred);
    const elapsed = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;

    return (
        <div className="space-y-2">
            {label && <p className="text-sm font-medium text-slate-700">{label}</p>}
            {value ? (
                type === 'image' ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <div className="flex min-h-[150px] items-center justify-center bg-white p-4">
                            <LocalFileImage
                                src={value}
                                alt={label || 'معاينة الصورة'}
                                className="max-h-[210px] max-w-full rounded-lg object-contain shadow-sm"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-3 py-2">
                            <span className="text-xs font-medium text-emerald-600">تم اختيار الصورة بنجاح</span>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={handleChooseFile} disabled={uploading} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                                    تغيير الصورة
                                </button>
                                <button type="button" onClick={() => onChange('')} className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" title="حذف الصورة">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <span className="truncate text-sm text-slate-600" dir="ltr">{value}</span>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={handleChooseFile} disabled={uploading} className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-white">تغيير</button>
                            <button type="button" onClick={() => onChange('')} className="rounded p-1 text-rose-500 hover:bg-rose-50">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )
            ) : (
                <div className={cn(
                    'rounded-xl border-2 border-dashed border-slate-200 px-4 py-5 text-center transition hover:border-blue-300 hover:bg-blue-50/40',
                    uploading && 'border-blue-200 bg-blue-50/30'
                )}>
                    {!uploading ? (
                        <button type="button" onClick={handleChooseFile} className="flex w-full flex-col items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70">
                            <UploadCloud className="h-7 w-7 text-slate-400" />
                            <span className="text-sm font-medium text-slate-600">
                                اختر الملف للرفع
                            </span>
                            {hint && <span className="text-xs text-slate-400">{hint}</span>}
                            <span className="text-[11px] text-slate-400">
                                سيُرفع الملف إلى خادم المنصة ويصبح متاحًا للطلاب حسب حالة النشر.
                            </span>
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-center gap-2 text-blue-600">
                                {progress >= 100 ? <CheckCircle2 className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin" />}
                                <span className="text-sm font-bold">{progress.toFixed(1)}%</span>
                            </div>
                            <div className="truncate text-xs font-medium text-slate-600" dir="ltr">{fileName}</div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${Math.min(100, progress)}%` }} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 sm:grid-cols-4">
                                <span>{formatBytes(transferred)} / {formatBytes(fileSize)}</span>
                                <span className="flex items-center justify-center gap-1"><Wifi className="h-3 w-3" />{formatSpeed(speed)}</span>
                                <span>متبقي {formatEta(remaining, speed)}</span>
                                <span>{elapsed} ث</span>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{status || 'جاري رفع الملف إلى خادم المنصة...'}</div>
                            <button type="button" onClick={cancelUpload} className="mx-auto inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                                <PauseCircle className="h-3.5 w-3.5" /> إلغاء الرفع
                            </button>
                        </div>
                    )}
                </div>
            )}
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-600">{error}</p>}
            <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
    );
}
