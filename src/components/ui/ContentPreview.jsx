import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Music2, PlayCircle } from 'lucide-react';
import { isLocalFileUrl, openLocalFile, resolveFileUrl } from '@/lib/localFiles';
import { assetUrl } from '@/lib/apiBase';

const extOf = (value = '') => {
  const clean = String(value).split('?')[0].split('#')[0];
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return (match?.[1] || '').toLowerCase();
};

const driveId = (value = '') => {
  const text = String(value);
  const match = text.match(/\/d\/([^/?#]+)/) || text.match(/[?&]id=([^&#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};

const youtubeEmbed = (value = '') => {
  const text = String(value);
  const match = text.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^?&#/]+)/i);
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1` : '';
};

const vimeoEmbed = (value = '') => {
  const match = String(value).match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match?.[1] ? `https://player.vimeo.com/video/${match[1]}` : '';
};

const typeOf = (item, url) => {
  const declared = String(item?.file_type || item?.mime_type || item?.type || '').toLowerCase();
  const ext = extOf(url || item?.file_url || '');
  if (declared.includes('pdf') || ext === 'pdf') return 'pdf';
  if (declared.startsWith('image/') || /^(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(ext)) return 'image';
  if (declared.startsWith('audio/') || /^(mp3|wav|ogg|m4a|aac|flac)$/.test(ext)) return 'audio';
  if (declared.startsWith('video/') || /^(mp4|webm|ogg|mov|m4v|avi)$/.test(ext)) return 'video';
  if (/\.(docx?|xlsx?|pptx?)$/i.test(url || '')) return 'office';
  return 'generic';
};

export default function ContentPreview({ item, url, title = 'المحتوى', className = '' }) {
  const raw = url || item?.file_url || item?.attachment_url || '';
  const normalizedRaw = useMemo(() => assetUrl(raw), [raw]);
  const [resolved, setResolved] = useState(normalizedRaw);
  const kind = useMemo(() => typeOf(item, normalizedRaw), [item, normalizedRaw]);
  const remoteDrive = driveId(normalizedRaw);
  const youtube = youtubeEmbed(raw);
  const vimeo = vimeoEmbed(raw);

  useEffect(() => {
    let alive = true;
    if (!normalizedRaw) { setResolved(''); return undefined; }
    if (!isLocalFileUrl(normalizedRaw)) { setResolved(normalizedRaw); return undefined; }
    resolveFileUrl(normalizedRaw).then((value) => alive && setResolved(value)).catch(() => alive && setResolved(''));
    return () => { alive = false; };
  }, [normalizedRaw]);

  const effective = resolved || normalizedRaw;
  const id = driveId(effective) || remoteDrive;
  const office = kind === 'office' && !isLocalFileUrl(effective)
    ? `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(effective)}`
    : '';

  const download = async () => {
    if (!normalizedRaw) return;
    if (isLocalFileUrl(normalizedRaw)) return openLocalFile(normalizedRaw, { download: true });
    const anchor = document.createElement('a');
    anchor.href = normalizedRaw;
    anchor.download = '';
    anchor.target = '_self';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  if (!effective) return <Fallback title={title} onDownload={download} />;

  if (youtube || vimeo || id && kind === 'video') {
    const src = youtube || vimeo || `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
    return <div className={`overflow-hidden rounded-3xl bg-slate-950 shadow-xl ${className}`}><div className="aspect-video w-full"><iframe src={src} title={title} className="h-full w-full border-0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div></div>;
  }

  if (kind === 'video') return <div className={`overflow-hidden rounded-3xl bg-black shadow-xl ${className}`}><video src={effective} controls playsInline className="aspect-video w-full" /></div>;
  if (kind === 'pdf') {
    const src = id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` : effective;
    const googleViewer = !id && !isLocalFileUrl(effective)
      ? `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(effective)}`
      : '';
    const previewSrc = googleViewer || src;
    return <div className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl ${className}`}><div className="h-[78vh] min-h-[520px]"><object data={previewSrc} type="application/pdf" className="h-full w-full"><iframe title={title} src={previewSrc} className="h-full w-full border-0" /></object></div></div>;
  }
  if (kind === 'image') return <div className={`overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-xl ${className}`}><img src={effective} alt={title} className="mx-auto max-h-[78vh] max-w-full rounded-2xl object-contain" /></div>;
  if (kind === 'audio') return <div className={`rounded-3xl border border-slate-200 bg-white p-8 shadow-xl ${className}`}><div className="mx-auto max-w-2xl text-center"><Music2 className="mx-auto h-14 w-14 text-indigo-500" /><h3 className="mt-4 text-lg font-black text-slate-900">{title}</h3><audio src={effective} controls className="mt-6 w-full" /></div></div>;
  if (office) return <div className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl ${className}`}><div className="h-[78vh] min-h-[520px]"><iframe title={title} src={office} className="h-full w-full border-0" /></div></div>;
  return <Fallback title={title} onDownload={download} />;
}

function Fallback({ title, onDownload }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm"><FileText className="mx-auto h-14 w-14 text-slate-300" /><h3 className="mt-4 font-black text-slate-800">{title}</h3><p className="mt-2 text-sm text-slate-500">نوع الملف لا يدعم المعاينة المباشرة داخل المتصفح.</p><button type="button" onClick={onDownload} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"><Download className="h-4 w-4" /> فتح / تحميل الملف</button></div>;
}
