import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { AppProviders } from '@/components/app-providers';
import { ThemeBootstrap } from '@/components/theme-bootstrap';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SAHAYAK — Enterprise Preventive Healthcare & Emergency Platform',
  description:
    'AI-powered preventive healthcare platform with explainable clinical triage, vital tracking, emergency SOS mesh network, and Medical Emergency QR cards.',
  applicationName: 'SAHAYAK',
  authors: [{ name: 'SAHAYAK' }],
  keywords: [
    'healthcare',
    'preventive care',
    'elderly care',
    'medication adherence',
    'emergency SOS',
    'vital monitoring',
    'AI triage',
  ],
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f8b8d' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1419' },
  ],
  viewport: { width: 'device-width', initialScale: 1 },
  openGraph: {
    title: 'SAHAYAK — Enterprise Preventive Healthcare Platform',
    description:
      'Explainable AI clinical triage, medication adherence, Medical Emergency QR Card, and Community Guardian Network.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeBootstrap />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-background text-foreground`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <ErrorBoundary>
          <AuthProvider>
            <AppProviders>
              <div id="main-content">{children}</div>
            </AppProviders>
          </AuthProvider>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
