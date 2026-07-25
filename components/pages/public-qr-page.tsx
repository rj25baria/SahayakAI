'use client';

import { useEffect, useState } from 'react';
import type { PublicQrCard } from '@/lib/types';
import { loadDB } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  HeartPulse, Phone, Pill, ShieldAlert, Stethoscope, FileText, Droplet, User, Loader2, AlertCircle, Building2,
} from 'lucide-react';

export function PublicQrPage({ token }: { token: string }) {
  const [data, setData] = useState<PublicQrCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      const db = loadDB();
      const card = db.qr_cards.find((c) => c.share_token === token);
      if (!card || !card.active) {
        setError(true);
      } else {
        const profile = db.profiles.find((p) => p.id === card.patient_user_id);
        const meds = card.show_medications
          ? db.medications.filter((m) => m.user_id === card.patient_user_id && m.active).map((m) => ({
              name: m.name,
              dosage: m.dosage,
              frequency: m.frequency,
              instructions: m.instructions,
            }))
          : null;
        const result: PublicQrCard = {
          patient_name: profile?.full_name ?? 'Patient',
          blood_group: card.show_blood_group ? (profile?.blood_group || null) : null,
          allergies: card.show_allergies ? (profile?.allergies.length ? profile.allergies : null) : null,
          chronic_conditions: card.show_conditions ? (profile?.chronic_conditions.length ? profile.chronic_conditions : null) : null,
          emergency_contact_name: card.show_emergency_contact ? (profile?.emergency_contact_name || null) : null,
          emergency_contact_phone: card.show_emergency_contact ? (profile?.emergency_contact_phone || null) : null,
          emergency_contact_relation: card.show_emergency_contact ? (profile?.emergency_contact_relation || null) : null,
          insurance_provider: card.show_insurance ? (profile?.insurance_provider || null) : null,
          insurance_number: card.show_insurance ? (profile?.insurance_number || null) : null,
          doctor_name: card.show_doctor ? (profile?.doctor_name || null) : null,
          doctor_phone: card.show_doctor ? (profile?.doctor_phone || null) : null,
          medications: meds,
          generated_at: card.created_at,
        };
        setData(result);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h1 className="text-lg font-semibold">Card not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">This Medical QR card is invalid or has been deactivated.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-chart-2/5 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg shadow-primary/30">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">SAHAYAK</div>
            <div className="text-[10px] text-muted-foreground">Medical QR Emergency Card</div>
          </div>
        </div>

        <Card className="overflow-hidden border-border/60 shadow-lg animate-scale-in">
          <div className="gradient-primary px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <User className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xl font-semibold">{data.patient_name || 'Patient'}</div>
                {data.blood_group && <div className="text-sm text-white/85">Blood Group: {data.blood_group}</div>}
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6">
            {data.allergies && data.allergies.length > 0 && (
              <Section icon={ShieldAlert} title="Allergies" tone="destructive">
                <div className="flex flex-wrap gap-1.5">
                  {data.allergies.map((a) => <span key={a} className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">{a}</span>)}
                </div>
              </Section>
            )}

            {data.chronic_conditions && data.chronic_conditions.length > 0 && (
              <Section icon={HeartPulse} title="Chronic Conditions">
                <div className="flex flex-wrap gap-1.5">
                  {data.chronic_conditions.map((c) => <span key={c} className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">{c}</span>)}
                </div>
              </Section>
            )}

            {data.medications && data.medications.length > 0 && (
              <Section icon={Pill} title="Current Medications">
                <div className="space-y-1.5">
                  {data.medications.map((m, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium">{m.name}</span> <span className="text-muted-foreground">— {m.dosage}, {m.frequency}</span>
                      {m.instructions && <div className="text-xs text-muted-foreground">{m.instructions}</div>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {data.emergency_contact_name && (
              <Section icon={Phone} title="Emergency Contact">
                <div className="text-sm">
                  <div className="font-medium">{data.emergency_contact_name}{data.emergency_contact_relation && <span className="text-muted-foreground"> ({data.emergency_contact_relation})</span>}</div>
                  <a href={`tel:${data.emergency_contact_phone}`} className="text-primary hover:underline">{data.emergency_contact_phone}</a>
                </div>
              </Section>
            )}

            {data.doctor_name && (
              <Section icon={Stethoscope} title="Doctor">
                <div className="text-sm">
                  <div className="font-medium">{data.doctor_name}</div>
                  {data.doctor_phone && <a href={`tel:${data.doctor_phone}`} className="text-primary hover:underline">{data.doctor_phone}</a>}
                </div>
              </Section>
            )}

            {data.insurance_provider && (
              <Section icon={Building2} title="Insurance">
                <div className="text-sm">
                  <div className="font-medium">{data.insurance_provider}</div>
                  {data.insurance_number && <div className="text-muted-foreground">{data.insurance_number}</div>}
                </div>
              </Section>
            )}
          </div>

          <div className="border-t border-border/60 bg-muted/30 px-6 py-3 text-center text-xs text-muted-foreground">
            Generated by SAHAYAK · {new Date(data.generated_at).toLocaleString()}
          </div>
        </Card>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          This card is shared at the patient's explicit consent for emergency use only.
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children, tone }: { icon: typeof HeartPulse; title: string; children: React.ReactNode; tone?: 'destructive' }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone === 'destructive' ? 'text-destructive' : 'text-primary'}`} />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      {children}
    </div>
  );
}
