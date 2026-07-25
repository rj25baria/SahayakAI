'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardShell>{children}</DashboardShell>
    </ProtectedRoute>
  );
}
