'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  triggerElderCheckinPrompt,
  triggerNoResponseTimeout,
  familyAcknowledgeIncident,
  escalateIncidentToVolunteers,
  volunteerAcceptIncident,
  volunteerMarkReached,
  verifyPhysicalPresenceQr,
  submitVolunteerOutcome,
  loadDB,
  saveDB,
} from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Sparkles, Users, User, Stethoscope, RefreshCw, ChevronRight, PlayCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export function DemoController({ onStateChanged }: { onStateChanged?: () => void }) {
  const { profile, switchUserById } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const demoElderId = 'demo_user_001';
  const demoCaregiverId = 'demo_guardian_001';
  const demoDoctorId = 'demo_doctor_001';

  // Helper to switch active user role instantly
  const switchUserRole = async (targetRoleId: string) => {
    const res = await switchUserById(targetRoleId);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Switched active view to: ${res.profile?.full_name} (${res.profile?.role})`, {
      description: 'View layout and medical records updated instantly.',
    });
    onStateChanged?.();
  };

  // Step 1: Trigger checkin + timeout -> create No-Response incident
  const runStep1_MissedCheckin = () => {
    const prompt = triggerElderCheckinPrompt(demoElderId, 'Are you okay right now?', 5);
    const res = triggerNoResponseTimeout(prompt.id);

    if (res) {
      toast.error('STEP 1: Elder Missed Scheduled Check-in!', {
        description: 'Auto-generated High-Priority "No Response" Incident in Caregiver Command Centre.',
      });
      onStateChanged?.();
    }
  };

  // Step 2: Family Acknowledges
  const runStep2_FamilyAcknowledge = () => {
    const db = loadDB();
    const activeReq = db.emergency_requests.find((e) => e.patient_user_id === demoElderId && e.status !== 'resolved');
    if (!activeReq) {
      runStep1_MissedCheckin();
      return;
    }

    familyAcknowledgeIncident(activeReq.id, demoCaregiverId);
    toast.warning('STEP 2: Family Caregiver Acknowledged Alert!', {
      description: 'Caregiver takes primary responsibility for following up.',
    });
    onStateChanged?.();
  };

  // Step 3: Escalate to Volunteers
  const runStep3_EscalateVolunteers = () => {
    const db = loadDB();
    const activeReq = db.emergency_requests.find((e) => e.patient_user_id === demoElderId && e.status !== 'resolved');
    if (!activeReq) {
      toast.error('No active incident to escalate. Trigger Step 1 first.');
      return;
    }

    escalateIncidentToVolunteers(activeReq.id);
    toast.error('STEP 3: Escalated to Community Volunteers!', {
      description: 'Nearby verified responders alerted to conduct emergency physical check.',
    });
    onStateChanged?.();
  };

  // Step 4: Volunteer Accepts & Arrives
  const runStep4_VolunteerAcceptsArrives = () => {
    const db = loadDB();
    const activeReq = db.emergency_requests.find((e) => e.patient_user_id === demoElderId && e.status !== 'resolved');
    if (!activeReq) {
      toast.error('No active incident. Run earlier steps first.');
      return;
    }

    volunteerAcceptIncident(activeReq.id, demoDoctorId);
    volunteerMarkReached(activeReq.id, demoDoctorId);
    toast.success('STEP 4: Volunteer Dr. Priya Mehta Accepted & Arrived on Scene!', {
      description: 'Status updated to "Reached Elder Residence". Physical Presence QR required.',
    });
    onStateChanged?.();
  };

  // Step 5: Verify Presence QR
  const runStep5_VerifyPresenceQr = () => {
    const db = loadDB();
    const activeReq = db.emergency_requests.find((e) => e.patient_user_id === demoElderId && e.status !== 'resolved');
    if (!activeReq) {
      toast.error('No active incident. Run earlier steps first.');
      return;
    }

    const token = activeReq.qr_verification_token || `sahayak_v1_verify_${demoElderId}_default`;
    const res = verifyPhysicalPresenceQr(activeReq.id, demoDoctorId, token, 28.4953, 77.0881);
    if (res.success) {
      toast.success('STEP 5: Physical Presence QR Code Verified!', {
        description: 'Verified presence on-site (12m from home). Awaiting visit outcome.',
      });
      onStateChanged?.();
    }
  };

  // Step 6: Submit Visit Outcome (SAFE)
  const runStep6_SubmitOutcomeSafe = () => {
    const db = loadDB();
    const activeReq = db.emergency_requests.find((e) => e.patient_user_id === demoElderId && e.status !== 'resolved');
    if (!activeReq) {
      toast.error('No active incident to resolve.');
      return;
    }

    submitVolunteerOutcome(activeReq.id, demoDoctorId, 'SAFE', 'Elder Aarav was resting peacefully in living room. All vitals normal.');
    toast.success('STEP 6: Visit Completed — Elder Verified SAFE! 🎉', {
      description: 'Incident resolved and archived in Caregiver Audit History.',
    });
    onStateChanged?.();
  };

  // Reset entire demo data
  const handleResetDemo = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sahayak_db');
      toast.success('Demo Database Reset to Clean Baseline State!');
      window.location.reload();
    }
  };

  return (
    <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-background to-sky-500/10 p-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary text-white font-bold flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Hackathon 2-Min Demo Bar
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Active Persona: <strong className="text-foreground">{profile?.full_name}</strong> ({profile?.role})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? 'Expand Stepper ▾' : 'Collapse ▴'}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleResetDemo}>
            <RefreshCw className="mr-1 h-3 w-3" /> Reset
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-3 pt-2 border-t border-border/60">
          {/* Quick Persona Switcher */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground shrink-0">Switch Role View:</span>
            <Button
              size="sm"
              variant={profile?.id === demoElderId ? 'default' : 'outline'}
              className="h-7 text-[11px] gap-1"
              onClick={() => switchUserRole(demoElderId)}
            >
              <User className="h-3 w-3" /> Aarav (Elder Patient)
            </Button>
            <Button
              size="sm"
              variant={profile?.id === demoCaregiverId ? 'default' : 'outline'}
              className="h-7 text-[11px] gap-1"
              onClick={() => switchUserRole(demoCaregiverId)}
            >
              <Users className="h-3 w-3" /> Rohan (Guardian / Volunteer)
            </Button>
            <Button
              size="sm"
              variant={profile?.id === demoDoctorId ? 'default' : 'outline'}
              className="h-7 text-[11px] gap-1"
              onClick={() => switchUserRole(demoDoctorId)}
            >
              <Stethoscope className="h-3 w-3" /> Dr. Priya (Doctor Panel - Clinical)
            </Button>
          </div>

          {/* Stepper Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Button size="sm" variant="outline" className="h-9 text-[11px] bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 font-semibold" onClick={runStep1_MissedCheckin}>
              1. Missed Check-in
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-[11px] bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold" onClick={runStep2_FamilyAcknowledge}>
              2. Family Alert
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-[11px] bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300 font-semibold" onClick={runStep3_EscalateVolunteers}>
              3. Volunteer Escalate
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-[11px] bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300 font-semibold" onClick={runStep4_VolunteerAcceptsArrives}>
              4. Volunteer Arrives
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-[11px] bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-semibold" onClick={runStep5_VerifyPresenceQr}>
              5. Verify QR
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-[11px] bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold" onClick={runStep6_SubmitOutcomeSafe}>
              6. Visit SAFE
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
