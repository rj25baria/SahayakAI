'use client';

import { createContext, useContext } from 'react';
import type { Language } from '@/lib/types';
import { translations } from '@/lib/i18n';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

interface I18nContextValue {
  language: Language;
  t: Translate;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function makeTranslator(language: Language): Translate {
  const dict = translations[language] ?? translations.en;
  return (key: string, vars?: Record<string, string | number>) => {
    let str = key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, dict) as string | undefined;
    if (typeof str !== 'string') {
      // fall back to english
      str = key.split('.').reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
          return (acc as Record<string, unknown>)[part];
        }
        return undefined;
      }, translations.en) as string | undefined;
    }
    if (typeof str !== 'string') return key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  };
}

export function I18nProvider({
  language,
  children,
}: {
  language: Language;
  children: React.ReactNode;
}) {
  const t = makeTranslator(language);
  return <I18nContext.Provider value={{ language, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
