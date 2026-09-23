import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FlaskConical, X } from 'lucide-react';
import { isDemoMode, disableDemoMode } from '@/lib/demo/demo-mode';
import { tokenStore } from '@/lib/api-client';
import { getStoredLanguage, LANGUAGE_EVENT, type AppLanguage } from '@/lib/language';

/**
 * Dải cảnh báo nhẹ hiển thị khi đang ở chế độ Demo.
 * Dữ liệu lúc này là hardcode/JSON trên FE, không phải dữ liệu thật từ backend.
 * Dùng useLocation để đánh giá lại mỗi khi đổi route (vd. sau khi bấm nút Demo).
 */
export default function DemoModeBanner() {
  useLocation(); // buộc re-render theo điều hướng
  const [lang, setLang] = useState<AppLanguage>(getStoredLanguage);

  useEffect(() => {
    const syncLanguage = (event: Event) => {
      setLang((event as CustomEvent<AppLanguage>).detail ?? getStoredLanguage());
    };
    window.addEventListener(LANGUAGE_EVENT, syncLanguage);
    return () => window.removeEventListener(LANGUAGE_EVENT, syncLanguage);
  }, []);

  if (!isDemoMode()) return null;

  const exitDemo = () => {
    disableDemoMode();
    tokenStore.clear();
    window.location.href = '/auth';
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] pointer-events-none flex justify-center px-3 pb-3">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-300/60 bg-amber-50/95 px-4 py-2 text-amber-900 shadow-lg backdrop-blur dark:border-amber-500/40 dark:bg-amber-950/90 dark:text-amber-100">
        <FlaskConical className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium sm:text-sm">
          {lang === 'vi' ? <><span>Bạn đang xem </span><strong>dữ liệu demo</strong><span> — không phải dữ liệu thật.</span></> : <><span>You are viewing </span><strong>demo data</strong><span> — not real-world data.</span></>}
        </span>
        <button
          type="button"
          onClick={exitDemo}
          className="ml-1 flex items-center gap-1 rounded-full bg-amber-200/70 px-2.5 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-300/80 dark:bg-amber-800/60 dark:text-amber-50 dark:hover:bg-amber-700/70"
        >
          <X className="h-3 w-3" />
          {lang === 'vi' ? 'Thoát demo' : 'Exit demo'}
        </button>
      </div>
    </div>
  );
}
