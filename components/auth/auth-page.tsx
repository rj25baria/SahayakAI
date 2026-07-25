'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { HeartPulse, Loader2, User, Users, Stethoscope } from 'lucide-react';
import type { Role, Language } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AuthPage() {
  const { signIn, signUp, signInPatient, signInGuardian, signInDoctor } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('patient');
  const [language, setLanguage] = useState<Language>('en');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password, {
        full_name: fullName,
        role,
        language,
        phone,
      });
      if (error) setError(error);
    }
    setBusy(false);
  };

  const roles: { value: Role; icon: typeof User; label: string; desc: string }[] = [
    { value: 'patient', icon: User, label: t('auth.patient'), desc: t('auth.patientDesc') },
    { value: 'guardian', icon: Users, label: t('auth.guardian'), desc: t('auth.guardianDesc') },
    { value: 'doctor', icon: Stethoscope, label: t('auth.doctor'), desc: t('auth.doctorDesc') },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 -z-10 bg-background" />
      <div className="absolute inset-0 -z-10 gradient-hero" />
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="gradient-primary flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg shadow-primary/30">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl font-semibold tracking-tight">{t('app.name')}</div>
            <div className="text-xs text-muted-foreground">{t('app.tagline')}</div>
          </div>
        </div>

        <Card className="w-full max-w-md animate-scale-in border-border/60 shadow-xl shadow-black/5">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">
              {mode === 'signin' ? t('auth.welcomeBack') : t('auth.createAccount')}
            </CardTitle>
            <CardDescription>
              {mode === 'signin' ? t('auth.signInDesc') : t('auth.signUpDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t('auth.fullName')}</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    className="h-11"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="h-11"
                />
              </div>

              {mode === 'signup' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{t('auth.phone')}</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      className="h-11"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('auth.role')}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {roles.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setRole(r.value)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all',
                            role === r.value
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                              : 'border-border hover:border-primary/40 hover:bg-muted/50'
                          )}
                        >
                          <r.icon className="h-5 w-5" />
                          <span className="text-xs font-medium">{r.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {roles.find((r) => r.value === role)?.desc}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('auth.language')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['en', 'hi'] as Language[]).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setLanguage(l)}
                          className={cn(
                            'rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                            language === l
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                              : 'border-border hover:border-primary/40 hover:bg-muted/50'
                          )}
                        >
                          {l === 'en' ? 'English' : 'हिन्दी'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={busy} className="h-11 w-full" size="lg">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
              </Button>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Try a role demo</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto flex-col items-center gap-1.5 py-3 text-xs"
                  size="lg"
                  disabled={busy}
                  onClick={async () => {
                    setError(null);
                    setBusy(true);
                    const r = await signInPatient();
                    setBusy(false);
                    if (r.error) setError(r.error);
                  }}
                >
                  <User className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Patient</span>
                  <span className="text-[10px] text-muted-foreground">Aarav Sharma</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-auto flex-col items-center gap-1.5 py-3 text-xs"
                  size="lg"
                  disabled={busy}
                  onClick={async () => {
                    setError(null);
                    setBusy(true);
                    const r = await signInGuardian();
                    setBusy(false);
                    if (r.error) setError(r.error);
                  }}
                >
                  <Users className="h-5 w-5 text-sky-500" />
                  <span className="font-semibold">Guardian</span>
                  <span className="text-[10px] text-muted-foreground">Rohan Sharma</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-auto flex-col items-center gap-1.5 py-3 text-xs"
                  size="lg"
                  disabled={busy}
                  onClick={async () => {
                    setError(null);
                    setBusy(true);
                    const r = await signInDoctor();
                    setBusy(false);
                    if (r.error) setError(r.error);
                  }}
                >
                  <Stethoscope className="h-5 w-5 text-emerald-500" />
                  <span className="font-semibold">Doctor</span>
                  <span className="text-[10px] text-muted-foreground">Dr. Priya Mehta</span>
                </Button>
              </div>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or sign in manually</span>
                </div>
              </div>
            </form>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
                className="font-medium text-primary hover:underline"
              >
                {mode === 'signin' ? t('auth.signUp') : t('auth.signIn')}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
