import { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface Benefit {
  title: string;
  text: string;
  icon?: ReactNode;
}

interface LeftSolutionPanelProps {
  lang?: 'vi' | 'en';
  badge?: string;
  heading: string;
  subheading?: string;
  benefits: Benefit[];
  chips?: string[];
  footer?: ReactNode;
  className?: string;
}

/**
 * LeftSolutionPanel — pinned "Giải pháp" intro for a Feature Experience page.
 * Dark navy + cyan accents per the FeatureExperience design tokens.
 */
export default function LeftSolutionPanel({
  lang = 'vi', badge, heading, subheading, benefits, chips = [], footer, className = '',
}: LeftSolutionPanelProps) {
  const badgeText = badge ?? (lang === 'vi' ? 'Giải pháp' : 'Solution');

  return (
    <aside
      className={`relative overflow-hidden rounded-2xl border border-sky-500/20
        bg-gradient-to-br from-[#07111F] via-[#0B1628] to-[#0F2138]
        text-slate-100 p-5 sm:p-6 shadow-lg shadow-sky-500/5 ${className}`}
    >
      {/* glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30
          text-[10px] font-heading font-bold uppercase tracking-[0.18em] text-sky-300">
          {badgeText}
        </span>

        <h2 className="mt-3 font-heading text-2xl sm:text-[26px] font-black leading-tight text-slate-50">
          {heading}
        </h2>
        {subheading && (
          <p className="mt-1 text-sm font-body text-slate-300/90 leading-relaxed">{subheading}</p>
        )}

        <div className="mt-5 space-y-3">
          {benefits.map((b, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="mt-0.5 shrink-0 w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sky-300">
                {b.icon ?? <CheckCircle2 className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="font-heading text-[13px] font-bold text-slate-100">{b.title}</div>
                <p className="text-[12px] font-body text-slate-300/85 leading-relaxed">{b.text}</p>
              </div>
            </div>
          ))}
        </div>

        {chips.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded-full bg-slate-100/5 border border-slate-100/10
                  text-[11px] font-heading font-semibold text-slate-200"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {footer && <div className="mt-5">{footer}</div>}
      </div>
    </aside>
  );
}
