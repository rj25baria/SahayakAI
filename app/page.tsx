'use client';

import { useAuth } from '@/lib/auth-context';
import { LandingPage } from '@/components/landing/landing-page';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { OverviewPage } from '@/components/pages/overview-page';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full bg-primary/20" />
      </div>
    );
  }

  if (!user) return <LandingPage />;

  return (
    <ProtectedRoute>
      <DashboardShell>
        <OverviewPage />
      </DashboardShell>
    </ProtectedRoute>
  );
}
