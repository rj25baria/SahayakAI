'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime error caught in app error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-background">
      <div className="p-4 bg-destructive/10 text-destructive rounded-full mb-4">
        <ShieldAlert className="h-10 w-10" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2">Application Error Handled</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Sahayak AI safely isolated an issue. Your personal health records and background monitors remain protected.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={() => reset()} className="gap-2 font-semibold">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <Home className="h-4 w-4" /> Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
