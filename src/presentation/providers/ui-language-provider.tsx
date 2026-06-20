'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { UI_LANG_STORAGE_KEY, type UiLanguage, type UiStringKey, t as translate } from '@/shared/ui-translations';

type UiLanguageContextValue = {
  language: UiLanguage;
  setLanguage: (lang: UiLanguage) => void;
  t: (key: UiStringKey) => string;
};

const UiLanguageContext = createContext<UiLanguageContextValue | null>(null);

function readStoredLanguage(): UiLanguage {
  if (typeof window === 'undefined') return 'am';
  const stored = localStorage.getItem(UI_LANG_STORAGE_KEY);
  return stored === 'en' ? 'en' : 'am';
}

export function UiLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>('am');

  useEffect(() => {
    setLanguageState(readStoredLanguage());
  }, []);

  const setLanguage = useCallback((lang: UiLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(UI_LANG_STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent('waliya:ui-language', { detail: lang }));
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: UiStringKey) => translate(language, key),
    }),
    [language, setLanguage],
  );

  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>;
}

export function useUiLanguage() {
  const ctx = useContext(UiLanguageContext);
  if (!ctx) throw new Error('useUiLanguage must be used within UiLanguageProvider');
  return ctx;
}
