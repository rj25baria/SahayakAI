'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { useCheckinPrompts } from '@/lib/hooks';
import { respondElderCheckin, triggerNoResponseTimeout, triggerElderCheckinPrompt } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeartPulse, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function NoResponseCheckinModal() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { prompts, refresh } = useCheckinPrompts();
  const activePrompt = prompts.find((p) => p.status === 'pending');

  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!activePrompt) {
      setTimeLeft(30);
      return;
    }

    setTimeLeft(activePrompt.timeout_seconds || 30);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Trigger timeout
          triggerNoResponseTimeout(activePrompt.id);
          toast.error('Check-in timeout! Alerting family & guardians...', {
            description: 'Elder did not respond within the timeframe.',
          });
          refresh();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activePrompt, refresh]);

  if (profile?.role !== 'patient') return null;

  const handleRespondOkay = () => {
    if (!activePrompt) return;
    respondElderCheckin(activePrompt.id);
    toast.success('Response Recorded! Thank you Aarav 🙏', {
      description: 'Your family and care team have been notified that you are safe.',
    });
    refresh();
  };

  const handleManualTestTrigger = () => {
    if (!user) return;
    triggerElderCheckinPrompt(user.id, 'Are you feeling okay today?', 30);
    toast.info('Wellness Check-in Prompt Triggered!', {
      description: 'Respond with "YES, I\'M OKAY" or let timer expire to test family escalation.',
    });
    refresh();
  };

  return (
    <div className="space-y-4">
      {activePrompt ? (
        <Card className="relative overflow-hidden border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-background p-6 shadow-xl animate-pulse-subtle">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg mb-3">
              <HeartPulse className="h-9 w-9 animate-bounce" />
            </div>

            <Badge variant="outline" className="mb-2 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-xs font-semibold px-3 py-1">
              <Clock className="mr-1 h-3.5 w-3.5" /> Scheduled Wellness Check-in
            </Badge>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Are you doing okay right now?
            </h2>

            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Please tap the big button below to confirm you are safe. If you do not respond in <span className="font-bold text-emerald-600 dark:text-emerald-400">{timeLeft}s</span>, your family and nearby volunteers will be alerted.
            </p>

            {/* Huge Elder-Friendly Button */}
            <div className="mt-6 w-full max-w-sm">
              <Button
                onClick={handleRespondOkay}
                size="lg"
                className="w-full h-20 text-xl font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white shadow-xl rounded-2xl flex items-center justify-center gap-3 border-2 border-emerald-400"
              >
                <CheckCircle2 className="h-8 w-8 shrink-0" />
                <span>YES, I&apos;M OKAY 👍</span>
              </Button>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Sahayak Elder Safety Guard Active</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 border-dashed border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Scheduled Wellness Check-in</div>
              <div className="text-xs text-muted-foreground">Next scheduled prompt in 2 hours or trigger demo check-in below</div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleManualTestTrigger} className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Test Check-in Prompt
          </Button>
        </Card>
      )}
    </div>
  );
}
