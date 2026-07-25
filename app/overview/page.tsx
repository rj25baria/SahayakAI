'use client';

import { AppShell } from '@/components/app-shell';
import { OverviewPage } from '@/components/pages/overview-page';

export default function Page() {
  return (
    <AppShell>
      <OverviewPage />
    </AppShell>
  );
}
