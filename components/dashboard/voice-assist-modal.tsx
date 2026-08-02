'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { loadDB, saveDB, insertRow } from '@/lib/store';
import { evaluateWellness } from '@/lib/risk-engine';
import { logAudit } from '@/lib/audit';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Sparkles, CheckCircle2, AlertTriangle, Pill, HeartPulse, Send, Volume2, ShieldCheck, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoiceAssistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const VOICE_PRESETS = [
  {
    category: 'medication',
    label: 'Took Morning BP Medication',
    text: 'I took my morning blood pressure pill (Amlodipine 5mg) on time.',
    icon: Pill,
    badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  {
    category: 'medication',
    label: 'Skipped Dose (Nausea)',
    text: 'Skipped my afternoon diabetes dose because I felt slightly nauseous.',
    icon: Pill,
    badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  {
    category: 'symptom',
    label: 'Feeling Dizzy & Headache',
    text: 'Feeling slightly dizzy with a mild headache after my morning walk.',
    icon: HeartPulse,
    badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
  {
    category: 'wellness',
    label: 'Feeling Great & Active',
    text: 'Feeling healthy today, completed my morning stretching and took all medicines.',
    icon: CheckCircle2,
    badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  },
];

export function VoiceAssistModal({ open, onOpenChange, onSuccess }: VoiceAssistModalProps) {
  const { user, profile } = useAuth();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const SpeechRec = SpeechRecognition as unknown as new () => {
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onresult: (event: { resultIndex: number; results: Array<Array<{ transcript: string }>> }) => void;
          onerror: (err: unknown) => void;
          onend: () => void;
          start: () => void;
          stop: () => void;
        };
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = profile?.language === 'hi' ? 'hi-IN' : 'en-US';

        recognition.onresult = (event) => {
          let currentText = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
          }
          setTranscript(currentText);
        };

        recognition.onerror = (err) => {
          console.warn('Speech recognition error:', err);
          setListening(false);
        };

        recognition.onend = () => {
          setListening(false);
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('SpeechRecognition init error:', e);
      }
    }
  }, [profile?.language]);

  const toggleListening = () => {
    const rec = recognitionRef.current as { start?: () => void; stop?: () => void } | null;
    if (listening) {
      rec?.stop?.();
      setListening(false);
      toast.info('Voice recording stopped');
    } else {
      if (!rec) {
        toast.info('Microphone access unavailable or unsupported browser.', {
          description: 'You can tap any preset voice card below or type your status directly.',
        });
        return;
      }
      try {
        setTranscript('');
        setListening(true);
        rec.start?.();
        toast.info('Listening for your voice input... 🎙️', {
          description: 'Speak your symptoms or medication status clearly.',
        });
      } catch (e) {
        console.error(e);
        setListening(false);
      }
    }
  };

  const handlePresetSelect = (presetText: string) => {
    setTranscript(presetText);
    toast.success('Voice preset selected! Tap "Log Wellness Note" to record.');
  };

  const handleLogNote = async () => {
    if (!transcript.trim()) {
      toast.error('Please record or type a status note before submitting.');
      return;
    }

    if (!user) {
      toast.error('User session not found.');
      return;
    }

    setSubmitting(true);
    try {
      const lower = transcript.toLowerCase();

      // Analyze transcript for symptoms and medication keywords
      const hasDizziness = lower.includes('dizzy') || lower.includes('headache') || lower.includes('nausea') || lower.includes('pain');
      const hasChestPain = lower.includes('chest') || lower.includes('breath') || lower.includes('severe');
      const mentionsMed = lower.includes('took') || lower.includes('medicine') || lower.includes('pill') || lower.includes('dose');
      const skippedMed = lower.includes('skipped') || lower.includes('missed') || lower.includes('forgot');

      let inferredPain = 0;
      let inferredMood = 4; // default good
      let inferredRiskLevel: 'normal' | 'elevated' | 'warning' | 'critical' = 'normal';

      if (hasChestPain) {
        inferredPain = 7;
        inferredMood = 2;
        inferredRiskLevel = 'warning';
      } else if (hasDizziness || skippedMed) {
        inferredPain = 3;
        inferredMood = 3;
        inferredRiskLevel = 'elevated';
      }

      const { score, level } = evaluateWellness({
        mood: inferredMood,
        pain_level: inferredPain,
        sleep_hours: 7,
        appetite: 'normal',
        mobility: 'normal',
        energy: inferredMood,
      });

      const finalRiskLevel = inferredRiskLevel === 'warning' ? 'warning' : level;

      const db = loadDB();

      // Insert Wellness Check-in Note
      const noteContent = `[Voice Assist Report 🎙️]: "${transcript.trim()}" | Auto-Analysis: ${
        mentionsMed ? (skippedMed ? 'Medication Skipped' : 'Medication Taken') : 'Symptom Log'
      }`;

      insertRow('wellness_checkins', db, {
        user_id: user.id,
        mood: inferredMood,
        pain_level: inferredPain,
        sleep_hours: 7,
        appetite: 'normal',
        mobility: 'normal',
        energy: inferredMood,
        notes: noteContent,
        score: score,
        risk_level: finalRiskLevel,
        recorded_at: new Date().toISOString(),
      });

      // If medication reported as taken, mark latest pending medication log as taken
      if (mentionsMed && !skippedMed) {
        const todayStr = new Date().toISOString().split('T')[0];
        const pendingLog = db.medication_logs.find(
          (m) => m.user_id === user.id && m.status === 'pending' && m.scheduled_time.startsWith(todayStr)
        );
        if (pendingLog) {
          pendingLog.status = 'taken';
          pendingLog.taken_at = new Date().toISOString();
          pendingLog.notes = 'Voice Assist Check-in';
        }
      }

      // If critical/elevated symptoms, create caregiver alert
      if (hasChestPain || hasDizziness || skippedMed) {
        insertRow('alerts', db, {
          user_id: user.id,
          type: 'voice_symptom_report',
          severity: hasChestPain ? 'critical' : 'warning',
          title: hasChestPain
            ? 'Critical Symptom Reported via Voice'
            : skippedMed
            ? 'Medication Skipped Reported via Voice'
            : 'Elevated Symptom Reported via Voice',
          message: `Elder ${profile?.full_name || 'Patient'} reported: "${transcript.trim()}"`,
          explanation: `Automated Voice Assist symptom log flagged for caregiver review.`,
          metric: 'voice_note',
          metric_value: null,
          threshold: 'patient_report',
          dismissed: false,
          escalated: false,
          source: 'manual',
        });
      }

      saveDB(db);

      await logAudit(user.id, 'voice_assist.wellness_note_logged', {
        transcript: transcript.trim(),
        risk_level: finalRiskLevel,
      });

      // Dispatch custom sync event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sahayak-db-updated'));
      }

      toast.success('Voice Wellness Note Logged! 🎙️👍', {
        description: 'Logged to Wellness history & caregivers notified.',
      });

      setTranscript('');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save voice note.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-2 border-primary/30 bg-card p-6 shadow-2xl">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold px-2.5 py-1">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Voice Wellness Assist
            </Badge>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Caregiver Synced
            </Badge>
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Speak Symptoms or Medication Status
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Report how you feel or if you took your medicines. Your voice note is automatically analyzed and saved to your Wellness history for your family & caregivers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Main Voice Capture Box */}
          <Card className={cn(
            'p-4 border-2 transition-all relative overflow-hidden',
            listening ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20' : 'border-primary/30 bg-muted/30'
          )}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Volume2 className="h-4 w-4 text-primary" /> Live Voice Input Transcript
              </span>

              {listening && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span> Recording Live...
                </span>
              )}
            </div>

            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Tap the microphone below and speak: e.g. 'I took my morning blood pressure pill' or 'I am feeling a bit dizzy today'..."
              rows={3}
              className="resize-none border-primary/20 bg-background text-sm leading-relaxed"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                onClick={toggleListening}
                size="lg"
                className={cn(
                  'font-bold gap-2 text-white transition-all shadow-md',
                  listening ? 'bg-amber-600 hover:bg-amber-700 animate-pulse' : 'bg-primary hover:bg-primary/90'
                )}
              >
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {listening ? 'Stop Microphone' : 'Start Microphone 🎙️'}
              </Button>

              {transcript && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTranscript('')}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear Transcript
                </Button>
              )}
            </div>
          </Card>

          {/* Quick Voice Presets for Elders */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>Quick Voice Presets (1-Tap Input)</span>
              <span className="text-[10px] normal-case font-normal">Tap any card to fill transcript</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VOICE_PRESETS.map((preset, idx) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetSelect(preset.text)}
                    className="p-3 text-left rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/40 transition-all group flex items-start gap-2.5 active:scale-98"
                  >
                    <Icon className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span className="truncate">{preset.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                        &quot;{preset.text}&quot;
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/60">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleLogNote}
              disabled={submitting || !transcript.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-5"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Saving...' : 'Log Wellness Note 💬'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
