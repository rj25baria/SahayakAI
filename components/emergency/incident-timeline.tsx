'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Bell,
  Users,
  UserCheck,
  Navigation,
  MapPin,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Siren,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EmergencyRequest } from '@/lib/types';

interface IncidentTimelineProps {
  request: EmergencyRequest;
}

interface Step {
  id: string;
  label: string;
  icon: any;
  completed: boolean;
  active: boolean;
  time?: string | null;
  actor?: string | null;
  detail?: string | null;
}

export function IncidentTimeline({ request }: IncidentTimelineProps) {
  const status = request.status;

  const steps: Step[] = [
    {
      id: 'no_response',
      label: 'No Response Triggered',
      icon: Clock,
      completed: true,
      active: status === 'active' && !request.family_acknowledged,
      time: request.last_response_at || request.created_at,
      detail: request.no_response_reason || 'Elder missed scheduled wellness prompt',
    },
    {
      id: 'family_alerted',
      label: 'Family Alerted',
      icon: Bell,
      completed: !!request.family_acknowledged || status !== 'family_alerted',
      active: status === 'family_alerted',
      time: request.family_acknowledged_at || request.created_at,
      actor: request.family_acknowledged ? 'Family Caregiver' : 'Caregiver Pending',
      detail: request.family_acknowledged ? 'Family acknowledged responsibility' : 'Alert active in Family Command Centre',
    },
    {
      id: 'volunteer_escalated',
      label: 'Escalated to Volunteers',
      icon: Users,
      completed: request.escalated_to_volunteers || ['accepted', 'on_the_way', 'reached', 'verification_pending', 'resolved'].includes(status),
      active: status === 'volunteer_escalated',
      time: request.escalated_at,
      detail: 'Broadcast sent to nearby verified volunteers',
    },
    {
      id: 'accepted',
      label: 'Volunteer Accepted',
      icon: UserCheck,
      completed: ['accepted', 'on_the_way', 'reached', 'verification_pending', 'resolved'].includes(status),
      active: status === 'accepted',
      time: request.volunteer_accepted_at || request.accepted_at,
      actor: request.accepted_by_profile?.full_name || 'Volunteer',
      detail: request.accepted_by_profile ? `${request.accepted_by_profile.full_name} (${request.accepted_by_profile.phone})` : undefined,
    },
    {
      id: 'on_the_way',
      label: 'En Route',
      icon: Navigation,
      completed: ['on_the_way', 'reached', 'verification_pending', 'resolved'].includes(status),
      active: status === 'on_the_way',
      detail: 'Responder moving to elder residence',
    },
    {
      id: 'reached',
      label: 'Reached Residence',
      icon: MapPin,
      completed: ['reached', 'verification_pending', 'resolved'].includes(status),
      active: status === 'reached',
      time: request.volunteer_reached_at,
      detail: 'Responder arrived at elder location',
    },
    {
      id: 'qr_verified',
      label: 'QR Presence Verified',
      icon: QrCode,
      completed: !!request.qr_verified,
      active: status === 'verification_pending',
      time: request.qr_verified_at,
      detail: request.qr_gps_distance_meters != null ? `On-site verified (${request.qr_gps_distance_meters}m from home)` : 'Pending physical scan',
    },
    {
      id: 'outcome',
      label: 'Outcome Submitted',
      icon: ShieldCheck,
      completed: !!request.volunteer_outcome,
      active: status === 'verification_pending' && !request.volunteer_outcome,
      detail: request.volunteer_outcome ? `Outcome: ${request.volunteer_outcome} — ${request.outcome_notes || 'No extra notes'}` : 'Awaiting status selection',
    },
    {
      id: 'resolved',
      label: 'Incident Resolved',
      icon: CheckCircle2,
      completed: status === 'resolved',
      active: status === 'resolved',
      time: request.resolved_at,
      detail: 'Complete visit logged and saved in history',
    },
  ];

  return (
    <Card className="p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Siren className="h-4 w-4 text-primary" /> Incident Journey Timeline
          </h3>
          <p className="text-xs text-muted-foreground">Real-time audit tracking from No-Response trigger to verified visit resolution</p>
        </div>
        <Badge variant="outline" className="uppercase text-[10px] font-bold px-2.5 py-0.5">
          Status: {status.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/80">
        {steps.map((step) => {
          const StepIcon = step.icon;
          return (
            <div key={step.id} className="relative group">
              {/* Node Bullet */}
              <div
                className={cn(
                  'absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] transition-all',
                  step.completed
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow'
                    : step.active
                    ? 'border-primary bg-primary text-white ring-4 ring-primary/20 animate-pulse'
                    : 'border-muted-foreground/30 bg-background text-muted-foreground'
                )}
              >
                {step.completed ? <CheckCircle2 className="h-3 w-3" /> : <StepIcon className="h-2.5 w-2.5" />}
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'text-xs font-semibold tracking-tight',
                      step.completed ? 'text-foreground' : step.active ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                  {step.time && (
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(step.time), 'h:mm:ss a')}
                    </span>
                  )}
                </div>

                {step.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{step.detail}</p>}
                {step.actor && (
                  <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Actor: {step.actor}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
