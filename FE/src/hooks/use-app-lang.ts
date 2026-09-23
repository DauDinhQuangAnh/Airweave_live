import { useOutletContext } from 'react-router-dom';
import { getStoredLanguage } from '@/lib/language';

export function useAppLang(): 'vi' | 'en' {
  try {
    const context = useOutletContext<{ lang?: 'vi' | 'en' }>();
    return context?.lang || getStoredLanguage();
  } catch {
    return getStoredLanguage();
  }
}
