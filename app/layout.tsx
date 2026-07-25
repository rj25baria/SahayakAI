import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { AppProviders } from '@/components/app-providers';
import { ThemeBootstrap } from '@/components/theme-bootstrap';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SAHAYAK — Preventive Healthcare Companion',
  description:
    'A preventive healthcare platform for the elderly, chronically ill, and people living alone. Explainable risk scoring, medication adherence, emergency escalation, and a Community Guardian Network.',
  applicationName: 'SAHAYAK',
  authors: [{ name: 'SAHAYAK' }],
  keywords: [
    'healthcare',
    'preventive care',
    'elderly care',
    'medication adherence',
    'emergency SOS',
    'vital monitoring',
  ],
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f8b8d' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1419' },
  ],
  viewport: { width: 'device-width', initialScale: 1 },
  openGraph: {
    title: 'SAHAYAK — Preventive Healthcare Companion',
    description:
      'Explainable risk scoring, medication adherence, a Medical QR Emergency Card, and a Community Guardian Network for those who need care most.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeBootstrap />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <AppProviders>{children}</AppProviders>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
