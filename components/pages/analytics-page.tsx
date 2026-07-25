'use client';

import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { useVitals, useAlerts, useMedications, useWellness } from '@/lib/hooks';
import { PageHeader, StatCard, EmptyState } from '@/components/dashboard/shared';
import { Card } from '@/components/ui/card';
import { Activity, Bell, Pill, HeartPulse, BarChart3 } from 'lucide-react';
import { format, parseISO, subDays, eachDayOfInterval } from 'date-fns';
import type { RiskLevel } from '@/lib/types';

export function AnalyticsPage() {
  const { t } = useI18n();
  const { vitals } = useVitals();
  const { alerts } = useAlerts();
  const { meds, logs } = useMedications();
  const { checkins } = useWellness();

  const last30 = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });

  const vitalsByDay = useMemo(() => {
    const map = new Map<string, { hr: number[]; spo2: number[]; score: number[] }>();
    for (const v of vitals) {
      const day = format(parseISO(v.recorded_at), 'yyyy-MM-dd');
      if (!map.has(day)) map.set(day, { hr: [], spo2: [], score: [] });
      const e = map.get(day)!;
      if (v.heart_rate != null) e.hr.push(v.heart_rate);
      if (v.spo2 != null) e.spo2.push(v.spo2);
      e.score.push(v.risk_score);
    }
    return last30.map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      const e = map.get(key);
      const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
      return {
        date: format(d, 'MMM d'),
        hr: avg(e?.hr ?? []),
        spo2: avg(e?.spo2 ?? []),
        risk: avg(e?.score ?? []),
      };
    });
  }, [vitals, last30]);

  const adherenceByDay = useMemo(() => {
    const map = new Map<string, { taken: number; total: number }>();
    for (const l of logs) {
      const day = format(parseISO(l.scheduled_time), 'yyyy-MM-dd');
      if (!map.has(day)) map.set(day, { taken: 0, total: 0 });
      const e = map.get(day)!;
      e.total++;
      if (l.status === 'taken') e.taken++;
    }
    return last30.map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      const e = map.get(key);
      return {
        date: format(d, 'MMM d'),
        adherence: e ? Math.round((e.taken / e.total) * 100) : null,
      };
    });
  }, [logs, last30]);

  const riskDistribution = useMemo(() => {
    const counts: Record<RiskLevel, number> = { normal: 0, elevated: 0, warning: 0, critical: 0 };
    for (const v of vitals) counts[v.risk_level]++;
    return counts;
  }, [vitals]);

  const alertsByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of alerts) map.set(a.type, (map.get(a.type) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [alerts]);

  const avgRisk = vitals.length > 0 ? Math.round(vitals.reduce((a, v) => a + v.risk_score, 0) / vitals.length) : 0;
  const adherence30 = useMemo(() => {
    const since = subDays(new Date(), 30);
    const recent = logs.filter((l) => parseISO(l.scheduled_time) >= since);
    const taken = recent.filter((l) => l.status === 'taken').length;
    return recent.length > 0 ? Math.round((taken / recent.length) * 100) : 0;
  }, [logs]);

  const checkinStreak = useMemo(() => {
    let streak = 0;
    const seen = new Set(checkins.map((c) => format(parseISO(c.recorded_at), 'yyyy-MM-dd')));
    for (let i = 0; i < 30; i++) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (seen.has(day)) streak++;
      else break;
    }
    return streak;
  }, [checkins]);

  const hasData = vitals.length > 0 || alerts.length > 0 || logs.length > 0 || checkins.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title={t('analytics.title')} subtitle={t('analytics.subtitle')} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('analytics.avgRisk')} value={avgRisk} sub={t('analytics.last30days')} icon={Activity} tone={avgRisk >= 30 ? 'warning' : 'success'} />
        <StatCard label={t('analytics.totalAlerts')} value={alerts.length} sub={t('analytics.last30days')} icon={Bell} tone={alerts.length > 10 ? 'warning' : 'default'} />
        <StatCard label={t('analytics.adherenceRate')} value={`${adherence30}%`} sub={t('analytics.last30days')} icon={Pill} tone={adherence30 >= 80 ? 'success' : 'warning'} />
        <StatCard label={t('analytics.checkinStreak')} value={`${checkinStreak}d`} sub={t('common.today')} icon={HeartPulse} tone="primary" />
      </div>

      {!hasData ? (
        <EmptyState icon={BarChart3} title={t('common.noData')} description={t('analytics.subtitle')} />
      ) : (
        <>
          {/* Vitals trend */}
          <Card className="p-5">
            <h2 className="mb-4 font-medium">{t('analytics.vitalsTrend')} · {t('analytics.last30days')}</h2>
            <LineChart data={vitalsByDay} keys={['hr', 'spo2']} labels={[t('vitals.heartRate'), t('vitals.spo2')]} colors={['hsl(var(--chart-1))', 'hsl(var(--chart-2))']} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Adherence trend */}
            <Card className="p-5">
              <h2 className="mb-4 font-medium">{t('analytics.adherenceTrend')}</h2>
              <BarChartMini data={adherenceByDay} dataKey="adherence" color="hsl(var(--chart-4))" />
            </Card>

            {/* Risk distribution */}
            <Card className="p-5">
              <h2 className="mb-4 font-medium">{t('analytics.riskDistribution')}</h2>
              <div className="space-y-3">
                {(['normal', 'elevated', 'warning', 'critical'] as RiskLevel[]).map((lvl) => {
                  const count = riskDistribution[lvl];
                  const pct = vitals.length > 0 ? (count / vitals.length) * 100 : 0;
                  const color = lvl === 'critical' ? 'hsl(var(--destructive))' : lvl === 'warning' ? 'hsl(var(--warning))' : lvl === 'elevated' ? 'hsl(199 80% 50%)' : 'hsl(var(--success))';
                  return (
                    <div key={lvl}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="capitalize">{lvl}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Alerts by type */}
          {alertsByType.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-4 font-medium">{t('analytics.alertsByType')}</h2>
              <div className="space-y-2">
                {alertsByType.map(([type, count]) => {
                  const max = alertsByType[0][1];
                  const pct = (count / max) * 100;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className="w-32 truncate text-xs capitalize text-muted-foreground">{type.replace(/_/g, ' ')}</div>
                      <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                        <div className="flex h-full items-center rounded-md bg-primary/70 px-2 text-[10px] font-medium text-white transition-all" style={{ width: `${pct}%` }}>{count}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function LineChart({ data, keys, labels, colors }: { data: Record<string, string | number | null>[]; keys: string[]; labels: string[]; colors: string[] }) {
  const width = 760;
  const height = 200;
  const allVals = data.flatMap((d) => keys.map((k) => d[k])).filter((v): v is number => v != null);
  if (allVals.length === 0) return <EmptyState icon={Activity} title="No data" />;
  const min = Math.min(...allVals) * 0.95;
  const max = Math.max(...allVals) * 1.05;
  const px = (i: number) => 40 + (i / Math.max(1, data.length - 1)) * (width - 80);
  const py = (v: number) => 20 + (1 - (v - min) / (max - min)) * (height - 40);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full min-w-[680px]">
        <line x1="40" y1="20" x2={width - 40} y2="20" className="stroke-border" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1={height - 20} x2={width - 40} y2={height - 20} className="stroke-border" strokeWidth="1" />
        {keys.map((key, ki) => {
          const points = data.map((d, i) => [px(i), d[key] != null ? py(d[key] as number) : null] as const).filter((p): p is [number, number] => p[1] != null);
          const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
          return (
            <g key={key}>
              <path d={path} fill="none" stroke={colors[ki]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {points.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill={colors[ki]} />)}
            </g>
          );
        })}
        <text x="40" y="14" className="fill-muted-foreground text-[10px]">{Math.round(max)}</text>
        <text x="40" y={height - 6} className="fill-muted-foreground text-[10px]">{Math.round(min)}</text>
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        {labels.map((l, i) => <span key={i} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: colors[i] }} /> {l}</span>)}
      </div>
    </div>
  );
}

function BarChartMini({ data, dataKey, color }: { data: Record<string, string | number | null>[]; dataKey: string; color: string }) {
  const vals = data.map((d) => d[dataKey]).filter((v): v is number => v != null);
  if (vals.length === 0) return <EmptyState icon={Pill} title="No data" />;
  const max = 100;
  return (
    <div className="flex h-40 items-end gap-1">
      {data.map((d, i) => {
        const v = d[dataKey] as number | null;
        const h = v != null ? (v / max) * 100 : 0;
        return (
          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end" title={d.date as string}>
            <div className="w-full rounded-t transition-all hover:opacity-80" style={{ height: `${h}%`, background: color, minHeight: v != null ? '2px' : 0 }} />
          </div>
        );
      })}
    </div>
  );
}
