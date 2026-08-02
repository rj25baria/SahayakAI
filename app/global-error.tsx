'use client';

import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="p-4 bg-red-500/20 text-red-400 rounded-full mb-4 border border-red-500/30">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-extrabold mb-2">Critical Application Error</h1>
        <p className="text-slate-400 max-w-md mb-6 text-sm">
          A system-level error occurred. Click below to reset the application runtime state.
        </p>
        <Button onClick={() => reset()} className="bg-red-600 hover:bg-red-500 text-white gap-2">
          <RefreshCw className="h-4 w-4" /> Reset Application
        </Button>
      </body>
    </html>
  );
}
