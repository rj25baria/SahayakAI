'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground text-center">
      <div className="p-4 rounded-full bg-primary/10 text-primary mb-4">
        <ShieldAlert className="h-10 w-10" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">404 - Page Not Found</h1>
      <p className="text-muted-foreground max-w-md mb-6 text-sm">
        The requested page or resource could not be found. Please return to the main dashboard.
      </p>
      <Link href="/">
        <Button className="font-bold gap-2">
          <Home className="h-4 w-4" /> Go to Sahayak AI Home
        </Button>
      </Link>
    </div>
  );
}
