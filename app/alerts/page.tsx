'use client';

import { AppShell } from '@/components/app-shell';
import { AlertsPage } from '@/components/pages/alerts-page';

export default function Page() {
  return (
    <AppShell>
      <AlertsPage />
    </AppShell>
  );
}
