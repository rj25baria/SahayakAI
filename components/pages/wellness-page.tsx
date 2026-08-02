'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { useWellness } from '@/lib/hooks';
import { PageHeader, RiskBadge } from '@/components/dashboard/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Smile, Frown, Meh, HeartPulse, Loader2, Mic, Sparkles } from 'lucide-react';
import { VoiceAssistModal } from '@/components/dashboard/voice-assist-modal';
import { evaluateWellness, riskLevelLabel } from '@/lib/risk-engine';
import { logAudit } from '@/lib/audit';
import { loadDB, saveDB, insertRow } from '@/lib/store';
import { toast } from 'sonner';
import { format, parseISO, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WellnessCheckin } from '@/lib/types';

export function WellnessPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { checkins, refresh } = useWellness();
  const [submitting, setSubmitting] = useState(false);
  const [mood, setMood] = useState(3);
  const [pain, setPain] = useState(0);
  const [sleep, setSleep] = useState(7);
  const [energy, setEnergy] = useState(3);
  const [appetite, setAppetite] = useState<'low' | 'normal' | 'high'>('normal');
  const [mobility, setMobility] = useState<'impaired' | 'normal' | 'good'>('normal');
  const [notes, setNotes] = useState('');

  const [voiceAssistOpen, setVoiceAssistOpen] = useState(false);
  const checkedToday = checkins.some((c) => isToday(parseISO(c.recorded_at)));
  const latest = checkins[0];

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    const { score, level, factors } = evaluateWellness({
      mood, pain_level: pain, sleep_hours: sleep, appetite, mobility, energy,
    });
    const db = loadDB();
    insertRow('wellness_checkins', db, {
      user_id: user.id,
      mood, pain_level: pain, sleep_hours: sleep, appetite, mobility, energy,
      notes, score, risk_level: level,
      recorded_at: new Date().toISOString(),
    });
    if (factors.length > 0) {
      for (const f of factors) {
        insertRow('alerts', db, {
          user_id: user.id,
          type: `wellness_${f.metric}`,
          severity: f.severity,
          title: f.message,
          message: f.message,
          explanation: `Wellness check-in: ${f.value} (threshold ${f.threshold}).`,
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
    await logAudit(user.id, 'wellness.checkin', { score, level });
    toast.success(t('wellness.score') + `: ${score}`);
    refresh();
    setSubmitting(false);
  };

  const moodIcons = [Frown, Frown, Meh, Smile, Smile];

  return (
    <div className="space-y-6">
      <PageHeader title={t('wellness.title')} subtitle={t('wellness.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Check-in form */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">{t('wellness.howAreYou')}</h2>
              {checkedToday && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ {t('common.today')} check-in submitted</p>
              )}
            </div>

            <Button
              onClick={() => setVoiceAssistOpen(true)}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-xs h-9 px-3.5 shadow-sm"
            >
              <Mic className="h-4 w-4" /> Voice Report Symptoms / Meds 🎙️
            </Button>
          </div>

          <VoiceAssistModal open={voiceAssistOpen} onOpenChange={setVoiceAssistOpen} onSuccess={refresh} />

          <div className="space-y-6">
            {/* Mood */}
            <div>
              <Label className="mb-3 block">{t('wellness.mood')}: <span className="font-semibold">{mood}/5</span></Label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((v) => {
                  const Icon = moodIcons[v - 1];
                  return (
                    <button
                      key={v}
                      onClick={() => setMood(v)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border py-3 transition-all',
                        mood === v ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <Icon className={cn('h-6 w-6', mood === v ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="text-xs">{v}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pain */}
            <div>
              <Label className="mb-2 block">{t('wellness.pain')}: <span className="font-semibold">{pain}/10</span></Label>
              <Slider value={[pain]} onValueChange={(v) => setPain(v[0])} min={0} max={10} step={1} />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>0</span><span>10</span>
              </div>
            </div>

            {/* Sleep */}
            <div>
              <Label className="mb-2 block">{t('wellness.sleep')}: <span className="font-semibold">{sleep}h</span></Label>
              <Slider value={[sleep]} onValueChange={(v) => setSleep(v[0])} min={0} max={12} step={0.5} />
            </div>

            {/* Energy */}
            <div>
              <Label className="mb-2 block">{t('wellness.energy')}: <span className="font-semibold">{energy}/5</span></Label>
              <Slider value={[energy]} onValueChange={(v) => setEnergy(v[0])} min={1} max={5} step={1} />
            </div>

            {/* Appetite + Mobility */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block">{t('wellness.appetite')}</Label>
                <div className="flex gap-2">
                  {(['low', 'normal', 'high'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setAppetite(v)}
                      className={cn('flex-1 rounded-lg border py-2 text-sm capitalize transition-all', appetite === v ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-muted/50')}
                    >
                      {t(`wellness.${v}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">{t('wellness.mobility')}</Label>
                <div className="flex gap-2">
                  {(['impaired', 'normal', 'good'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setMobility(v)}
                      className={cn('flex-1 rounded-lg border py-2 text-sm transition-all', mobility === v ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-muted/50')}
                    >
                      {t(`wellness.${v}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">{t('wellness.notes')}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="…" />
            </div>

            <Button onClick={submit} disabled={submitting} size="lg" className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('wellness.submit')}
            </Button>
          </div>
        </Card>

        {/* Latest score + history */}
        <div className="space-y-6">
          <Card className="p-6 text-center">
            <HeartPulse className="mx-auto mb-3 h-8 w-8 text-primary" />
            <div className="text-4xl font-semibold tracking-tight">{latest?.score ?? '—'}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t('wellness.score')}</div>
            {latest && (
              <div className="mt-3 flex justify-center">
                <RiskBadge level={latest.risk_level} label={riskLevelLabel(latest.risk_level, t)} />
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-medium">{t('wellness.history')}</h2>
            <div className="space-y-2">
              {checkins.slice(0, 8).map((c) => (
                <WellnessHistoryRow key={c.id} c={c} t={t} />
              ))}
              {checkins.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">{t('common.noData')}</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function WellnessHistoryRow({ c, t }: { c: WellnessCheckin; t: (k: string) => string }) {
  const isVoice = c.notes?.includes('[Voice Assist');
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{format(parseISO(c.recorded_at), 'MMM d, h:mm a')}</span>
          {isVoice && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full">
              <Mic className="h-3 w-3" /> Voice Note
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span title={t('wellness.mood')}>😊 {c.mood}/5</span>
          <span title={t('wellness.pain')}>⚡ {c.pain_level}/10</span>
          <span className="font-bold text-primary">{c.score} pts</span>
        </div>
      </div>

      {c.notes && (
        <p className="text-xs text-foreground/90 bg-background/60 p-2 rounded-lg border border-border/40 mt-1 leading-snug">
          {c.notes}
        </p>
      )}
    </div>
  );
}
