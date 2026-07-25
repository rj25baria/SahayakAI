'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { useVitals, useAlerts, useMedications, useWellness, useGuardians, useEmergencies } from '@/lib/hooks';
import { loadDB } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RiskBadge, RiskGauge, StatCard, EmptyState } from '@/components/dashboard/shared';
import {
  Activity,
  Bell,
  Pill,
  Users,
  HeartPulse,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Stethoscope,
  Siren,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { riskLevelLabel } from '@/lib/risk-engine';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Profile, Role } from '@/lib/types';

export function OverviewPage() {
  const { profile, user } = useAuth();
  const role: Role = profile?.role ?? 'patient';
  if (role === 'guardian') return <GuardianOverview />;
  if (role === 'doctor') return <DoctorOverview />;
  return <PatientOverview />;
}

/* ========================= PATIENT VIEW ========================= */

function PatientOverview() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const { vitals } = useVitals();
  const { alerts } = useAlerts();
  const { meds, logs } = useMedications();
  const { checkins } = useWellness();
  const { guardians } = useGuardians();
  const latest = vitals[0];
  const activeAlerts = alerts.filter((a) => !a.dismissed);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = logs.filter((l) => format(new Date(l.scheduled_time), 'yyyy-MM-dd') === todayStr);
  const takenToday = todayLogs.filter((l) => l.status === 'taken').length;
  const totalToday = todayLogs.length;
  const adherence = totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : 100;
  const acceptedGuardians = guardians.filter((g) => g.status === 'accepted').length;
  const latestWellness = checkins[0];

  const nextDose = useMemo(() => {
    const now = new Date();
    for (const log of todayLogs) {
      if (log.status === 'pending') {
        const time = new Date(log.scheduled_time);
        if (time >= now) return log;
      }
    }
    return null;
  }, [todayLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('overview.welcome', { name: profile?.full_name?.split(' ')[0] || '' })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('overview.title')}</p>
      </div>

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-5">
          <RiskGauge
            score={latest?.risk_score ?? 0}
            level={latest?.risk_level ?? 'normal'}
            label={riskLevelLabel(latest?.risk_level ?? 'normal', t)}
          />
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">{t('overview.riskScore')}</div>
            <div className="mt-1">
              <RiskBadge level={latest?.risk_level ?? 'normal'} label={riskLevelLabel(latest?.risk_level ?? 'normal', t)} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {latest ? format(new Date(latest.recorded_at), 'MMM d, h:mm a') : t('common.noData')}
            </div>
          </div>
        </Card>

        <StatCard
          label={t('overview.activeAlerts')}
          value={activeAlerts.length}
          sub={activeAlerts.some((a) => a.severity === 'critical') ? t('risk.critical') : t('overview.noAlerts')}
          icon={Bell}
          tone={activeAlerts.length > 0 ? 'destructive' : 'success'}
        />
        <StatCard
          label={t('overview.medAdherence')}
          value={`${adherence}%`}
          sub={`${takenToday}/${totalToday} ${t('meds.taken').toLowerCase()}`}
          icon={Pill}
          tone={adherence >= 80 ? 'success' : adherence >= 50 ? 'warning' : 'destructive'}
        />
        <StatCard
          label={t('overview.guardianNetwork')}
          value={acceptedGuardians}
          sub={t('nav.guardians')}
          icon={Users}
          tone="primary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's medications */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">{t('overview.todaySchedule')}</h2>
            <Link href="/medications">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                {t('overview.viewAll')} <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {totalToday === 0 ? (
            <EmptyState icon={Pill} title={t('overview.noneScheduled')} />
          ) : (
            <div className="space-y-2">
              {todayLogs.slice(0, 6).map((log) => {
                const med = meds.find((m) => m.id === log.medication_id);
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5"
                  >
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: med?.color ?? 'hsl(var(--primary))' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{med?.name ?? 'Medication'}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.scheduled_time), 'h:mm a')} · {med?.dosage}
                      </div>
                    </div>
                    {log.status === 'taken' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t('meds.taken')}
                      </span>
                    ) : log.status === 'skipped' || log.status === 'missed' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" /> {t(`meds.${log.status}`)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {t('meds.pending')}
                      </span>
                    )}
                  </div>
                );
              })}
              {nextDose && (
                <div className="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
                  {t('overview.nextDose')}: {format(new Date(nextDose.scheduled_time), 'h:mm a')}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Recent alerts */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">{t('overview.recentAlerts')}</h2>
            <Link href="/alerts">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                {t('overview.viewAll')} <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {activeAlerts.length === 0 ? (
            <EmptyState icon={Bell} title={t('overview.noAlerts')} />
          ) : (
            <div className="space-y-2">
              {activeAlerts.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    'rounded-lg border px-3 py-2.5',
                    a.severity === 'critical'
                      ? 'border-destructive/20 bg-destructive/5'
                      : a.severity === 'warning'
                      ? 'border-warning/20 bg-warning/5'
                      : 'border-border/50 bg-muted/30'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={cn(
                        'mt-0.5 h-3.5 w-3.5 shrink-0',
                        a.severity === 'critical'
                          ? 'text-destructive'
                          : a.severity === 'warning'
                          ? 'text-warning'
                          : 'text-sky-500'
                      )}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(a.created_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Latest vitals + wellness */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">{t('overview.lastVitals')}</h2>
            <Link href="/vitals">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                {t('overview.viewAll')} <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {latest ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <VitalMini label={t('vitals.heartRate')} value={latest.heart_rate} unit={t('vitals.heartRateUnit')} />
              <VitalMini label={t('vitals.spo2')} value={latest.spo2} unit={t('vitals.spo2Unit')} />
              <VitalMini
                label={t('vitals.bloodPressure')}
                value={latest.systolic_bp && latest.diastolic_bp ? `${latest.systolic_bp}/${latest.diastolic_bp}` : null}
                unit={t('vitals.bpUnit')}
              />
              <VitalMini label={t('vitals.temperature')} value={latest.temperature} unit={t('vitals.tempUnit')} />
              <VitalMini label={t('vitals.glucose')} value={latest.glucose} unit={t('vitals.glucoseUnit')} />
              <VitalMini label={t('vitals.bmi')} value={latest.bmi} unit="" />
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title={t('common.noData')}
              description={t('vitals.subtitle')}
              action={
                <Link href="/vitals">
                  <Button size="sm" variant="outline">{t('vitals.recordReading')}</Button>
                </Link>
              }
            />
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">{t('overview.wellnessToday')}</h2>
            <Link href="/wellness">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                {t('overview.viewAll')} <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {latestWellness ? (
            <div className="flex items-center gap-4">
              <RiskGauge
                score={latestWellness.score}
                level={latestWellness.risk_level}
                label={t('wellness.score')}
              />
              <div className="flex-1 space-y-2 text-sm">
                <WellnessRow label={t('wellness.mood')} value={`${latestWellness.mood}/5`} />
                <WellnessRow label={t('wellness.pain')} value={`${latestWellness.pain_level}/10`} />
                <WellnessRow label={t('wellness.sleep')} value={`${latestWellness.sleep_hours ?? '—'} h`} />
                <WellnessRow label={t('wellness.energy')} value={`${latestWellness.energy}/5`} />
              </div>
            </div>
          ) : (
            <EmptyState
              icon={HeartPulse}
              title={t('overview.notChecked')}
              action={
                <Link href="/wellness">
                  <Button size="sm">{t('overview.checkIn')}</Button>
                </Link>
              }
            />
          )}
        </Card>
      </div>
    </div>
  );
}

/* ========================= GUARDIAN VIEW ========================= */

interface WardSummary {
  profile: Profile;
  latestVital?: { risk_score: number; risk_level: import('@/lib/types').RiskLevel; recorded_at: string; heart_rate?: number; spo2?: number; systolic_bp?: number | null; diastolic_bp?: number | null };
  activeAlerts: number;
  criticalAlerts: number;
  todayTotal: number;
  todayTaken: number;
  lastCheckin?: { score: number; mood: number; pain_level: number; recorded_at: string };
}

function useWardSummaries(userIds: string[]): WardSummary[] {
  const db = loadDB();
  return userIds
    .map((id) => {
      const profile = db.profiles.find((p) => p.id === id);
      if (!profile) return null;
      const vitals = db.vitals.filter((v) => v.user_id === id).sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      const alerts = db.alerts.filter((a) => a.user_id === id && !a.dismissed);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const logs = db.medication_logs.filter((l) => l.user_id === id && format(new Date(l.scheduled_time), 'yyyy-MM-dd') === todayStr);
      const checkins = db.wellness_checkins.filter((w) => w.user_id === id).sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      return {
        profile,
        latestVital: vitals[0],
        activeAlerts: alerts.length,
        criticalAlerts: alerts.filter((a) => a.severity === 'critical' || a.severity === 'warning').length,
        todayTotal: logs.length,
        todayTaken: logs.filter((l) => l.status === 'taken').length,
        lastCheckin: checkins[0],
      } as WardSummary;
    })
    .filter(Boolean) as WardSummary[];
}

function GuardianOverview() {
  const { profile } = useAuth();
  const { guardians } = useGuardians();
  const { emergencies, updates } = useEmergencies();
  const wardIds = guardians.map((g) => g.patient_user_id).filter(Boolean);
  const wards = useWardSummaries(wardIds);
  const activeEmergencies = emergencies.filter((e) => e.status === 'active');
  const pending = guardians.filter((g) => g.status === 'pending').length;

  const first = profile?.full_name?.split(' ')[0] ?? 'Guardian';
  const t = useI18n().t;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Hi, {first} <span className="text-sky-500">👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Guardian Hub · Keeping an eye on <span className="font-medium text-foreground">{wards.length}</span> family member{wards.length === 1 ? '' : 's'} · {pending} pending link{pending === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/emergency">
            <Button size="sm" className="gap-1.5 bg-sky-600 hover:bg-sky-700">
              <Siren className="h-4 w-4" /> SOS Coordination
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Wards" value={wards.length} sub="Family under care" icon={Users} tone="primary" />
        <StatCard
          label="Active Emergencies"
          value={activeEmergencies.length}
          sub={activeEmergencies.length > 0 ? 'Respond now' : 'All clear'}
          icon={Siren}
          tone={activeEmergencies.length > 0 ? 'destructive' : 'success'}
        />
        <StatCard
          label="Open Alerts"
          value={wards.reduce((n, w) => n + w.activeAlerts, 0)}
          sub={wards.some((w) => w.criticalAlerts > 0) ? 'Some need attention' : 'None critical'}
          icon={Bell}
          tone={wards.some((w) => w.criticalAlerts > 0) ? 'warning' : 'success'}
        />
        <StatCard
          label="Avg Adherence Today"
          value={`${
            wards.length
              ? Math.round(
                  wards.reduce((n, w) => n + (w.todayTotal ? (w.todayTaken / w.todayTotal) * 100 : 100), 0) /
                    wards.length
                )
              : 0
          }%`}
          sub="Across all wards"
          icon={Pill}
          tone="primary"
        />
      </div>

      {/* Active emergency banner */}
      {activeEmergencies.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive text-white animate-pulse">
              <Siren className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-destructive">Active emergency in progress</div>
              <div className="mt-1 space-y-1.5">
                {activeEmergencies.slice(0, 2).map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium truncate max-w-[220px]">
                        {(e as any).patient_profile?.full_name ?? 'Ward'}
                      </span>
                      <Badge variant="outline" className="uppercase text-[10px]">{e.severity}</Badge>
                    </div>
                    <Link href="/emergency">
                      <Button size="sm" variant="destructive" className="h-7 text-xs">
                        Respond <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Wards list */}
      <div className="grid gap-4 lg:grid-cols-2">
        {wards.length === 0 ? (
          <Card className="lg:col-span-2 p-6">
            <EmptyState
              icon={Users}
              title="No linked wards yet"
              description="Ask your family member to invite you as a guardian from their Emergency page."
            />
          </Card>
        ) : (
          wards.map((w) => {
            const adherencePct = w.todayTotal ? Math.round((w.todayTaken / w.todayTotal) * 100) : 100;
            return (
              <Card key={w.profile.id} className="overflow-hidden">
                <div className="bg-gradient-to-r from-sky-500/10 via-cyan-500/5 to-transparent p-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border-2 border-sky-500/30">
                      <AvatarFallback className="bg-gradient-to-br from-sky-500 to-cyan-500 text-white text-sm font-semibold">
                        {(w.profile.full_name || 'U').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{w.profile.full_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {w.profile.date_of_birth ? `${Math.floor((Date.now() - new Date(w.profile.date_of_birth).getTime()) / 3.15576e10)} yrs old` : 'Patient'}
                        {w.profile.blood_group && <span className="ml-1">· BG {w.profile.blood_group}</span>}
                      </div>
                    </div>
                    {w.latestVital && (
                      <Badge variant="outline" className={cn(
                        'uppercase text-[10px]',
                        w.latestVital.risk_level === 'critical' && 'bg-destructive/10 text-destructive border-destructive/30',
                        w.latestVital.risk_level === 'warning' && 'bg-warning/10 text-warning border-warning/30',
                        (w.latestVital.risk_level === 'normal' || w.latestVital.risk_level === 'elevated') && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      )}>
                        {w.latestVital.risk_level}
                      </Badge>
                    )}
                  </div>

                  {/* KPI mini cards */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border bg-background/60 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Risk</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <div className="text-lg font-semibold">{w.latestVital?.risk_score ?? 0}</div>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-background/60 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Alerts</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <div className={cn('text-lg font-semibold', w.criticalAlerts > 0 ? 'text-destructive' : 'text-foreground')}>{w.activeAlerts}</div>
                        {w.criticalAlerts > 0 && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-background/60 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Adherence</div>
                      <div className="mt-0.5 text-lg font-semibold">{adherencePct}%</div>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/vitals">
                      <Button size="sm" variant="outline" className="h-8 gap-1"><Activity className="h-3.5 w-3.5" /> Vitals</Button>
                    </Link>
                    <Link href="/medications">
                      <Button size="sm" variant="outline" className="h-8 gap-1"><Pill className="h-3.5 w-3.5" /> Meds</Button>
                    </Link>
                    <a href={`tel:${w.profile.emergency_contact_phone || w.profile.phone}`}>
                      <Button size="sm" variant="outline" className="h-8 gap-1"><Phone className="h-3.5 w-3.5" /> Call</Button>
                    </a>
                    <Link href="/emergency">
                      <Button size="sm" className="h-8 gap-1 bg-sky-600 hover:bg-sky-700"><Siren className="h-3.5 w-3.5" /> SOS</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ========================= DOCTOR (CLINICAL) VIEW ========================= */

function usePatientRoster(): { profile: Profile; latestVital?: any; activeAlerts: number; avgAdherence30: number; lastVisit?: string }[] {
  const db = loadDB();
  // Doctor sees all patient role profiles in this standalone demo setup, plus profile IDs referenced by name match
  const patients = db.profiles.filter((p) => p.role === 'patient');
  return patients.map((p) => {
    const vitals = db.vitals.filter((v) => v.user_id === p.id).sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    const alerts = db.alerts.filter((a) => a.user_id === p.id && !a.dismissed);
    // 30d adherence
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const logs30 = db.medication_logs.filter(
      (l) => l.user_id === p.id && new Date(l.scheduled_time) >= since
    );
    const taken = logs30.filter((l) => l.status === 'taken').length;
    const avg = logs30.length > 0 ? Math.round((taken / logs30.length) * 100) : 100;
    return {
      profile: p,
      latestVital: vitals[0],
      activeAlerts: alerts.length,
      avgAdherence30: avg,
      lastVisit: vitals[0]?.recorded_at,
    };
  });
}

function DoctorOverview() {
  const { profile } = useAuth();
  const t = useI18n().t;
  const { alerts } = useAlerts();
  const { emergencies } = useEmergencies();
  const roster = usePatientRoster();

  const first = profile?.full_name?.split(' ').slice(-1)[0] ?? 'Doctor';
  const escalatedAlerts = alerts.filter((a) => a.escalated && !a.dismissed);
  const criticalVitals = roster.filter((r) => r.latestVital && (r.latestVital.risk_level === 'warning' || r.latestVital.risk_level === 'critical'));
  const lowAdherence = roster.filter((r) => r.avgAdherence30 < 80);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Good to see you, Dr. {first}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clinical Workbench · {roster.length} patients on panel · {format(new Date(), 'EEEE, MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/alerts">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Bell className="h-4 w-4" /> {escalatedAlerts.length} escalated
            </Button>
          </Link>
          <Link href="/vitals">
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              <Stethoscope className="h-4 w-4" /> Review rounds
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Panel Size" value={roster.length} sub="Active patients" icon={Users} tone="primary" />
        <StatCard
          label="Escalated Alerts"
          value={escalatedAlerts.length}
          sub={escalatedAlerts.length > 0 ? 'Awaiting review' : 'Inbox zero'}
          icon={AlertCircle}
          tone={escalatedAlerts.length > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="At-Risk Patients"
          value={criticalVitals.length}
          sub={criticalVitals.length > 0 ? 'Vital signs warning' : 'Stable panel'}
          icon={TrendingUp}
          tone={criticalVitals.length > 0 ? 'destructive' : 'success'}
        />
        <StatCard
          label="Low Adherence"
          value={lowAdherence.length}
          sub="< 80% over 30 days"
          icon={Pill}
          tone={lowAdherence.length > 0 ? 'warning' : 'primary'}
        />
      </div>

      {/* Live emergencies */}
      {emergencies.filter((e) => e.status !== 'resolved').length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-destructive">
                {emergencies.filter((e) => e.status !== 'resolved').length} active case{emergencies.filter((e) => e.status !== 'resolved').length === 1 ? '' : 's'}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Open Emergency requests awaiting response or transport.</p>
              <div className="mt-2 flex">
                <Link href="/emergency">
                  <Button size="sm" variant="destructive" className="h-7 text-xs">Open ER View →</Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Patient roster */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 p-5">
          <div>
            <h2 className="font-medium">Patient Roster</h2>
            <p className="text-xs text-muted-foreground">Tap any row to open vitals review</p>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-500/40 bg-emerald-500/5">
            <Stethoscope className="mr-1 h-3 w-3" /> All profiles
          </Badge>
        </div>
        <div className="divide-y divide-border/60">
          {roster.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Users} title="No patients on panel" description="Patients can nominate you as their treating doctor in Settings." />
            </div>
          ) : (
            roster.map((r) => {
              const p = r.profile;
              const v = r.latestVital;
              const bp = v?.systolic_bp && v?.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '—';
              return (
                <Link href="/vitals" key={p.id} className="block group">
                  <div className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm font-semibold">
                        {(p.full_name || 'U').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{p.full_name}</span>
                        {v && (
                          <RiskBadge
                            level={v.risk_level}
                            label={riskLevelLabel(v.risk_level, t)}
                          />
                        )}
                        {r.activeAlerts > 0 && (
                          <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/30">
                            {r.activeAlerts} alert{r.activeAlerts === 1 ? '' : 's'}
                          </Badge>
                        )}
                        {r.avgAdherence30 < 80 && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                            {r.avgAdherence30}% adherence
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" />
                          {p.chronic_conditions?.length ? p.chronic_conditions.join(' · ') : 'No chronic conditions'}
                        </span>
                        {p.blood_group && <span>BG {p.blood_group}</span>}
                        {p.doctor_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Clinic</span>}
                      </div>
                    </div>

                    {/* Clinical snapshot */}
                    <div className="flex items-center gap-3 text-right">
                      <div className="hidden sm:block">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">BP</div>
                        <div className="text-sm font-medium">{bp}</div>
                      </div>
                      <div className="hidden sm:block">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">HR</div>
                        <div className="text-sm font-medium">{v?.heart_rate ?? '—'} bpm</div>
                      </div>
                      <div className="hidden md:block">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">30d Meds</div>
                        <div className={cn('text-sm font-medium', r.avgAdherence30 < 80 ? 'text-warning' : 'text-emerald-600')}>
                          {r.avgAdherence30}%
                        </div>
                      </div>
                      <div className="hidden lg:block">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Last Seen</div>
                        <div className="text-sm font-medium">
                          {r.lastVisit ? formatDistanceToNow(new Date(r.lastVisit), { addSuffix: true }) : '—'}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

function VitalMini({ label, value, unit }: { label: string; value: React.ReactNode; unit: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">
        {value != null ? value : '—'}
        {value != null && unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function WellnessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
