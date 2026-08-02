'use client';

import { useEffect, useRef } from 'react';
import { useMedications } from '@/lib/hooks';
import { recordMedicationAction } from '@/lib/store';
import { showBrowserNotification } from '@/lib/notifications';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Pill, CheckCircle2, Volume2 } from 'lucide-react';

function playMedicationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    // Multi-frequency medical alert chime (523.25 Hz C5 -> 659.25 Hz E5 -> 783.99 Hz G5 -> 1046.50 Hz C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.3, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.4);
    });
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export function MedicationReminderListener() {
  const { meds, refresh } = useMedications();
  const checkedKeyRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkReminders = () => {
      if (!meds || meds.length === 0) return;

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentHHmm = `${hh}:${mm}`;
      const todayDateStr = now.toISOString().slice(0, 10);

      meds.forEach((med) => {
        if (!med.active || !med.times) return;

        med.times.forEach((scheduledTime) => {
          // Check if scheduled time matches current clock minute (e.g., '20:50')
          if (scheduledTime === currentHHmm) {
            const triggerKey = `${med.id}_${scheduledTime}_${todayDateStr}`;

            // Check if already notified in this session or state
            if (!checkedKeyRef.current.has(triggerKey)) {
              // Check sessionStorage
              const storageKey = `sahayak_med_notified_${triggerKey}`;
              if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) {
                checkedKeyRef.current.add(triggerKey);
                return;
              }

              // Mark as notified
              checkedKeyRef.current.add(triggerKey);
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(storageKey, 'true');
              }

              // 1. Play audible chime
              playMedicationChime();

              // 2. Trigger browser notification
              showBrowserNotification(
                `⏰ Medicine Reminder: ${med.name}`,
                `It is ${currentHHmm}! Time to take ${med.dosage}. ${med.instructions || ''}`,
                'warning'
              );

              // 3. Render interactive Toast alert
              toast.custom(
                (tId) => (
                  <div className="flex flex-col gap-2.5 rounded-xl border-2 border-primary bg-card p-4 shadow-2xl text-card-foreground">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md animate-bounce">
                          <Pill className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                            <Volume2 className="h-3.5 w-3.5 text-primary" /> REAL-TIME MEDICATION REMINDER ({currentHHmm})
                          </div>
                          <div className="text-base font-bold tracking-tight">
                            {med.name} <span className="text-sm font-normal text-muted-foreground">({med.dosage})</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {med.instructions && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg border">
                        💡 {med.instructions}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        size="sm"
                        className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex-1 gap-1.5 shadow-sm"
                        onClick={() => {
                          toast.dismiss(tId);
                          recordMedicationAction(med.id, scheduledTime, 'taken');
                          refresh();
                          toast.success(`Taken: ${med.name} (${med.dosage}) recorded!`, {
                            description: `Logged at ${currentHHmm} into patient chart and synced with Doctor portal.`,
                          });
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Mark as Taken
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-xs text-muted-foreground"
                        onClick={() => toast.dismiss(tId)}
                      >
                        Snooze
                      </Button>
                    </div>
                  </div>
                ),
                { duration: 25000 }
              );
            }
          }
        });
      });
    };

    // Run check immediately and then every 3 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 3000);
    return () => clearInterval(interval);
  }, [meds, refresh]);

  return null;
}
