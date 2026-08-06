import { ReactNode, useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LeftSolutionPanel, { type Benefit } from './LeftSolutionPanel';

interface Props {
  lang?: 'vi' | 'en';
  badge?: string;
  heading: string;
  subheading?: string;
  benefits: Benefit[];
  chips?: string[];
  panelFooter?: ReactNode;
  children: ReactNode;
  /** When true, the layout uses h-full and main area becomes flex-1 (for map-like full-bleed pages). */
  fullHeight?: boolean;
  /** Optional banner above main area (e.g. AQI alert). */
  banner?: ReactNode;
  className?: string;
}

/**
 * FeatureExperienceLayout — Clean 100% full-width layout for all pages.
 * Solution panel is collapsed into a single clean (i) Info icon button with radiating glow animation.
 * Clicking the button displays the solution overview as a floating overlay without pushing any page elements.
 */
export default function FeatureExperienceLayout({
  lang = 'vi',
  badge,
  heading,
  subheading,
  benefits,
  chips,
  panelFooter,
  children,
  fullHeight = false,
  banner,
  className = '',
}: Props) {
  const [openOverlay, setOpenOverlay] = useState(false);

  const panelProps = { lang, badge, heading, subheading, benefits, chips, footer: panelFooter } as const;

  // Close overlay on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenOverlay(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`relative ${fullHeight ? 'h-full min-h-0' : ''} ${className}`}>
      {/* Top Bar inside main content area with Glowing Radiating Info Button */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 z-30">
        <div className="relative group">
          {/* Outer Radiating Light Glow Effect (Hào quang sáng loang) */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 opacity-60 blur-md group-hover:opacity-100 transition duration-500 animate-pulse pointer-events-none" />

          {/* Radiating Ripple Ring (Vòng sóng ánh sáng lan tỏa) */}
          <span className="absolute inset-0 rounded-xl bg-sky-400/40 animate-ping pointer-events-none opacity-75 duration-1000" />

          <button
            type="button"
            onClick={() => setOpenOverlay((prev) => !prev)}
            title={lang === 'vi' ? 'Xem thông tin giải pháp' : 'View solution info'}
            className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#0B1628] via-[#0D1D33] to-[#0F2138] border border-sky-400/60 text-sky-300
              hover:border-sky-300 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-lg shadow-sky-500/25
              flex items-center justify-center shrink-0 z-10"
            aria-expanded={openOverlay}
          >
            <Info className="w-5 h-5 text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          </button>
        </div>
      </div>

      {/* Floating Overlay Modal (Does NOT push or squeeze any main page elements) */}
      <AnimatePresence>
        {openOverlay && (
          <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenOverlay(false)}
              className="absolute inset-0 bg-background/60 backdrop-blur-xs pointer-events-auto"
            />

            {/* Overlay Panel Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute left-4 sm:left-12 top-20 z-50 w-[92vw] max-w-[400px] max-h-[85vh] overflow-y-auto pointer-events-auto shadow-2xl rounded-2xl"
            >
              <div className="relative">
                <LeftSolutionPanel {...panelProps} />
                <button
                  type="button"
                  onClick={() => setOpenOverlay(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                  title={lang === 'vi' ? 'Đóng' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Feature Area (100% full width - Never pushed or squeezed) */}
      <main className={`w-full ${fullHeight ? 'h-full min-h-0 flex flex-col' : ''}`}>
        {banner}
        {children}
      </main>
    </div>
  );
}
