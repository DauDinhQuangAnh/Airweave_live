import { useState } from 'react';
import { ChevronDown, Info, AlertTriangle } from 'lucide-react';
import DataStatusChip, { type DataStatus } from './DataStatusChip';

export interface CalcSource {
  name: string;        // "WAQI", "Open-Meteo PM2.5", "Mapbox Directions", "Community reports"
  status: DataStatus;
  detail?: string;     // "12 trạm trong bbox", "midpoint sampling 5", ...
  observedAt?: string | number | Date | null;
}

export interface CalcFormula {
  label: string;       // "Average PM2.5"
  expr: string;        // "Σ(PM2.5_i · len_i) / Σ(len_i)"
  note?: string;
}

interface Props {
  lang?: 'vi' | 'en';
  title?: string;
  sources: CalcSource[];
  samplePoints?: number;
  formulas: CalcFormula[];
  confidence?: DataStatus;
  warning?: string;
  defaultOpen?: boolean;
  className?: string;
}

const T = {
  title:       { vi: 'Cách AirWeave tính tuyến sạch', en: 'How AirWeave calculates this' },
  sources:     { vi: 'Nguồn dữ liệu',                 en: 'Data sources' },
  samples:     { vi: 'Số điểm mẫu trên tuyến',         en: 'Route sample points' },
  formulas:    { vi: 'Công thức',                      en: 'Formulas' },
  confidence:  { vi: 'Độ tin cậy tổng thể',            en: 'Overall confidence' },
  warning:     { vi: 'Cảnh báo dữ liệu',               en: 'Data warning' },
  defaultWarn: {
    vi: 'Kết quả phụ thuộc vào độ phủ dữ liệu AQI tại thời điểm truy vấn. Khi không đủ dữ liệu, AirWeave sẽ hiển thị Unavailable hoặc Estimated thay vì tạo số liệu giả.',
    en: 'Results depend on AQI coverage at query time. When data is missing, AirWeave shows Unavailable or Estimated instead of inventing numbers.',
  },
};

export default function CalculationDetailsPanel({
  lang = 'vi', title, sources, samplePoints, formulas, confidence, warning, defaultOpen = false, className = '',
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const head = title ?? T.title[lang];
  const warnText = warning ?? T.defaultWarn[lang];

  return (
    <div className={`rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-sm overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={open}
      >
        <Info className="w-4 h-4 text-primary shrink-0" />
        <span className="flex-1 font-heading text-sm font-bold text-foreground">{head}</span>
        {confidence && <DataStatusChip status={confidence} lang={lang} compact />}
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/60">
          {/* Sources */}
          <section className="pt-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading font-bold mb-2">
              {T.sources[lang]}
            </p>
            <ul className="space-y-1.5">
              {sources.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] font-body text-foreground">
                  <DataStatusChip status={s.status} lang={lang} compact />
                  <div className="min-w-0 flex-1">
                    <span className="font-heading font-semibold">{s.name}</span>
                    {s.detail && <span className="text-muted-foreground"> · {s.detail}</span>}
                    {s.observedAt && (
                      <span className="text-muted-foreground"> · {new Date(s.observedAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {typeof samplePoints === 'number' && (
            <section className="text-[11px] font-body text-foreground">
              <span className="font-heading font-semibold">{T.samples[lang]}: </span>
              <span className="text-primary font-heading font-bold">{samplePoints}</span>
            </section>
          )}

          {/* Formulas */}
          <section>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading font-bold mb-2">
              {T.formulas[lang]}
            </p>
            <div className="space-y-2">
              {formulas.map((f, i) => (
                <div key={i} className="rounded-lg border border-border bg-background/60 p-2.5">
                  <div className="text-[11px] font-heading font-semibold text-foreground">{f.label}</div>
                  <code className="block mt-1 text-[11px] font-mono text-primary break-words">{f.expr}</code>
                  {f.note && <p className="text-[10px] text-muted-foreground font-body mt-1 leading-relaxed">{f.note}</p>}
                </div>
              ))}
            </div>
          </section>

          {/* Warning */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] font-body text-foreground leading-relaxed">
              <span className="font-heading font-bold">{T.warning[lang]}: </span>
              {warnText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
