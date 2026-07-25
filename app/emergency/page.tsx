'use client';

import { AppShell } from '@/components/app-shell';
import { EmergencyPage } from '@/components/pages/emergency-page';

export default function Page() {
  return (
    <AppShell>
      <EmergencyPage />
    </AppShell>
  );
}
