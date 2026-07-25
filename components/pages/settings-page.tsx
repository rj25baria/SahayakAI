'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { useVitals, useMedications, useWellness, useAlerts, useQrCard } from '@/lib/hooks';
import { PageHeader } from '@/components/dashboard/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sun, Moon, FileText, Loader2, User, Stethoscope, ShieldAlert, Settings as SettingsIcon } from 'lucide-react';
import { logAudit } from '@/lib/audit';
import { loadDB, saveDB, updateRows } from '@/lib/store';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import type { Profile, Language, Theme } from '@/lib/types';
import { cn } from '@/lib/utils';

export function SettingsPage() {
  const { user, profile, refreshProfile, theme, setTheme, language, setLanguage } = useAuth();
  const { t } = useI18n();
  const { vitals } = useVitals();
  const { meds } = useMedications();
  const { checkins } = useWellness();
  const { alerts } = useAlerts();
  const { card, setCard } = useQrCard();
  const [form, setForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [allergiesInput, setAllergiesInput] = useState('');
  const [conditionsInput, setConditionsInput] = useState('');

  useEffect(() => {
    if (profile) {
      setForm(profile);
      setAllergiesInput(profile.allergies.join(', '));
      setConditionsInput(profile.chronic_conditions.join(', '));
    }
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const update: Partial<Profile> = {
      ...form,
      allergies: allergiesInput.split(',').map((s) => s.trim()).filter(Boolean),
      chronic_conditions: conditionsInput.split(',').map((s) => s.trim()).filter(Boolean),
    };
    const db = loadDB();
    updateRows('profiles', db, 'id', user.id, update);
    saveDB(db);
    await logAudit(user.id, 'profile.updated', {});
    await refreshProfile();
    toast.success(t('settings.saved'));
    setSaving(false);
  };

  const updateCardFlag = async (flag: 'show_allergies' | 'show_medications' | 'show_conditions' | 'show_emergency_contact' | 'show_insurance' | 'show_doctor' | 'show_blood_group', value: boolean) => {
    if (!card) return;
    const db = loadDB();
    updateRows('qr_cards', db, 'id', card.id, { [flag]: value });
    saveDB(db);
    setCard({ ...card, [flag]: value });
  };

  const generateReport = () => {
    setReporting(true);
    // Use the browser print dialog on a printable layout. We render a hidden
    // printable section and trigger window.print(), scoped via CSS @media print.
    setTimeout(() => {
      window.print();
      setReporting(false);
      if (user) logAudit(user.id, 'report.generated', {});
    }, 300);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" />{t('settings.profile')}</TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1.5"><SettingsIcon className="h-3.5 w-3.5" />{t('settings.preferences')}</TabsTrigger>
          <TabsTrigger value="report" className="gap-1.5"><FileText className="h-3.5 w-3.5" />{t('settings.healthReport')}</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 font-medium">{t('settings.personalInfo')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('settings.fullName')}><Input value={form.full_name ?? ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
              <Field label={t('settings.phone')}><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label={t('settings.dob')}><Input type="date" value={form.date_of_birth ?? ''} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></Field>
              <Field label={t('settings.gender')}><Input value={form.gender ?? ''} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="Male / Female / Other" /></Field>
              <div className="sm:col-span-2"><Field label={t('settings.address')}><Input value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-medium">{t('settings.medicalInfo')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('settings.bloodGroup')}><Input value={form.blood_group ?? ''} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} placeholder="O+" /></Field>
              <Field label={t('settings.allergies')}><Input value={allergiesInput} onChange={(e) => setAllergiesInput(e.target.value)} placeholder="Penicillin, Peanuts" /></Field>
              <div className="sm:col-span-2"><Field label={t('settings.chronicConditions')}><Input value={conditionsInput} onChange={(e) => setConditionsInput(e.target.value)} placeholder="Diabetes, Hypertension" /></Field></div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-medium">{t('settings.emergencyInfo')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('settings.emergencyContact')}><Input value={form.emergency_contact_name ?? ''} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></Field>
              <Field label={t('settings.emergencyRelation')}><Input value={form.emergency_contact_relation ?? ''} onChange={(e) => setForm({ ...form, emergency_contact_relation: e.target.value })} placeholder="Spouse / Son / Daughter" /></Field>
              <div className="sm:col-span-2"><Field label={t('auth.phone')}><Input value={form.emergency_contact_phone ?? ''} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></Field></div>
              <Field label={t('settings.insuranceProvider')}><Input value={form.insurance_provider ?? ''} onChange={(e) => setForm({ ...form, insurance_provider: e.target.value })} /></Field>
              <Field label={t('settings.insuranceNumber')}><Input value={form.insurance_number ?? ''} onChange={(e) => setForm({ ...form, insurance_number: e.target.value })} /></Field>
              <Field label={t('settings.doctorName')}><Input value={form.doctor_name ?? ''} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} /></Field>
              <Field label={t('settings.doctorPhone')}><Input value={form.doctor_phone ?? ''} onChange={(e) => setForm({ ...form, doctor_phone: e.target.value })} /></Field>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} size="lg">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 font-medium">{t('settings.preferences')}</h2>
            <div className="space-y-5">
              <div>
                <Label className="mb-2 block">{t('settings.theme')}</Label>
                <div className="flex gap-2">
                  {(['light', 'dark'] as Theme[]).map((th) => (
                    <button key={th} onClick={() => setTheme(th)} className={cn('flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all', theme === th ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-muted/50')}>
                      {th === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {t(`settings.${th}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">{t('settings.language')}</Label>
                <div className="flex gap-2">
                  {(['en', 'hi'] as Language[]).map((l) => (
                    <button key={l} onClick={() => setLanguage(l)} className={cn('rounded-xl border px-4 py-2.5 text-sm transition-all', language === l ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-muted/50')}>
                      {l === 'en' ? t('settings.english') : t('settings.hindi')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* QR card sharing controls */}
          <Card className="p-6">
            <h2 className="mb-1 font-medium">{t('emergency.qrCard')}</h2>
            <p className="mb-4 text-xs text-muted-foreground">Control what your public Medical QR card shows first responders.</p>
            {card && (
              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleRow label={t('settings.bloodGroup')} checked={card.show_blood_group} onChange={(v) => updateCardFlag('show_blood_group', v)} />
                <ToggleRow label={t('settings.allergies')} checked={card.show_allergies} onChange={(v) => updateCardFlag('show_allergies', v)} />
                <ToggleRow label={t('settings.chronicConditions')} checked={card.show_conditions} onChange={(v) => updateCardFlag('show_conditions', v)} />
                <ToggleRow label={t('settings.emergencyContact')} checked={card.show_emergency_contact} onChange={(v) => updateCardFlag('show_emergency_contact', v)} />
                <ToggleRow label={t('settings.insuranceProvider')} checked={card.show_insurance} onChange={(v) => updateCardFlag('show_insurance', v)} />
                <ToggleRow label={t('settings.doctorName')} checked={card.show_doctor} onChange={(v) => updateCardFlag('show_doctor', v)} />
                <ToggleRow label={t('nav.medications')} checked={card.show_medications} onChange={(v) => updateCardFlag('show_medications', v)} />
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Health report */}
        <TabsContent value="report" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
              <div className="flex-1">
                <h2 className="font-medium">{t('settings.healthReport')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('settings.healthReportDesc')}</p>
                <Button onClick={generateReport} disabled={reporting} className="mt-4">
                  {reporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('settings.generateReport')}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Printable report (hidden on screen, visible on print) */}
      <div className="hidden print:block">
        <HealthReportPrint profile={profile} vitals={vitals.slice(0, 20)} meds={meds} checkins={checkins.slice(0, 10)} alerts={alerts.slice(0, 20)} t={t} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-muted-foreground/30')}
      >
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </button>
    </label>
  );
}

function HealthReportPrint({
  profile, vitals, meds, checkins, alerts, t,
}: {
  profile: Profile | null;
  vitals: import('@/lib/types').VitalReading[];
  meds: import('@/lib/types').Medication[];
  checkins: import('@/lib/types').WellnessCheckin[];
  alerts: import('@/lib/types').Alert[];
  t: (k: string) => string;
}) {
  return (
    <div className="p-8 text-black">
      <div className="mb-6 border-b-2 border-teal-600 pb-4">
        <h1 className="text-2xl font-bold">SAHAYAK Health Report</h1>
        <p className="text-sm text-gray-600">Generated {format(new Date(), 'MMM d, yyyy h:mm a')}</p>
      </div>
      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Patient Information</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr><td className="py-1 pr-4 font-medium">Name</td><td>{profile?.full_name}</td></tr>
            <tr><td className="py-1 pr-4 font-medium">Date of Birth</td><td>{profile?.date_of_birth ?? '—'}</td></tr>
            <tr><td className="py-1 pr-4 font-medium">Blood Group</td><td>{profile?.blood_group || '—'}</td></tr>
            <tr><td className="py-1 pr-4 font-medium">Allergies</td><td>{profile?.allergies.join(', ') || 'None'}</td></tr>
            <tr><td className="py-1 pr-4 font-medium">Chronic Conditions</td><td>{profile?.chronic_conditions.join(', ') || 'None'}</td></tr>
            <tr><td className="py-1 pr-4 font-medium">Emergency Contact</td><td>{profile?.emergency_contact_name} ({profile?.emergency_contact_phone})</td></tr>
            <tr><td className="py-1 pr-4 font-medium">Doctor</td><td>{profile?.doctor_name} ({profile?.doctor_phone})</td></tr>
            <tr><td className="py-1 pr-4 font-medium">Insurance</td><td>{profile?.insurance_provider} {profile?.insurance_number}</td></tr>
          </tbody>
        </table>
      </section>
      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Recent Vital Signs</h2>
        <table className="w-full border text-sm">
          <thead className="bg-gray-100"><tr><th className="border p-1 text-left">Date</th><th className="border p-1">HR</th><th className="border p-1">SpO₂</th><th className="border p-1">BP</th><th className="border p-1">Temp</th><th className="border p-1">Glucose</th><th className="border p-1">Risk</th></tr></thead>
          <tbody>
            {vitals.map((v) => (
              <tr key={v.id}>
                <td className="border p-1">{format(parseISO(v.recorded_at), 'MMM d, h:mm a')}</td>
                <td className="border p-1 text-center">{v.heart_rate ?? '—'}</td>
                <td className="border p-1 text-center">{v.spo2 ?? '—'}</td>
                <td className="border p-1 text-center">{v.systolic_bp ?? '—'}/{v.diastolic_bp ?? '—'}</td>
                <td className="border p-1 text-center">{v.temperature ?? '—'}</td>
                <td className="border p-1 text-center">{v.glucose ?? '—'}</td>
                <td className="border p-1 text-center capitalize">{v.risk_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Current Medications</h2>
        <ul className="text-sm">
          {meds.filter((m) => m.active).map((m) => <li key={m.id}>• {m.name} — {m.dosage}, {m.frequency} ({m.times.join(', ')})</li>)}
        </ul>
      </section>
      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Recent Alerts</h2>
        <ul className="text-sm">
          {alerts.map((a) => <li key={a.id}>• [{a.severity}] {a.title} — {format(parseISO(a.created_at), 'MMM d')}</li>)}
        </ul>
      </section>
      <p className="mt-8 border-t pt-4 text-xs text-gray-500">This report was generated by SAHAYAK. Risk assessments are deterministic and rule-based, not AI-generated. Consult a physician for medical decisions.</p>
    </div>
  );
}
