'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useEmergencies, useGuardians, useAlerts, useVitals } from '@/lib/hooks';
import { familyAcknowledgeIncident, escalateIncidentToVolunteers, loadDB } from '@/lib/store';
import { calculateElderSafetyScore } from '@/lib/risk-engine';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RiskGauge, StatCard } from '@/components/dashboard/shared';
import { IncidentTimeline } from '@/components/emergency/incident-timeline';
import { QrPresenceVerifier } from '@/components/emergency/qr-presence-verifier';
import {
  Users,
  Siren,
  Bell,
  Pill,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Phone,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function CaregiverCommandCentre() {
  const { user, profile } = useAuth();
  const { guardians } = useGuardians();
  const { emergencies, refresh: refreshEmergencies } = useEmergencies();
  const { alerts } = useAlerts();

  const db = loadDB();
  const wardIds = guardians.map((g) => g.patient_user_id).filter(Boolean);
  const primaryWardId = wardIds[0] || 'demo_user_001';
  const wardProfile = db.profiles.find((p) => p.id === primaryWardId);

  // Calculate Elder Safety Score with explainable factors
  const safetyScoreResult = calculateElderSafetyScore(primaryWardId, db);

  // Active Emergency or No-Response incident
  const activeIncident = emergencies.find(
    (e) => (e.patient_user_id === primaryWardId || wardIds.includes(e.patient_user_id)) && e.status !== 'resolved' && e.status !== 'cancelled'
  );

  const handleFamilyAcknowledge = () => {
    if (!activeIncident || !user) return;
    familyAcknowledgeIncident(activeIncident.id, user.id);
    toast.success('Alert Acknowledged by Family Caregiver!', {
      description: 'You have recorded taking primary responsibility for this incident.',
    });
    refreshEmergencies();
  };

  const handleEscalateToVolunteers = () => {
    if (!activeIncident) return;
    escalateIncidentToVolunteers(activeIncident.id);
    toast.error('Escalated to Community Volunteers!', {
      description: 'Nearby verified responders have been notified to conduct a physical visit.',
    });
    refreshEmergencies();
  };

  return (
    <div className="space-y-6">
      {/* Caregiver Command Centre Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 text-xs font-semibold">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Caregiver Command Centre
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">Live Sync Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
            Caregiver Oversight for {wardProfile?.full_name || 'Elder Aarav'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time status, explainable safety score, and automated volunteer escalation workflow
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/emergency">
            <Button size="sm" className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white">
              <Siren className="h-4 w-4" /> Full SOS Center
            </Button>
          </Link>
        </div>
      </div>

      {/* ACTIVE INCIDENT HIGHLIGHT CARD (PRIORITY 3, 4, 13) */}
      {activeIncident ? (
        <Card className="border-2 border-destructive/80 bg-gradient-to-r from-destructive/10 via-destructive/5 to-background p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive text-white shadow-md animate-pulse">
                <Siren className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="destructive" className="uppercase font-bold text-xs px-2.5 py-0.5">
                    {activeIncident.status.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Triggered {format(new Date(activeIncident.created_at), 'h:mm a')}
                  </span>
                </div>

                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {activeIncident.no_response_reason || 'Elder Missed Scheduled Wellness Check-in'}
                </h2>

                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-destructive shrink-0" />
                  <span>{wardProfile?.address || activeIncident.address}</span>
                  {wardProfile?.emergency_contact_phone && (
                    <a href={`tel:${wardProfile.emergency_contact_phone}`} className="ml-2 font-medium text-primary hover:underline flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Call Elder
                    </a>
                  )}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!activeIncident.family_acknowledged ? (
                <Button onClick={handleFamilyAcknowledge} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 text-xs h-9">
                  <CheckCircle2 className="h-4 w-4" /> Acknowledge Alert (I&apos;m Handling It)
                </Button>
              ) : (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-xs px-3 py-1 font-semibold">
                  ✓ Family Acknowledged at {activeIncident.family_acknowledged_at ? format(new Date(activeIncident.family_acknowledged_at), 'h:mm a') : 'recently'}
                </Badge>
              )}

              {activeIncident.status !== 'volunteer_escalated' && !activeIncident.escalated_to_volunteers && (
                <Button onClick={handleEscalateToVolunteers} variant="destructive" className="font-semibold gap-1.5 text-xs h-9">
                  <Users className="h-4 w-4" /> Escalate to Nearby Volunteers Now
                </Button>
              )}
            </div>
          </div>

          {/* Physical Presence Verification Area */}
          <div className="mt-5 pt-4 border-t border-border/60">
            <QrPresenceVerifier request={activeIncident} onUpdated={refreshEmergencies} />
          </div>

          {/* Incident Journey Timeline (PRIORITY 14) */}
          <div className="mt-5">
            <IncidentTimeline request={activeIncident} />
          </div>
        </Card>
      ) : (
        <Card className="p-4 border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">No Active Emergency Escalations</div>
              <div className="text-xs text-muted-foreground">{wardProfile?.full_name || 'Elder'} is monitored normally. All wellness prompts up to date.</div>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs font-bold">
            All Clear 🟢
          </Badge>
        </Card>
      )}

      {/* EXPLAINABLE ELDER SAFETY SCORE CARD (PRIORITY 15) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Sahayak Safety Score
              </h3>
              <Badge variant="outline" className="capitalize text-[10px]">
                {safetyScoreResult.level}
              </Badge>
            </div>

            <div className="flex items-center gap-4 my-4">
              <RiskGauge
                score={safetyScoreResult.score}
                level={safetyScoreResult.level}
                label="Safety Score"
              />
              <div className="space-y-1">
                <div className="text-3xl font-extrabold tracking-tight">{safetyScoreResult.score} / 100</div>
                <div className="text-xs text-muted-foreground">Deterministic & Explainable Calculation</div>
              </div>
            </div>
          </div>

          <div className="mt-2 text-xs text-muted-foreground pt-3 border-t border-border/60">
            Updated live from vitals, check-ins, and medication logs.
          </div>
        </Card>

        {/* Explainability Breakdown Panel */}
        <Card className="p-5 lg:col-span-2 space-y-3">
          <h3 className="font-semibold text-sm text-foreground flex items-center justify-between">
            <span>Explainable Score Factors</span>
            <span className="text-xs text-muted-foreground font-normal">Transparent Audit Trail</span>
          </h3>

          <div className="space-y-2">
            {safetyScoreResult.factors.map((factor, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-3 rounded-lg border text-xs flex items-start justify-between gap-3',
                  factor.isPositive
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-foreground'
                    : 'border-amber-500/20 bg-amber-500/5 text-foreground'
                )}
              >
                <div className="space-y-0.5">
                  <div className="font-semibold flex items-center gap-1.5">
                    {factor.isPositive ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    )}
                    <span>{factor.title}</span>
                  </div>
                  <div className="text-muted-foreground text-[11px]">{factor.reason}</div>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    'font-mono text-xs shrink-0',
                    factor.isPositive ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                  )}
                >
                  {factor.points > 0 ? `+${factor.points}` : factor.points} pts
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
