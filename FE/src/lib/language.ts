export type AppLanguage = 'vi' | 'en';

const LANGUAGE_KEY = 'airweave-language';
export const LANGUAGE_EVENT = 'airweave:language-change';

export function getStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'vi';
  return window.localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'vi';
}

export function persistLanguage(lang: AppLanguage) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUAGE_KEY, lang);
  document.documentElement.lang = lang;
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: lang }));
}
