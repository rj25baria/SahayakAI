'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import type {
  VitalReading,
  Alert,
  Medication,
  MedicationLog,
  WellnessCheckin,
  Guardian,
  EmergencyRequest,
  EmergencyStatusUpdate,
  QrCard,
  Profile,
} from '@/lib/types';
import {
  loadDB,
  saveDB,
  selectEq,
  maybeSingleEq,
  insertRow,
  updateRows,
  upsertRow,
  generateShareToken,
  uid,
  nowISO,
} from '@/lib/store';

export function getRelevantUserIds(
  user: { id: string } | null,
  profile: Profile | null,
  db: ReturnType<typeof loadDB>
): string[] {
  if (!user) return [];
  if (!profile || profile.role === 'patient') {
    return [user.id];
  }
  if (profile.role === 'guardian') {
    const wardIds = db.guardians
      .filter((g) => g.guardian_user_id === user.id)
      .map((g) => g.patient_user_id)
      .filter(Boolean);
    const set = new Set([user.id, ...wardIds, 'demo_user_001']);
    return Array.from(set);
  }
  if (profile.role === 'doctor') {
    const patientIds = db.profiles.filter((p) => p.role === 'patient').map((p) => p.id);
    const set = new Set([user.id, ...patientIds, 'demo_user_001']);
    return Array.from(set);
  }
  return [user.id];
}

export function useVitals() {
  const { user, profile } = useAuth();
  const [vitals, setVitals] = useState<VitalReading[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const db = loadDB();
    const relIds = getRelevantUserIds(user, profile, db);
    const rows = db.vitals.filter((v) => relIds.includes(v.user_id));
    rows.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    setVitals(rows.slice(0, 100));
    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    load();
  }, [load]);

  return { vitals, loading, refresh: load };
}

export function useAlerts() {
  const { user, profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const db = loadDB();
    const relIds = getRelevantUserIds(user, profile, db);
    const rows = db.alerts.filter((a) => relIds.includes(a.user_id));
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setAlerts(rows.slice(0, 100));
    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    load();
  }, [load]);

  return { alerts, loading, refresh: load };
}

export function useMedications() {
  const { user, profile } = useAuth();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const db = loadDB();
    const relIds = getRelevantUserIds(user, profile, db);
    const mRows = db.medications.filter((m) => relIds.includes(m.user_id));
    mRows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const lRows = db.medication_logs.filter((l) => relIds.includes(l.user_id));
    lRows.sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());
    setMeds(mRows);
    setLogs(lRows.slice(0, 200));
    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    load();
  }, [load]);

  return { meds, logs, loading, refresh: load };
}

export function useWellness() {
  const { user, profile } = useAuth();
  const [checkins, setCheckins] = useState<WellnessCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const db = loadDB();
    const relIds = getRelevantUserIds(user, profile, db);
    const rows = db.wellness_checkins.filter((w) => relIds.includes(w.user_id));
    rows.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    setCheckins(rows.slice(0, 60));
    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    load();
  }, [load]);

  return { checkins, loading, refresh: load };
}

export function useCheckinPrompts() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<import('@/lib/types').CheckinPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const db = loadDB();
    const all = db.checkin_prompts || [];
    const rows = all.filter((p) => p.patient_user_id === user.id);
    rows.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    setPrompts(rows);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000); // Polling for demo responsiveness
    return () => clearInterval(interval);
  }, [load]);

  return { prompts, loading, refresh: load };
}

export function useGuardians() {
  const { user, profile } = useAuth();
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const isGuardian = profile?.role === 'guardian' || profile?.role === 'doctor';
    const col = isGuardian ? 'guardian_user_id' : 'patient_user_id';
    const db = loadDB();
    let rows = selectEq('guardians', db, col, user.id) as Guardian[];
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    // Embed joined profiles (matches original .select with joins)
    const profiles = db.profiles;
    const joined = rows.map((g) => {
      const guardian_profile = profiles.find((p) => p.id === g.guardian_user_id);
      const patient_profile = profiles.find((p) => p.id === g.patient_user_id);
      return { ...g, guardian_profile, patient_profile } as Guardian;
    });
    setGuardians(joined);
    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    load();
  }, [load]);

  return { guardians, loading, refresh: load };
}

export function useEmergencies() {
  const { user, profile } = useAuth();
  const [emergencies, setEmergencies] = useState<EmergencyRequest[]>([]);
  const [updates, setUpdates] = useState<Record<string, EmergencyStatusUpdate[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const db = loadDB();
    const allE = db.emergency_requests;
    const isGuardian = profile?.role === 'guardian' || profile?.role === 'doctor';
    let rows: EmergencyRequest[];
    if (isGuardian) {
      rows = allE.slice();
    } else {
      rows = allE.filter((e) => e.patient_user_id === user.id);
    }
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    rows = rows.slice(0, 50);
    // Attach profile joins
    const withProfiles = rows.map((e) => ({
      ...e,
      patient_profile: db.profiles.find((p) => p.id === e.patient_user_id),
      accepted_by_profile: e.accepted_by ? db.profiles.find((p) => p.id === e.accepted_by) : undefined,
    })) as EmergencyRequest[];
    setEmergencies(withProfiles);

    const ids = rows.map((e) => e.id);
    const allU = db.emergency_status_updates.filter((u) => ids.includes(u.request_id));
    allU.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const withGuardianProfile = allU.map((u) => ({
      ...u,
      guardian_profile: db.profiles.find((p) => p.id === u.guardian_user_id),
    })) as EmergencyStatusUpdate[];
    const grouped: Record<string, EmergencyStatusUpdate[]> = {};
    withGuardianProfile.forEach((u) => {
      if (!grouped[u.request_id]) grouped[u.request_id] = [];
      grouped[u.request_id].push(u);
    });
    setUpdates(grouped);
    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 2500);
    return () => clearInterval(interval);
  }, [load]);

  return { emergencies, updates, loading, refresh: load };
}

export function useQrCard() {
  const { user } = useAuth();
  const [card, setCard] = useState<QrCard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const db = loadDB();
    let c = maybeSingleEq('qr_cards', db, 'patient_user_id', user.id) as QrCard | null;
    if (!c) {
      c = insertRow('qr_cards', db, {
        patient_user_id: user.id,
        share_token: generateShareToken(),
        show_allergies: true,
        show_medications: true,
        show_conditions: true,
        show_emergency_contact: true,
        show_insurance: true,
        show_doctor: true,
        show_blood_group: true,
        active: true,
      }) as QrCard;
      saveDB(db);
    }
    setCard(c);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { card, loading, refresh: load, setCard };
}

export function useAuditLogs() {
  const { user, profile } = useAuth();
  const [logs, setLogs] = useState<import('@/lib/types').AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const db = loadDB();
    const relIds = getRelevantUserIds(user, profile, db);
    const rows = db.audit_logs.filter((a) => relIds.includes(a.user_id));
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setLogs(rows.slice(0, 200));
    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    load();
  }, [load]);

  return { logs, loading, refresh: load };
}

export function usePatientProfiles(ids: string[]) {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const idsKey = ids.join(',');

  useEffect(() => {
    if (ids.length === 0) return;
    const unique = Array.from(new Set(ids));
    const db = loadDB();
    const found = db.profiles.filter((p) => unique.includes(p.id));
    const map: Record<string, Profile> = {};
    found.forEach((p) => {
      map[p.id] = p;
    });
    setProfiles(map);
  }, [idsKey, ids]);

  return profiles;
}
