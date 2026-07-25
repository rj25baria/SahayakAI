'use client';

import { AppShell } from '@/components/app-shell';
import { VitalsPage } from '@/components/pages/vitals-page';

export default function Page() {
  return (
    <AppShell>
      <VitalsPage />
    </AppShell>
  );
}
