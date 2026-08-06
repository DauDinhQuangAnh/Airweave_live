import { Activity, CircleDashed, Database, AlertCircle, Sparkles, Beaker } from 'lucide-react';

export type DataStatus = 'live' | 'stale' | 'estimated' | 'demo' | 'placeholder' | 'unavailable';

const META: Record<DataStatus, {
  vi: string; en: string;
  cls: string; icon: typeof Activity;
}> = {
  live:        { vi: 'Trực tiếp',  en: 'Live',        cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', icon: Activity },
  stale:       { vi: 'Cũ',         en: 'Stale',       cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',          icon: CircleDashed },
  estimated:   { vi: 'Ước tính',   en: 'Estimated',   cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',                   icon: Sparkles },
  demo:        { vi: 'Demo',       en: 'Demo',        cls: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30',  icon: Beaker },
  placeholder: { vi: 'Chưa kết nối', en: 'Placeholder', cls: 'bg-muted text-muted-foreground border-border',                                   icon: Database },
  unavailable: { vi: 'Không có dữ liệu', en: 'Unavailable', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',            icon: AlertCircle },
};

interface Props {
  status: DataStatus;
  lang?: 'vi' | 'en';
  source?: string;
  observedAt?: string | number | Date | null;
  className?: string;
  compact?: boolean;
}

function fmtAgo(t: string | number | Date, lang: 'vi' | 'en') {
  const ms = Date.now() - new Date(t).getTime();
  if (ms < 0 || !Number.isFinite(ms)) return '';
  const m = Math.floor(ms / 60000);
  if (m < 1) return lang === 'vi' ? 'vừa xong' : 'just now';
  if (m < 60) return lang === 'vi' ? `${m} phút trước` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'vi' ? `${h} giờ trước` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return lang === 'vi' ? `${d} ngày trước` : `${d}d ago`;
}

export default function DataStatusChip({
  status, lang = 'vi', source, observedAt, className = '', compact = false,
}: Props) {
  const meta = META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-heading font-bold uppercase tracking-wider ${meta.cls} ${className}`}
      title={[source, observedAt ? new Date(observedAt).toLocaleString() : null].filter(Boolean).join(' · ')}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{lang === 'vi' ? meta.vi : meta.en}</span>
      {!compact && source && <span className="font-body normal-case opacity-80">· {source}</span>}
      {!compact && observedAt && (
        <span className="font-body normal-case opacity-70">· {fmtAgo(observedAt, lang)}</span>
      )}
    </span>
  );
}
