'use client';

import { AppShell } from '@/components/app-shell';
import { MedicationsPage } from '@/components/pages/medications-page';

export default function Page() {
  return (
    <AppShell>
      <MedicationsPage />
    </AppShell>
  );
}
