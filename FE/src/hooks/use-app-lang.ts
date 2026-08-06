import { useOutletContext } from 'react-router-dom';

export function useAppLang(): 'vi' | 'en' {
  try {
    const context = useOutletContext<{ lang?: 'vi' | 'en' }>();
    return context?.lang || 'vi';
  } catch {
    return 'vi';
  }
}
