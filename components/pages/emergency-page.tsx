'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { useGuardians, useEmergencies, useQrCard } from '@/lib/hooks';
import { PageHeader, EmptyState, RiskBadge } from '@/components/dashboard/shared';
import { QrCardDisplay } from '@/components/emergency/qr-card-display';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Siren, Users, Plus, ShieldCheck, Navigation, MessageSquare, CheckCircle2, XCircle, Loader2, MapPin, Radio, Phone,
} from 'lucide-react';
import { logAudit } from '@/lib/audit';
import { loadDB, saveDB, insertRow, updateRows, maybeSingleEq } from '@/lib/store';
import { notifyGuardians } from '@/lib/notifications';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import type { GuardianRole, GuardianStatus, EmergencyRequest } from '@/lib/types';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<GuardianRole, string> = {
  family: 'emergency.roleFamily',
  neighbour: 'emergency.roleNeighbour',
  volunteer: 'emergency.roleVolunteer',
  ngo: 'emergency.roleNgo',
  security: 'emergency.roleSecurity',
  doctor: 'emergency.roleDoctor',
};

export function EmergencyPage() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { guardians, refresh: refreshGuardians } = useGuardians();
  const { emergencies, updates, refresh: refreshEmergencies } = useEmergencies();
  const { card } = useQrCard();
  const [addOpen, setAddOpen] = useState(false);
  const [sosBusy, setSosBusy] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<Record<string, string>>({});
  const [newGuardianEmail, setNewGuardianEmail] = useState('');
  const [newGuardianRole, setNewGuardianRole] = useState<GuardianRole>('family');

  const isGuardian = profile?.role === 'guardian' || profile?.role === 'doctor';
  const publicUrl = card ? `${typeof window !== 'undefined' ? window.location.origin : ''}/qr/${card.share_token}` : '';
  const activeEmergency = emergencies.find((e) => e.status === 'active' || e.status === 'accepted');
  const acceptedGuardians = guardians.filter((g) => g.status === 'accepted');

  const triggerSOS = async () => {
    if (!user) return;
    setSosBusy(true);
    const db = loadDB();
    const data = insertRow('emergency_requests', db, {
      patient_user_id: user.id,
      type: 'medical',
      severity: 'critical',
      status: 'active',
      lat: profile?.lat ?? null,
      lng: profile?.lng ?? null,
      address: profile?.address ?? '',
    }) as EmergencyRequest;
    saveDB(db);
    const reqId = data?.id;
    await logAudit(user.id, 'emergency.sos_triggered', { requestId: reqId }, 'critical');
    const db2 = loadDB();
    insertRow('alerts', db2, {
      user_id: user.id,
      type: 'emergency_sos',
      severity: 'critical',
      title: 'Emergency SOS triggered',
      message: `${acceptedGuardians.length} guardian(s) notified.`,
      explanation: 'Manual SOS triggered by patient. All accepted guardians alerted.',
      metric: '',
      metric_value: null,
      threshold: '',
      dismissed: false,
      source: 'manual',
      escalated: true,
    });
    saveDB(db2);
    const mapsUrl = profile?.lat && profile?.lng ? `https://www.google.com/maps?q=${profile.lat},${profile.lng}` : undefined;
    await notifyGuardians(
      user.id,
      acceptedGuardians as { guardian_profile?: { phone: string; full_name: string } }[],
      {
        patient_name: profile?.full_name ?? 'Patient',
        patient_phone: profile?.phone,
        severity: 'critical',
        title: 'EMERGENCY SOS',
        message: 'Patient has triggered an emergency SOS. Please respond immediately.',
        explanation: 'Manual SOS triggered by the patient via the SAHAYAK app.',
        address: profile?.address,
        maps_url: mapsUrl,
      }
    );
    toast.success(t('emergency.activeEmergency'));
    refreshEmergencies();
    setSosBusy(false);
  };

  const cancelEmergency = async (req: EmergencyRequest) => {
    const db = loadDB();
    updateRows('emergency_requests', db, 'id', req.id, { status: 'cancelled', resolved_at: new Date().toISOString() });
    saveDB(db);
    if (user) await logAudit(user.id, 'emergency.cancelled', { requestId: req.id }, 'warning');
    toast.success(t('common.cancelled'));
    refreshEmergencies();
  };

  const acceptEmergency = async (req: EmergencyRequest) => {
    if (!user) return;
    const db = loadDB();
    updateRows('emergency_requests', db, 'id', req.id, {
      status: 'accepted', accepted_by: user.id, accepted_at: new Date().toISOString(),
    });
    insertRow('emergency_status_updates', db, {
      request_id: req.id, guardian_user_id: user.id, status: 'enroute', eta_minutes: 8, message: 'Responding now',
      lat: null, lng: null,
    });
    saveDB(db);
    await logAudit(user.id, 'emergency.accepted', { requestId: req.id }, 'critical');
    toast.success(t('emergency.accept'));
    refreshEmergencies();
  };

  const resolveEmergency = async (req: EmergencyRequest) => {
    const db = loadDB();
    updateRows('emergency_requests', db, 'id', req.id, { status: 'resolved', resolved_at: new Date().toISOString() });
    if (user) {
      insertRow('emergency_status_updates', db, {
        request_id: req.id, guardian_user_id: user.id, status: 'resolved', message: 'Situation resolved',
        lat: null, lng: null, eta_minutes: null,
      });
    }
    saveDB(db);
    if (user) await logAudit(user.id, 'emergency.resolved', { requestId: req.id }, 'info');
    toast.success(t('common.resolved'));
    refreshEmergencies();
  };

  const sendUpdate = async (req: EmergencyRequest) => {
    const msg = updateMsg[req.id]?.trim();
    if (!msg || !user) return;
    const db = loadDB();
    insertRow('emergency_status_updates', db, {
      request_id: req.id, guardian_user_id: user.id, status: 'update', message: msg,
      lat: null, lng: null, eta_minutes: null,
    });
    saveDB(db);
    setUpdateMsg({ ...updateMsg, [req.id]: '' });
    refreshEmergencies();
  };

  const addGuardian = async () => {
    if (!user || !newGuardianEmail.trim()) return;
    const db = loadDB();
    const gProfile = db.profiles.find((p) => p.phone === newGuardianEmail.trim());
    if (!gProfile) {
      toast.error('No SAHAYAK user found with that phone. Ask them to sign up first.');
      return;
    }
    insertRow('guardians', db, {
      guardian_user_id: gProfile.id,
      patient_user_id: user.id,
      role: newGuardianRole,
      verified: false,
      status: 'pending',
      trust_level: 0,
      notes: '',
    });
    saveDB(db);
    await logAudit(user.id, 'guardian.invited', { role: newGuardianRole });
    toast.success(t('emergency.addGuardian'));
    setAddOpen(false);
    setNewGuardianEmail('');
    refreshGuardians();
  };

  const updateGuardianStatus = async (guardianId: string, status: GuardianStatus) => {
    const db = loadDB();
    updateRows('guardians', db, 'id', guardianId, { status });
    saveDB(db);
    if (user) await logAudit(user.id, 'guardian.status_updated', { guardianId, status });
    refreshGuardians();
  };

  const openPublic = () => {
    if (publicUrl) window.open(publicUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('emergency.title')} subtitle={t('emergency.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: QR + SOS */}
        <div className="space-y-6">
          {!isGuardian && card && (
            <QrCardDisplay url={publicUrl} patientName={profile?.full_name || 'Patient'} onOpen={openPublic} t={t} />
          )}

          {!isGuardian && (
            <Card className={cn('overflow-hidden', activeEmergency ? 'border-destructive/40' : '')}>
              <div className="bg-destructive px-5 py-4 text-white">
                <div className="flex items-center gap-2">
                  <Siren className="h-5 w-5" />
                  <span className="font-medium">{activeEmergency ? t('emergency.activeEmergency') : t('emergency.triggerSOS')}</span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-muted-foreground">{t('emergency.sosDesc')}</p>
                {activeEmergency ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg bg-destructive/5 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 text-destructive">
                        <Radio className="h-4 w-4 animate-pulse" /> Active · {format(parseISO(activeEmergency.created_at), 'h:mm a')}
                      </div>
                      {activeEmergency.address && <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{activeEmergency.address}</div>}
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => cancelEmergency(activeEmergency)}>
                      <XCircle className="mr-2 h-4 w-4" /> {t('emergency.cancelEmergency')}
                    </Button>
                  </div>
                ) : (
                  <Button variant="destructive" className="mt-4 w-full animate-pulse-ring" size="lg" onClick={triggerSOS} disabled={sosBusy}>
                    {sosBusy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Siren className="mr-2 h-5 w-5" />}
                    {t('emergency.triggerSOS')}
                  </Button>
                )}
                <div className="mt-3 text-xs text-muted-foreground">
                  {acceptedGuardians.length} {t('emergency.guardians').toLowerCase()}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Guardian network + emergencies */}
        <div className="space-y-6 lg:col-span-2">
          {/* Active emergencies for guardians */}
          {isGuardian && (
            <Card className="p-5">
              <h2 className="mb-4 font-medium">{t('emergency.activeEmergency')}</h2>
              {emergencies.filter((e) => e.status === 'active' || e.status === 'accepted').length === 0 ? (
                <EmptyState icon={Siren} title={t('emergency.noEmergencies')} />
              ) : (
                <div className="space-y-3">
                  {emergencies.filter((e) => e.status === 'active' || e.status === 'accepted').map((req) => (
                    <EmergencyCard
                      key={req.id}
                      req={req}
                      updates={updates[req.id] ?? []}
                      isGuardian={isGuardian}
                      currentUserId={user?.id}
                      onAccept={() => acceptEmergency(req)}
                      onResolve={() => resolveEmergency(req)}
                      onCancel={() => cancelEmergency(req)}
                      onSendUpdate={() => sendUpdate(req)}
                      updateMsg={updateMsg[req.id] ?? ''}
                      setUpdateMsg={(v) => setUpdateMsg({ ...updateMsg, [req.id]: v })}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Guardian network */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-medium">{t('emergency.guardians')}</h2>
                <p className="text-xs text-muted-foreground">{t('emergency.guardiansDesc')}</p>
              </div>
              {!isGuardian && (
                <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> {t('emergency.addGuardian')}
                </Button>
              )}
            </div>
            {guardians.length === 0 ? (
              <EmptyState icon={Users} title={t('emergency.noGuardians')} />
            ) : (
              <div className="space-y-2">
                {guardians.map((g) => {
                  const other = isGuardian ? g.patient_profile : g.guardian_profile;
                  const initials = (other?.full_name || 'U').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <div key={g.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{other?.full_name ?? 'User'}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">{t(ROLE_LABELS[g.role])}</Badge>
                          {other?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{other.phone}</span>}
                        </div>
                      </div>
                      {g.verified && <ShieldCheck className="h-4 w-4 text-success" />}
                      {g.status === 'pending' && isGuardian ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateGuardianStatus(g.id, 'accepted')}>{t('common.accept')}</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateGuardianStatus(g.id, 'declined')}>{t('common.declined')}</Button>
                        </div>
                      ) : (
                        <Badge className={cn('text-[10px]', g.status === 'accepted' ? 'bg-success/10 text-success' : g.status === 'declined' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning')}>
                          {t(`common.${g.status}`)}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recent emergencies for patient */}
          {!isGuardian && emergencies.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-4 font-medium">{t('emergency.recentEmergencies')}</h2>
              <div className="space-y-2">
                {emergencies.slice(0, 5).map((req) => (
                  <div key={req.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
                    <RiskBadge level={req.severity === 'critical' ? 'critical' : 'warning'} label={req.severity} />
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="capitalize">{req.type}</span>
                      {req.address && <span className="text-muted-foreground"> · {req.address}</span>}
                    </div>
                    <Badge className={cn('text-[10px]', req.status === 'resolved' ? 'bg-success/10 text-success' : req.status === 'cancelled' ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive')}>
                      {t(`common.${req.status}`)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{format(parseISO(req.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add guardian dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('emergency.addGuardian')}</DialogTitle>
            <DialogDescription>{t('emergency.guardiansDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('auth.phone')}</Label>
              <Input value={newGuardianEmail} onChange={(e) => setNewGuardianEmail(e.target.value)} placeholder="+91 98765 43210" />
              <p className="text-xs text-muted-foreground">The guardian must have a SAHAYAK account with this phone number.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ROLE_LABELS) as GuardianRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setNewGuardianRole(r)}
                    className={cn('rounded-lg border py-2 text-xs transition-all', newGuardianRole === r ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-muted/50')}
                  >
                    {t(ROLE_LABELS[r])}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={addGuardian}>{t('common.add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmergencyCard({
  req, updates, isGuardian, currentUserId, onAccept, onResolve, onCancel, onSendUpdate, updateMsg, setUpdateMsg, t,
}: {
  req: EmergencyRequest;
  updates: import('@/lib/types').EmergencyStatusUpdate[];
  isGuardian: boolean;
  currentUserId?: string;
  onAccept: () => void;
  onResolve: () => void;
  onCancel: () => void;
  onSendUpdate: () => void;
  updateMsg: string;
  setUpdateMsg: (v: string) => void;
  t: (k: string, vars?: Record<string, string | number>) => string;
}) {
  const acceptedByMe = req.accepted_by === currentUserId;
  const mapsUrl = req.lat && req.lng ? `https://www.google.com/maps?q=${req.lat},${req.lng}` : req.address ? `https://www.google.com/maps?q=${encodeURIComponent(req.address)}` : null;
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-destructive">
            <Radio className="h-4 w-4 animate-pulse" />
            <span className="font-medium">{req.patient_profile?.full_name ?? 'Patient'}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {format(parseISO(req.created_at), 'MMM d, h:mm a')}
            {req.address && <span> · {req.address}</span>}
          </div>
        </div>
        <Badge className="bg-destructive text-destructive-foreground">{req.status}</Badge>
      </div>

      {mapsUrl && (
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex">
          <Button size="sm" variant="outline"><Navigation className="mr-2 h-4 w-4" /> {t('emergency.navigate')}</Button>
        </a>
      )}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {isGuardian && req.status === 'active' && (
          <Button size="sm" variant="destructive" onClick={onAccept}><CheckCircle2 className="mr-2 h-4 w-4" /> {t('emergency.accept')}</Button>
        )}
        {isGuardian && acceptedByMe && req.status === 'accepted' && (
          <Button size="sm" variant="outline" onClick={onResolve}><CheckCircle2 className="mr-2 h-4 w-4" /> {t('common.resolved')}</Button>
        )}
        {!isGuardian && (req.status === 'active' || req.status === 'accepted') && (
          <Button size="sm" variant="outline" onClick={onCancel}><XCircle className="mr-2 h-4 w-4" /> {t('emergency.cancelEmergency')}</Button>
        )}
      </div>

      {/* Live updates */}
      {updates.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-border/50 pt-3">
          <div className="text-xs font-medium text-muted-foreground">{t('emergency.liveUpdates')}</div>
          {updates.map((u) => (
            <div key={u.id} className="flex items-start gap-2 text-xs">
              <span className={cn('mt-1 h-1.5 w-1.5 rounded-full', u.status === 'resolved' ? 'bg-success' : u.status === 'enroute' ? 'bg-warning' : 'bg-primary')} />
              <span className="text-muted-foreground">{format(parseISO(u.created_at), 'h:mm a')}</span>
              <span>{u.guardian_profile?.full_name ?? 'Guardian'}: {u.message || u.status}</span>
              {u.eta_minutes && <span className="text-muted-foreground">· {t('emergency.eta', { min: u.eta_minutes })}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Send update (accepted guardian only) */}
      {isGuardian && acceptedByMe && req.status === 'accepted' && (
        <div className="mt-3 flex gap-2">
          <Input value={updateMsg} onChange={(e) => setUpdateMsg(e.target.value)} placeholder={t('emergency.sendUpdate')} onKeyDown={(e) => { if (e.key === 'Enter') onSendUpdate(); }} />
          <Button size="icon" onClick={onSendUpdate}><MessageSquare className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}
