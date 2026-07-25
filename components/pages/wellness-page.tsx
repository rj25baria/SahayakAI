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
import { Smile, Frown, Meh, HeartPulse, Loader2 } from 'lucide-react';
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
          <h2 className="mb-1 text-lg font-medium">{t('wellness.howAreYou')}</h2>
          {checkedToday && (
            <p className="mb-4 text-xs text-success">✓ {t('common.today')} check-in submitted</p>
          )}

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
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
      <div className="text-xs text-muted-foreground">{format(parseISO(c.recorded_at), 'MMM d, h:mm a')}</div>
      <div className="flex items-center gap-3 text-xs">
        <span title={t('wellness.mood')}>😊{c.mood}</span>
        <span title={t('wellness.pain')}>⚡{c.pain_level}</span>
        <span title={t('wellness.sleep')}>😴{c.sleep_hours}h</span>
        <span className="font-semibold">{c.score}</span>
      </div>
    </div>
  );
}
