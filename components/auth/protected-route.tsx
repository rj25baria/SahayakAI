'use client';

import { useAuth } from '@/lib/auth-context';
import { AuthPage } from '@/components/auth/auth-page';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full bg-primary/20" />
      </div>
    );
  }
  if (!user) {
    return <AuthPage />;
  }
  return <>{children}</>;
}
