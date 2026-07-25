'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  HeartPulse,
  Activity,
  Pill,
  HeartHandshake,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Bell,
  Stethoscope,
  Users,
  Sparkles,
  Languages,
  Moon,
  WifiOff,
} from 'lucide-react';

export function LandingPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  const stats = [
    { icon: Activity, title: t('landing.stat1'), sub: t('landing.stat1Sub') },
    { icon: Users, title: t('landing.stat2'), sub: t('landing.stat2Sub') },
    { icon: QrCode, title: t('landing.stat3'), sub: t('landing.stat3Sub') },
  ];

  const features = [
    { icon: Activity, title: t('landing.f1'), desc: t('landing.f1d') },
    { icon: Pill, title: t('landing.f2'), desc: t('landing.f2d') },
    { icon: HeartPulse, title: t('landing.f3'), desc: t('landing.f3d') },
    { icon: HeartHandshake, title: t('landing.f4'), desc: t('landing.f4d') },
    { icon: QrCode, title: t('landing.f5'), desc: t('landing.f5d') },
    { icon: ShieldCheck, title: t('landing.f6'), desc: t('landing.f6d') },
  ];

  const pills = [
    { icon: Sparkles, label: t('landing.stat1Sub') },
    { icon: Languages, label: t('settings.english') + ' / ' + t('settings.hindi') },
    { icon: Moon, label: t('settings.dark') + ' / ' + t('settings.light') },
    { icon: WifiOff, label: 'Offline sync' },
    { icon: Bell, label: 'Realtime alerts' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md shadow-primary/20">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold tracking-tight">{t('app.name')}</div>
              <div className="text-[10px] text-muted-foreground">{t('app.tagline')}</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href={user ? '/overview' : '/overview'}>{t('landing.learnMore')}</Link>
            </Button>
            <Button asChild>
              <Link href="/overview">
                {user ? t('nav.overview') : t('landing.getStarted')}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Deterministic rule-based · Explainable · No AI guessing
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              {t('landing.hero')}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              {t('landing.heroSub')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-7 text-base">
                <Link href="/overview">
                  {t('landing.getStarted')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
                <Link href="/overview">{t('landing.learnMore')}</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {pills.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground"
                >
                  <p.icon className="h-3.5 w-3.5" />
                  {p.label}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-3">
            {stats.map((s, i) => (
              <Card
                key={i}
                className="glass border-border/60 p-6 text-center shadow-sm"
              >
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-medium">{s.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('landing.features')}
          </h2>
          <p className="mt-3 text-muted-foreground">{t('landing.featuresSub')}</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Card
              key={i}
              className="group relative overflow-hidden border-border/60 p-6 transition-all hover:shadow-lg hover:shadow-black/5"
            >
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-primary/5 transition-transform group-hover:scale-150" />
              <div className="relative">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-medium">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary to-chart-2 p-10 text-center text-white shadow-xl sm:p-16">
          <Stethoscope className="mx-auto mb-4 h-10 w-10 opacity-90" />
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('landing.ctaTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">{t('landing.ctaSub')}</p>
          <Button asChild size="lg" variant="secondary" className="mt-7 h-12 px-8 text-base">
            <Link href="/overview">
              {t('landing.getStarted')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HeartPulse className="h-4 w-4 text-primary" />
            {t('app.name')} · {t('app.tagline')}
          </div>
          <div className="text-xs text-muted-foreground">
            Built for national-level hackathons · Production-ready
          </div>
        </div>
      </footer>
    </div>
  );
}
