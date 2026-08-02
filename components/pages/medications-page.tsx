'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { useMedications } from '@/lib/hooks';
import { PageHeader, StatCard, EmptyState } from '@/components/dashboard/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Pill, Plus, CheckCircle2, XCircle, Clock, Bell, Trash2, CalendarClock } from 'lucide-react';
import { logAudit } from '@/lib/audit';
import { loadDB, saveDB, insertRow, updateRows } from '@/lib/store';
import { toast } from 'sonner';
import { format, parseISO, addDays, isToday, isSameDay } from 'date-fns';
import type { Medication, MedLogStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const MED_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function MedicationsPage() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { meds, logs, refresh } = useMedications();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    dosage: '',
    frequency: 'Twice daily',
    times: ['08:00', '20:00'],
    instructions: '',
    color: MED_COLORS[0],
  });

  const targetPatientUserId = profile?.role === 'patient' ? user?.id : 'demo_user_001';

  // Quick button to set time to current minute for instant reminder testing
  const setTimeToNow = (index: number) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const times = [...form.times];
    times[index] = `${hh}:${mm}`;
    setForm({ ...form, times });
    toast.info(`Time set to ${hh}:${mm}! Real-time reminder will trigger when clock reaches ${hh}:${mm}.`);
  };

  const todayLogs = useMemo(() => logs.filter((l) => isToday(parseISO(l.scheduled_time))), [logs]);
  const takenToday = todayLogs.filter((l) => l.status === 'taken').length;
  const totalToday = todayLogs.length;
  const adherenceToday = totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : 100;

  const last30 = useMemo(() => {
    const since = addDays(new Date(), -30);
    return logs.filter((l) => parseISO(l.scheduled_time) >= since);
  }, [logs]);
  const taken30 = last30.filter((l) => l.status === 'taken').length;
  const total30 = last30.length;
  const adherence30 = total30 > 0 ? Math.round((taken30 / total30) * 100) : 0;

  // Ensure today's logs exist for active meds
  const ensureTodayLogs = async () => {
    if (!user || !targetPatientUserId) return;
    const activeMeds = meds.filter((m) => m.active && m.times.length > 0);
    let changed = false;
    const db = loadDB();
    for (const med of activeMeds) {
      for (const time of med.times) {
        const scheduled = new Date();
        const [h, m] = time.split(':').map(Number);
        scheduled.setHours(h, m, 0, 0);
        const exists = db.medication_logs.some(
          (l) => l.user_id === med.user_id && l.medication_id === med.id && isSameDay(new Date(l.scheduled_time), scheduled)
        );
        if (!exists) {
          insertRow('medication_logs', db, {
            user_id: med.user_id,
            medication_id: med.id,
            scheduled_time: scheduled.toISOString(),
            status: 'pending',
            taken_at: null,
            notes: '',
          });
          changed = true;
        }
      }
    }
    if (changed) saveDB(db);
    if (changed) refresh();
  };

  // Run once when meds/logs load
  useEffect(() => {
    if (meds.length > 0) ensureTodayLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meds]);

  const addMedication = async () => {
    if (!user || !form.name.trim()) return;
    const db = loadDB();
    const assignedUserId = targetPatientUserId || user.id;
    insertRow('medications', db, {
      user_id: assignedUserId,
      name: form.name,
      dosage: form.dosage,
      frequency: form.frequency,
      times: form.times,
      instructions: form.instructions,
      color: form.color,
      active: true,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null,
    });
    saveDB(db);
    await logAudit(user.id, 'medication.added', { name: form.name, assignedUserId });
    toast.success(t('common.save'));
    setOpen(false);
    setForm({ name: '', dosage: '', frequency: 'Twice daily', times: ['08:00', '20:00'], instructions: '', color: MED_COLORS[0] });
    refresh();
  };

  const updateLog = async (logId: string, status: MedLogStatus) => {
    if (!user) return;
    const db = loadDB();
    updateRows('medication_logs', db, 'id', logId, {
      status,
      taken_at: status === 'taken' ? new Date().toISOString() : null,
    });
    saveDB(db);
    await logAudit(user.id, 'medication.log_updated', { logId, status });
    refresh();
  };

  const deleteMed = async (med: Medication) => {
    if (!user) return;
    const db = loadDB();
    db.medications = db.medications.filter((m) => m.id !== med.id);
    saveDB(db);
    await logAudit(user.id, 'medication.deleted', { name: med.name });
    toast.success(t('common.delete'));
    refresh();
  };

  const sortedToday = [...todayLogs].sort((a, b) => parseISO(a.scheduled_time).getTime() - parseISO(b.scheduled_time).getTime());

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('meds.title')}
        subtitle={t('meds.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> {t('meds.addMedication')}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('meds.adherence')} value={`${adherence30}%`} sub={`${taken30}/${total30} · 30d`} icon={Pill} tone={adherence30 >= 80 ? 'success' : 'warning'} />
        <StatCard label={t('meds.taken')} value={takenToday} sub={t('common.today')} icon={CheckCircle2} tone="success" />
        <StatCard label={t('meds.pending')} value={todayLogs.filter((l) => l.status === 'pending').length} sub={t('common.today')} icon={Clock} tone="warning" />
      </div>

      {/* Today's schedule */}
      <Card className="p-5">
        <h2 className="mb-4 font-medium">{t('meds.todaySchedule')}</h2>
        {sortedToday.length === 0 ? (
          <EmptyState icon={Pill} title={t('meds.noMeds')} action={<Button onClick={() => setOpen(true)} variant="outline"><Plus className="mr-2 h-4 w-4" />{t('meds.addMedication')}</Button>} />
        ) : (
          <div className="space-y-2">
            {sortedToday.map((log) => {
              const med = meds.find((m) => m.id === log.medication_id);
              const scheduled = parseISO(log.scheduled_time);
              const isPast = scheduled < new Date() && log.status === 'pending';
              return (
                <div key={log.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-3">
                  <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: med?.color ?? 'hsl(var(--primary))' }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{med?.name ?? 'Medication'}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(scheduled, 'h:mm a')} · {med?.dosage} · {med?.frequency}
                    </div>
                    {med?.instructions && <div className="text-xs text-muted-foreground">{med.instructions}</div>}
                  </div>
                  {log.status === 'taken' ? (
                    <Badge className="bg-success/10 text-success"><CheckCircle2 className="mr-1 h-3 w-3" />{t('meds.taken')}</Badge>
                  ) : (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => updateLog(log.id, 'taken')}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t('meds.markTaken')}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={() => updateLog(log.id, 'skipped')}>
                        <XCircle className="h-3.5 w-3.5" /> {t('meds.markSkipped')}
                      </Button>
                    </div>
                  )}
                  {isPast && (
                    <Bell className="h-4 w-4 animate-pulse text-warning" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* All medications */}
      <Card className="p-5">
        <h2 className="mb-4 font-medium">{t('meds.title')}</h2>
        {meds.length === 0 ? (
          <EmptyState icon={Pill} title={t('meds.noMeds')} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {meds.map((m) => (
              <div key={m.id} className="rounded-xl border border-border/50 bg-muted/20 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-full" style={{ background: m.color }} />
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.dosage} · {m.frequency}</div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMed(m)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {m.instructions && <p className="mt-2 text-xs text-muted-foreground">{m.instructions}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.times.map((time) => (
                    <Badge key={time} variant="outline" className="text-[10px]">{time}</Badge>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3 w-3" />
                  {m.active ? t('common.active') : t('common.cancelled')}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('meds.addMedication')}</DialogTitle>
            <DialogDescription>{t('meds.subtitle')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('meds.name')}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Metformin" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('meds.dosage')}</Label>
                <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="500mg" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('meds.frequency')}</Label>
                <Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="Twice daily" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{t('meds.times')}</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Current: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.times.map((time, i) => (
                  <div key={i} className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border/40">
                    <Input type="time" value={time} onChange={(e) => {
                      const times = [...form.times];
                      times[i] = e.target.value;
                      setForm({ ...form, times });
                    }} className="w-28 h-8 text-xs font-mono" />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-1.5 text-[10px] font-semibold text-primary hover:bg-primary/10"
                      onClick={() => setTimeToNow(i)}
                      title="Set to current minute to test real-time notification"
                    >
                      Now
                    </Button>
                    {form.times.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setForm({ ...form, times: form.times.filter((_, idx) => idx !== i) })}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => setForm({ ...form, times: [...form.times, '12:00'] })}>
                  <Plus className="mr-1 h-3 w-3" /> {t('common.add')}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('meds.instructions')}</Label>
              <Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                {MED_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={cn('h-7 w-7 rounded-full transition-all', form.color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : '')}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={addMedication}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
