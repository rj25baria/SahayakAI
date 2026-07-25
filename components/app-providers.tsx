'use client';

import { useAuth } from '@/lib/auth-context';
import { I18nProvider } from '@/lib/i18n-context';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const { language } = useAuth();
  return <I18nProvider language={language}>{children}</I18nProvider>;
}
