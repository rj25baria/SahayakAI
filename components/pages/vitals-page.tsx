'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { useVitals } from '@/lib/hooks';
import { PageHeader, StatCard, EmptyState, RiskBadge } from '@/components/dashboard/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Activity, HeartPulse, Thermometer, Droplet, Gauge, Weight, Plus, Zap, Bluetooth, BluetoothConnected, Loader2, AlertTriangle,
} from 'lucide-react';
import { evaluateVitals, riskLevelLabel } from '@/lib/risk-engine';
import { logAudit } from '@/lib/audit';
import { loadDB, saveDB, insertRow } from '@/lib/store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { VitalReading } from '@/lib/types';
import { cn } from '@/lib/utils';

const VITAL_TILES = [
  { key: 'heart_rate', icon: HeartPulse, unitKey: 'vitals.heartRateUnit', labelKey: 'vitals.heartRate' },
  { key: 'spo2', icon: Activity, unitKey: 'vitals.spo2Unit', labelKey: 'vitals.spo2' },
  { key: 'systolic_bp', icon: Gauge, unitKey: 'vitals.bpUnit', labelKey: 'vitals.bloodPressure' },
  { key: 'temperature', icon: Thermometer, unitKey: 'vitals.tempUnit', labelKey: 'vitals.temperature' },
  { key: 'glucose', icon: Droplet, unitKey: 'vitals.glucoseUnit', labelKey: 'vitals.glucose' },
  { key: 'bmi', icon: Weight, unitKey: '', labelKey: 'vitals.bmi' },
] as const;

export function VitalsPage() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { vitals, refresh } = useVitals();
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [form, setForm] = useState({
    heart_rate: '',
    spo2: '',
    systolic_bp: '',
    diastolic_bp: '',
    temperature: '',
    glucose: '',
    weight: '',
    height: '',
  });

  const latest = vitals[0];

  const persist = async (values: Record<string, number | null>, source: 'manual' | 'simulation' | 'vitalscan') => {
    if (!user) return;
    const { score, level, factors } = evaluateVitals(values);
    const db = loadDB();
    const payload = {
      user_id: user.id,
      notes: '',
      ...values,
      source,
      risk_score: score,
      risk_level: level,
      risk_factors: factors,
      recorded_at: new Date().toISOString(),
    };
    const data = insertRow('vitals', db, payload) as VitalReading;
    if (factors.length > 0) {
      for (const f of factors) {
        insertRow('alerts', db, {
          user_id: user.id,
          type: `vital_${f.metric}`,
          severity: f.severity,
          title: `${f.metric.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())} alert`,
          message: f.message,
          explanation: `Measured ${f.value} (threshold ${f.threshold}). Rule fired: ${f.message}`,
          metric: f.metric,
          metric_value: parseFloat(f.value) || null,
          threshold: f.threshold,
          dismissed: false,
          escalated: false,
          source: 'rule_engine',
        });
      }
    }
    saveDB(db);
    await logAudit(user.id, 'vitals.recorded', { source, risk_level: level, risk_score: score }, level === 'critical' ? 'critical' : 'info');
    toast.success(level === 'normal' ? t('vitals.noAlerts') : `${factors.length} ${t('vitals.ruleAlerts').toLowerCase()}`);
    refresh();
    return data;
  };

  const handleManual = async () => {
    const num = (s: string) => (s.trim() === '' ? null : parseFloat(s));
    const w = num(form.weight);
    const h = num(form.height);
    const bmi = w && h ? Math.round((w / Math.pow(h / 100, 2)) * 10) / 10 : null;
    const values = {
      heart_rate: num(form.heart_rate),
      spo2: num(form.spo2),
      systolic_bp: num(form.systolic_bp),
      diastolic_bp: num(form.diastolic_bp),
      temperature: num(form.temperature),
      glucose: num(form.glucose),
      bmi,
      weight: w,
      height: h,
    };
    await persist(values, 'manual');
    setOpen(false);
    setForm({ heart_rate: '', spo2: '', systolic_bp: '', diastolic_bp: '', temperature: '', glucose: '', weight: '', height: '' });
  };

  const handleSimulate = async () => {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 1800));
    // Deterministic simulated VitalScan reading with occasional anomalies
    const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
    const anomaly = Math.random() < 0.35;
    const values = {
      heart_rate: anomaly && Math.random() < 0.5 ? rand(45, 50) : rand(64, 82),
      spo2: anomaly && Math.random() < 0.3 ? rand(86, 91) : rand(96, 99),
      systolic_bp: anomaly ? rand(185, 195) : rand(110, 130),
      diastolic_bp: anomaly ? rand(95, 110) : rand(70, 85),
      temperature: Math.round((anomaly && Math.random() < 0.3 ? 39.6 : 36.5 + Math.random()) * 10) / 10,
      glucose: anomaly && Math.random() < 0.3 ? rand(260, 290) : rand(85, 130),
      bmi: null,
      weight: null,
      height: null,
    };
    await persist(values, 'simulation');
    setScanning(false);
  };

  const connectDevice = async () => {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 1400));
    setConnected(true);
    setScanning(false);
    toast.success(t('vitals.deviceConnected'));
  };

  const trendData = vitals.slice(0, 14).reverse();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('vitals.title')}
        subtitle={t('vitals.subtitle')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => (connected ? handleSimulate() : connectDevice())} disabled={scanning}>
              {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : connected ? <BluetoothConnected className="mr-2 h-4 w-4 text-success" /> : <Bluetooth className="mr-2 h-4 w-4" />}
              {scanning ? t('vitals.scanning') : connected ? t('vitals.simulateScan') : t('vitals.connectDevice')}
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t('vitals.recordReading')}
            </Button>
          </div>
        }
      />

      {/* Latest vitals grid */}
      {latest ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VITAL_TILES.map((tile) => {
            const val = (latest as unknown as Record<string, number | null>)[tile.key];
            const isBp = tile.key === 'systolic_bp';
            const display = isBp && latest.systolic_bp && latest.diastolic_bp ? `${latest.systolic_bp}/${latest.diastolic_bp}` : val;
            return (
              <Card key={tile.key} className="p-5 transition-all hover:shadow-md hover:shadow-black/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <tile.icon className="h-4 w-4" />
                    {t(tile.labelKey)}
                  </div>
                  {connected && tile.key === 'heart_rate' && (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> {t('common.live')}
                    </span>
                  )}
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-tight">
                  {display ?? '—'}
                  {display != null && tile.unitKey && (
                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">{t(tile.unitKey)}</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Activity}
          title={t('common.noData')}
          description={t('vitals.subtitle')}
          action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />{t('vitals.recordReading')}</Button>}
        />
      )}

      {/* Risk assessment */}
      {latest && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">{t('vitals.riskAssessment')}</h2>
            <RiskBadge level={latest.risk_level} label={riskLevelLabel(latest.risk_level, t)} />
          </div>
          {latest.risk_factors.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-success/5 px-4 py-3 text-sm text-success">
              <Zap className="h-4 w-4" /> {t('vitals.noFactors')}
            </div>
          ) : (
            <div className="space-y-2">
              {latest.risk_factors.map((f, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg border px-4 py-3',
                    f.severity === 'critical' ? 'border-destructive/20 bg-destructive/5' : f.severity === 'warning' ? 'border-warning/20 bg-warning/5' : 'border-border/50 bg-muted/30'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', f.severity === 'critical' ? 'text-destructive' : 'text-warning')} />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{f.message}</span>
                        <Badge variant="outline" className="text-[10px]">{f.metric}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t('alerts.value')}: <span className="font-medium text-foreground">{f.value}</span> · {t('alerts.threshold')}: {f.threshold}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 text-xs text-muted-foreground">
            {t('vitals.recorded', { time: format(new Date(latest.recorded_at), 'MMM d, h:mm a') })} · {t('vitals.source')}: {latest.source}
          </div>
        </Card>
      )}

      {/* Trends */}
      {trendData.length > 1 && (
        <Card className="p-5">
          <h2 className="mb-4 font-medium">{t('vitals.trends')} · {t('vitals.last7days')}</h2>
          <TrendChart data={trendData} t={t} />
        </Card>
      )}

      {/* History */}
      <Card className="p-5">
        <h2 className="mb-4 font-medium">{t('vitals.history')}</h2>
        {vitals.length === 0 ? (
          <EmptyState icon={Activity} title={t('common.noData')} />
        ) : (
          <div className="space-y-2">
            {vitals.slice(0, 10).map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
                <RiskBadge level={v.risk_level} label={riskLevelLabel(v.risk_level, t)} />
                <div className="min-w-0 flex-1 text-sm">
                  <span className="text-muted-foreground">HR {v.heart_rate ?? '—'} · SpO₂ {v.spo2 ?? '—'} · BP {v.systolic_bp ?? '—'}/{v.diastolic_bp ?? '—'}</span>
                </div>
                <div className="text-xs text-muted-foreground">{format(new Date(v.recorded_at), 'MMM d, h:mm a')}</div>
                <Badge variant="outline" className="capitalize text-[10px]">{v.source}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Manual entry dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('vitals.recordReading')}</DialogTitle>
            <DialogDescription>{t('vitals.subtitle')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('vitals.heartRate')} unit={t('vitals.heartRateUnit')}>
              <Input type="number" value={form.heart_rate} onChange={(e) => setForm({ ...form, heart_rate: e.target.value })} />
            </Field>
            <Field label={t('vitals.spo2')} unit={t('vitals.spo2Unit')}>
              <Input type="number" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} />
            </Field>
            <Field label="Systolic BP" unit={t('vitals.bpUnit')}>
              <Input type="number" value={form.systolic_bp} onChange={(e) => setForm({ ...form, systolic_bp: e.target.value })} />
            </Field>
            <Field label="Diastolic BP" unit={t('vitals.bpUnit')}>
              <Input type="number" value={form.diastolic_bp} onChange={(e) => setForm({ ...form, diastolic_bp: e.target.value })} />
            </Field>
            <Field label={t('vitals.temperature')} unit={t('vitals.tempUnit')}>
              <Input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
            </Field>
            <Field label={t('vitals.glucose')} unit={t('vitals.glucoseUnit')}>
              <Input type="number" value={form.glucose} onChange={(e) => setForm({ ...form, glucose: e.target.value })} />
            </Field>
            <Field label="Weight" unit="kg">
              <Input type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            </Field>
            <Field label="Height" unit="cm">
              <Input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleManual}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, unit, children }: { label: string; unit: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}{unit && <span className="ml-1 text-muted-foreground">({unit})</span>}</Label>
      {children}
    </div>
  );
}

function TrendChart({ data, t }: { data: VitalReading[]; t: (k: string) => string }) {
  const maxHr = Math.max(120, ...data.map((d) => d.heart_rate ?? 0));
  const minHr = Math.min(50, ...data.map((d) => d.heart_rate ?? 100));
  const width = 700;
  const height = 160;
  const px = (i: number) => 30 + (i / Math.max(1, data.length - 1)) * (width - 60);
  const py = (v: number | null, lo: number, hi: number) => (v == null ? null : 20 + (1 - (v - lo) / (hi - lo)) * (height - 40));
  const hrPoints = data.map((d, i) => [px(i), py(d.heart_rate, minHr, maxHr)] as const).filter((p): p is [number, number] => p[1] != null);
  const spo2Points = data.map((d, i) => [px(i), py(d.spo2, 85, 100)] as const).filter((p): p is [number, number] => p[1] != null);
  const toPath = (pts: [number, number][]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full min-w-[600px]">
        <line x1="30" y1="20" x2={width - 30} y2="20" className="stroke-border" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="30" y1={height - 20} x2={width - 30} y2={height - 20} className="stroke-border" strokeWidth="1" />
        <path d={toPath(hrPoints)} fill="none" className="stroke-chart-1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={toPath(spo2Points)} fill="none" className="stroke-chart-2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {hrPoints.map(([x, y], i) => <circle key={`h${i}`} cx={x} cy={y} r="3" className="fill-chart-1" />)}
        {spo2Points.map(([x, y], i) => <circle key={`s${i}`} cx={x} cy={y} r="3" className="fill-chart-2" />)}
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chart-1" /> {t('vitals.heartRate')}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chart-2" /> {t('vitals.spo2')}</span>
      </div>
    </div>
  );
}
