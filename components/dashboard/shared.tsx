'use client';

import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: typeof import('lucide-react').Activity;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}) {
  const tones: Record<string, string> = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:shadow-md hover:shadow-black/5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</div>
          {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof import('lucide-react').Activity;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function RiskBadge({
  level,
  label,
  className,
}: {
  level: 'normal' | 'elevated' | 'warning' | 'critical';
  label: string;
  className?: string;
}) {
  const map: Record<string, string> = {
    normal: 'bg-success/10 text-success border-success/20',
    elevated: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    critical: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        map[level],
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', {
        'bg-success': level === 'normal',
        'bg-sky-500': level === 'elevated',
        'bg-warning': level === 'warning',
        'bg-destructive': level === 'critical',
      })} />
      {label}
    </span>
  );
}

export function RiskGauge({ score, level, label }: { score: number; level: string; label: string }) {
  const color =
    level === 'critical'
      ? 'hsl(var(--destructive))'
      : level === 'warning'
      ? 'hsl(var(--warning))'
      : level === 'elevated'
      ? 'hsl(199 80% 50%)'
      : 'hsl(var(--success))';
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          strokeWidth="10"
          className="stroke-muted"
        />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          strokeWidth="10"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-semibold tracking-tight">{score}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
