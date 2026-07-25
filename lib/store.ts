'use client';

import type {
  Profile,
  VitalReading,
  Alert,
  Medication,
  MedicationLog,
  WellnessCheckin,
  Guardian,
  EmergencyRequest,

  
  EmergencyStatusUpdate,
  QrCard,
  AuditLog,
  Role,
  Language,
  Theme,
  RiskLevel,
  AlertSeverity,
  Source,
  MedLogStatus,
  GuardianRole,
  GuardianStatus,
  EmergencyStatus,
} from '@/lib/types';

const STORAGE_PREFIX = 'sahayak_';

const uid = (prefix = '') =>
  prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function readKey<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeKey(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

interface DB {
  profiles: Profile[];
  vitals: VitalReading[];
  alerts: Alert[];
  medications: Medication[];
  medication_logs: MedicationLog[];
  wellness_checkins: WellnessCheckin[];
  guardians: Guardian[];
  emergency_requests: EmergencyRequest[];
  emergency_status_updates: EmergencyStatusUpdate[];
  qr_cards: QrCard[];
  audit_logs: AuditLog[];
}

const emptyDB: DB = {
  profiles: [],
  vitals: [],
  alerts: [],
  medications: [],
  medication_logs: [],
  wellness_checkins: [],
  guardians: [],
  emergency_requests: [],
  emergency_status_updates: [],
  qr_cards: [],
  audit_logs: [],
};

export function loadDB(): DB {
  const existing = readKey<Partial<DB> | null>('db', null);
  if (existing) {
    return { ...emptyDB, ...existing };
  }
  const seeded = seedDB();
  writeKey('db', seeded);
  return seeded;
}

export function saveDB(db: DB) {
  writeKey('db', db);
}

export interface AuthSession {
  user: { id: string; email: string };
}

export function getSession(): AuthSession | null {
  return readKey<AuthSession | null>('session', null);
}

export function setSession(s: AuthSession | null) {
  writeKey('session', s);
}

function nowISO() {
  return new Date().toISOString();
}

function daysAgoISO(days: number, h = 9, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function seedDB(): DB {
  const demoProfileId = 'demo_user_001';
  const demoEmail = 'demo@sahayak.app';
  const demoProfile: Profile = {
    id: demoProfileId,
    full_name: 'Aarav Sharma',
    phone: '+91 98765 43210',
    role: 'patient',
    date_of_birth: '1954-03-15',
    gender: 'male',
    language: 'en',
    address: 'Flat 402, Green Park Apartments, Sector 18, Gurugram, Haryana 122015',
    lat: 28.4953,
    lng: 77.0881,
    blood_group: 'B+',
    allergies: ['Penicillin', 'Peanuts'],
    chronic_conditions: ['Hypertension', 'Type 2 Diabetes'],
    insurance_provider: 'Apollo Munich Health Insurance',
    insurance_number: 'APM-7829104562',
    doctor_name: 'Dr. Priya Mehta',
    doctor_phone: '+91 98123 45678',
    emergency_contact_name: 'Rohan Sharma',
    emergency_contact_phone: '+91 99887 65432',
    emergency_contact_relation: 'Son',
    avatar_url: '',
    theme: 'light',
    created_at: daysAgoISO(120),
    updated_at: daysAgoISO(5),
  };

  // Dummy guardian profile (real sign-in user, linked as guardian of demo patient)
  const guardianProfileId = 'demo_guardian_001';
  const guardianEmail = 'guardian@sahayak.app';
  const guardianProfile: Profile = {
    id: guardianProfileId,
    full_name: 'Rohan Sharma',
    phone: '+91 99887 65432',
    role: 'guardian',
    date_of_birth: '1988-06-22',
    gender: 'male',
    language: 'en',
    address: 'House 14, Sector 56, Gurugram, Haryana 122011',
    lat: 28.5019,
    lng: 77.0735,
    blood_group: 'O+',
    allergies: [],
    chronic_conditions: [],
    insurance_provider: '',
    insurance_number: '',
    doctor_name: '',
    doctor_phone: '',
    emergency_contact_name: 'Aarav Sharma',
    emergency_contact_phone: '+91 98765 43210',
    emergency_contact_relation: 'Father',
    avatar_url: '',
    theme: 'light',
    created_at: daysAgoISO(150),
    updated_at: daysAgoISO(6),
  };

  // Doctor profile (real sign-in user, assigned as primary physician to demo patient)
  const doctorProfileId = 'demo_doctor_001';
  const doctorEmail = 'doctor@sahayak.app';
  const doctorProfile: Profile = {
    id: doctorProfileId,
    full_name: 'Dr. Priya Mehta',
    phone: '+91 98123 45678',
    role: 'doctor',
    date_of_birth: '1982-11-04',
    gender: 'female',
    language: 'en',
    address: 'Medanta Clinic, 2nd Floor, Sector 38, Gurugram, Haryana 122001',
    lat: 28.4265,
    lng: 77.0876,
    blood_group: 'A+',
    allergies: [],
    chronic_conditions: [],
    insurance_provider: '',
    insurance_number: '',
    doctor_name: '',
    doctor_phone: '',
    emergency_contact_name: 'Dr. Arjun Kapoor',
    emergency_contact_phone: '+91 98765 11223',
    emergency_contact_relation: 'Colleague',
    avatar_url: '',
    theme: 'dark',
    created_at: daysAgoISO(200),
    updated_at: daysAgoISO(3),
  };

  // Update the patient to reference the doctor row & guardian contact
  demoProfile.doctor_name = doctorProfile.full_name;
  demoProfile.doctor_phone = doctorProfile.phone;
  demoProfile.emergency_contact_name = guardianProfile.full_name;
  demoProfile.emergency_contact_phone = guardianProfile.phone;

  const profiles: Profile[] = [demoProfile, guardianProfile, doctorProfile];

  // ===== Vitals =====
  const vitals: VitalReading[] = [];
  const baseRiskByDay: RiskLevel[] = [
    'normal', 'normal', 'elevated', 'normal', 'warning', 'normal',
    'elevated', 'normal', 'normal', 'warning', 'normal', 'normal',
    'elevated', 'normal', 'normal', 'normal', 'elevated', 'normal',
    'normal', 'normal', 'warning', 'elevated', 'normal', 'normal',
    'normal', 'normal', 'elevated', 'normal', 'normal', 'normal',
  ];
  for (let i = 29; i >= 0; i--) {
    const lvl = baseRiskByDay[29 - i] ?? 'normal';
    const critical = lvl === 'warning' || lvl === 'critical';
    vitals.push({
      id: uid('v'),
      user_id: demoProfileId,
      heart_rate: 68 + Math.round(Math.random() * 12 + (critical ? 20 : 0)),
      spo2: Math.round(96 + Math.random() * 3 - (critical ? 4 : 0)),
      systolic_bp: 118 + Math.round(Math.random() * 10 + (critical ? 22 : 0)),
      diastolic_bp: 76 + Math.round(Math.random() * 6 + (critical ? 12 : 0)),
      temperature: +(36.5 + Math.random() * 0.6 + (critical ? 1.1 : 0)).toFixed(1),
      glucose: 102 + Math.round(Math.random() * 20 + (critical ? 70 : 0)),
      bmi: +(26.4 + (Math.random() * 0.6)).toFixed(1),
      weight: +(74.3 + (Math.random() * 1.2)).toFixed(1),
      height: 168,
      source: i % 7 === 0 ? 'manual' : 'vitalscan',
      notes: '',
      risk_level: lvl,
      risk_score: lvl === 'critical' ? 68 : lvl === 'warning' ? 38 : lvl === 'elevated' ? 18 : 5,
      risk_factors: [],
      recorded_at: daysAgoISO(i, 8 + (i % 4), 10 + ((i * 7) % 40)),
      created_at: daysAgoISO(i),
    });
  }

  // ===== Alerts =====
  const alerts: Alert[] = [
    {
      id: uid('a'),
      user_id: demoProfileId,
      type: 'vital_high',
      severity: 'warning',
      title: 'Blood pressure elevated',
      message: 'Systolic reading was 145 mmHg at morning check-in.',
      explanation: 'Consistent readings above 140/90 may require medication adjustment.',
      metric: 'systolic_bp',
      metric_value: 145,
      threshold: '100-140 mmHg',
      dismissed: false,
      escalated: true,
      source: 'vitalscan',
      created_at: daysAgoISO(1, 8, 15),
    },
    {
      id: uid('a'),
      user_id: demoProfileId,
      type: 'med_missed',
      severity: 'info',
      title: 'Evening dose not logged',
      message: 'Metformin dose at 8:00 PM was not recorded yesterday.',
      explanation: 'Missing 1 dose is usually not critical, but please stay consistent.',
      metric: 'medication_log',
      metric_value: null,
      threshold: 'taken',
      dismissed: false,
      escalated: false,
      source: 'med_adherence',
      created_at: daysAgoISO(1, 20, 30),
    },
    {
      id: uid('a'),
      user_id: demoProfileId,
      type: 'wellness_low',
      severity: 'warning',
      title: 'Moderate pain reported',
      message: 'Knee pain level 6/10 reported in morning check-in.',
      explanation: 'Persistent pain above 5/10 should be discussed with the doctor.',
      metric: 'pain_level',
      metric_value: 6,
      threshold: '< 4/10',
      dismissed: true,
      escalated: false,
      source: 'wellness',
      created_at: daysAgoISO(3),
    },
  ];

  // ===== Medications & Logs =====
  const today = new Date();
  const medications: Medication[] = [
    {
      id: 'med_001',
      user_id: demoProfileId,
      name: 'Metformin',
      dosage: '500 mg',
      frequency: 'Twice daily',
      times: ['08:00', '20:00'],
      instructions: 'Take after meals with a full glass of water.',
      start_date: daysAgoISO(180).slice(0, 10),
      end_date: null,
      active: true,
      color: 'hsl(160 70% 45%)',
      created_at: daysAgoISO(180),
      updated_at: daysAgoISO(5),
    },
    {
      id: 'med_002',
      user_id: demoProfileId,
      name: 'Amlodipine',
      dosage: '5 mg',
      frequency: 'Once daily',
      times: ['08:00'],
      instructions: 'Take with breakfast.',
      start_date: daysAgoISO(200).slice(0, 10),
      end_date: null,
      active: true,
      color: 'hsl(220 80% 60%)',
      created_at: daysAgoISO(200),
      updated_at: daysAgoISO(5),
    },
    {
      id: 'med_003',
      user_id: demoProfileId,
      name: 'Atorvastatin',
      dosage: '20 mg',
      frequency: 'Once at bedtime',
      times: ['22:00'],
      instructions: 'Take at bedtime. Avoid grapefruit juice.',
      start_date: daysAgoISO(150).slice(0, 10),
      end_date: null,
      active: true,
      color: 'hsl(40 90% 55%)',
      created_at: daysAgoISO(150),
      updated_at: daysAgoISO(5),
    },
    {
      id: 'med_004',
      user_id: demoProfileId,
      name: 'Multivitamin',
      dosage: '1 tablet',
      frequency: 'Once daily',
      times: ['09:00'],
      instructions: 'With breakfast.',
      start_date: daysAgoISO(120).slice(0, 10),
      end_date: null,
      active: true,
      color: 'hsl(280 70% 60%)',
      created_at: daysAgoISO(120),
      updated_at: daysAgoISO(5),
    },
  ];

  const medLogs: MedicationLog[] = [];
  const statuses: MedLogStatus[] = ['taken', 'taken', 'taken', 'taken', 'taken', 'skipped', 'pending'];
  for (let d = 9; d >= 0; d--) {
    for (const med of medications) {
      for (const timeStr of med.times) {
        const [hh, mm] = timeStr.split(':').map(Number);
        const scheduledTime = new Date();
        scheduledTime.setDate(scheduledTime.getDate() - d);
        scheduledTime.setHours(hh, mm, 0, 0);
        let status: MedLogStatus;
        if (d === 0 && scheduledTime.getTime() > Date.now()) status = 'pending';
        else status = statuses[(d + hh + mm) % statuses.length];
        if (d > 0 && status === 'pending') status = 'missed';
        let takenAt: string | null = null;
        if (status === 'taken') {
          const offsetMin = Math.round(Math.random() * 35 - 5);
          const t = new Date(scheduledTime.getTime() + offsetMin * 60_000);
          takenAt = t.toISOString();
        }
        medLogs.push({
          id: uid('ml'),
          user_id: demoProfileId,
          medication_id: med.id,
          scheduled_time: scheduledTime.toISOString(),
          status,
          taken_at: takenAt,
          notes: '',
          created_at: scheduledTime.toISOString(),
        });
      }
    }
  }

  // ===== Wellness Check-ins =====
  const checkins: WellnessCheckin[] = [];
  const moods = [4, 4, 3, 4, 5, 3, 4, 4, 2, 3, 4, 4, 5, 4, 3, 4, 4, 5, 3, 4];
  const pains = [2, 1, 3, 2, 4, 2, 3, 6, 2, 1, 3, 2, 1, 3, 2, 4, 2, 3, 2, 1];
  const sleeps: (number | null)[] = [7, 6.5, 5, 7, 6, 7.5, 6, 5, 7, 6.5, 7, 6, 7, 6, 6.5, 7, 7, 6, 7, 6.5];
  const appetites: ('low' | 'normal' | 'high')[] = ['normal', 'normal', 'low', 'normal', 'normal', 'high', 'normal', 'normal', 'normal', 'low', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'high', 'normal', 'normal', 'normal'];
  const mobilities: ('impaired' | 'normal' | 'good')[] = ['normal', 'good', 'normal', 'normal', 'normal', 'impaired', 'normal', 'normal', 'good', 'normal', 'normal', 'good', 'normal', 'normal', 'normal', 'good', 'normal', 'normal', 'normal', 'good'];
  const energies = [4, 3, 2, 4, 4, 3, 3, 2, 4, 3, 4, 4, 4, 3, 3, 4, 4, 3, 4, 4];
  for (let i = 19; i >= 0; i--) {
    const idx = 19 - i;
    const pain = pains[idx];
    const sleep = sleeps[idx];
    const mood = moods[idx];
    const mobility = mobilities[idx];
    const energy = energies[idx];
    const app = appetites[idx];
    let score = 0;
    let lvl: RiskLevel = 'normal';
    if (pain >= 7) score += 25;
    else if (pain >= 4) score += 12;
    if (sleep != null && sleep < 4) score += 12;
    if (mood <= 2) score += 10;
    if (energy <= 2) score += 10;
    if (mobility === 'impaired') score += 12;
    if (app === 'low') score += 5;
    score = Math.min(score, 100);
    if (score >= 60) lvl = 'critical';
    else if (score >= 30) lvl = 'warning';
    else if (score >= 12) lvl = 'elevated';
    checkins.push({
      id: uid('w'),
      user_id: demoProfileId,
      mood,
      pain_level: pain,
      sleep_hours: sleep,
      appetite: app,
      mobility,
      energy,
      notes: '',
      score,
      risk_level: lvl,
      recorded_at: daysAgoISO(i, 8, 30),
      created_at: daysAgoISO(i),
    });
  }

  // ===== Guardians =====
  const guardians: Guardian[] = [
    {
      id: uid('g'),
      guardian_user_id: guardianProfileId,
      patient_user_id: demoProfileId,
      role: 'family',
      verified: true,
      status: 'accepted',
      trust_level: 95,
      notes: 'Primary contact. Lives 20 minutes away.',
      created_at: daysAgoISO(150),
      updated_at: daysAgoISO(145),
      guardian_profile: guardianProfile,
      patient_profile: demoProfile,
    },
  ];

  // ===== Emergency =====
  const emergencies: EmergencyRequest[] = [
    {
      id: uid('e'),
      patient_user_id: demoProfileId,
      alert_id: null,
      type: 'medical',
      severity: 'critical',
      status: 'resolved',
      lat: demoProfile.lat,
      lng: demoProfile.lng,
      address: demoProfile.address,
      accepted_by: guardianProfileId,
      accepted_at: daysAgoISO(14, 11, 5),
      resolved_at: daysAgoISO(14, 11, 48),
      notes: 'Dizziness reported while climbing stairs. Guardian arrived and accompanied to clinic.',
      created_at: daysAgoISO(14, 11, 2),
      updated_at: daysAgoISO(14, 11, 48),
      patient_profile: demoProfile,
      accepted_by_profile: guardianProfile,
    },
  ];
  const statusUpdates: EmergencyStatusUpdate[] = [
    {
      id: uid('su'),
      request_id: emergencies[0].id,
      guardian_user_id: guardianProfileId,
      status: 'enroute',
      eta_minutes: 18,
      message: 'Leaving home now. ETA ~18 minutes.',
      lat: 28.501,
      lng: 77.072,
      created_at: daysAgoISO(14, 11, 10),
      guardian_profile: guardianProfile,
    },
    {
      id: uid('su'),
      request_id: emergencies[0].id,
      guardian_user_id: guardianProfileId,
      status: 'onscene',
      eta_minutes: null,
      message: 'Arrived on scene. Patient is conscious but dizzy.',
      lat: demoProfile.lat,
      lng: demoProfile.lng,
      created_at: daysAgoISO(14, 11, 27),
      guardian_profile: guardianProfile,
    },
    {
      id: uid('su'),
      request_id: emergencies[0].id,
      guardian_user_id: guardianProfileId,
      status: 'resolved',
      eta_minutes: null,
      message: 'Discharged from clinic with rest advice.',
      lat: demoProfile.lat,
      lng: demoProfile.lng,
      created_at: daysAgoISO(14, 11, 48),
      guardian_profile: guardianProfile,
    },
  ];

  // ===== QR Card =====
  const qrCards: QrCard[] = [
    {
      id: uid('q'),
      patient_user_id: demoProfileId,
      share_token: 'share_demo_sahayak_001',
      show_allergies: true,
      show_medications: true,
      show_conditions: true,
      show_emergency_contact: true,
      show_insurance: true,
      show_doctor: true,
      show_blood_group: true,
      active: true,
      created_at: daysAgoISO(120),
    },
  ];

  // ===== Audit =====
  const auditLogs: AuditLog[] = [
    {
      id: uid('al'),
      user_id: demoProfileId,
      action: 'auth.signin',
      actor: 'user',
      target: '',
      severity: 'info',
      details: { method: 'password' },
      ip: '127.0.0.1',
      created_at: daysAgoISO(0, 7, 50),
    },
  ];

  // Write demo email -> user id mapping for auth (3 roles: Patient / Guardian / Doctor)
  writeKey('auth_users', [
    { id: demoProfileId, email: demoEmail, password: 'demo123456', profile: demoProfile },
    { id: guardianProfileId, email: guardianEmail, password: 'demo123456', profile: guardianProfile },
    { id: doctorProfileId, email: doctorEmail, password: 'demo123456', profile: doctorProfile },
  ]);

  return {
    profiles,
    vitals,
    alerts,
    medications,
    medication_logs: medLogs,
    wellness_checkins: checkins,
    guardians,
    emergency_requests: emergencies,
    emergency_status_updates: statusUpdates,
    qr_cards: qrCards,
    audit_logs: auditLogs,
  };
}

// ===== Query helpers (Supabase-like API shape, returns data/error tuples) =====

export type RowOf<K extends keyof DB> = DB[K] extends (infer T)[] ? T : never;

export function selectAll<K extends keyof DB>(table: K, db: DB): RowOf<K>[] {
  return db[table] as RowOf<K>[];
}

export function selectEq<K extends keyof DB>(
  table: K,
  db: DB,
  field: string,
  value: unknown
): RowOf<K>[] {
  const rows = db[table] as unknown as Record<string, unknown>[];
  return rows.filter((r) => r[field] === value) as RowOf<K>[];
}

export function maybeSingleEq<K extends keyof DB>(
  table: K,
  db: DB,
  field: string,
  value: unknown
): RowOf<K> | null {
  const rows = selectEq(table, db, field, value);
  return rows[0] ?? null;
}

export function insertRow<K extends keyof DB>(
  table: K,
  db: DB,
  row: Partial<RowOf<K>>,
  idField = 'id'
): RowOf<K> {
  const r = { ...row } as Record<string, unknown>;
  if (!r[idField]) r[idField] = uid();
  const now = nowISO();
  if (!r.created_at) r.created_at = now;
  if (!r.updated_at && table !== 'audit_logs') r.updated_at = now;
  (db[table] as unknown as Record<string, unknown>[]).push(r);
  return r as RowOf<K>;
}

export function updateRows<K extends keyof DB>(
  table: K,
  db: DB,
  field: string,
  value: unknown,
  patch: Partial<RowOf<K>>
): RowOf<K>[] {
  const rows = db[table] as unknown as Record<string, unknown>[];
  const patched: RowOf<K>[] = [];
  for (const r of rows) {
    if (r[field] === value) {
      const merged = { ...r, ...(patch as Record<string, unknown>), updated_at: nowISO() };
      Object.assign(r, merged);
      patched.push(r as RowOf<K>);
    }
  }
  return patched;
}

export function upsertRow<K extends keyof DB>(
  table: K,
  db: DB,
  row: Partial<RowOf<K>>,
  eqField = 'id'
): RowOf<K> {
  const rows = db[table] as unknown as Record<string, unknown>[];
  const r = row as Record<string, unknown>;
  const existingIdx = rows.findIndex((x) => x[eqField] === r[eqField]);
  const now = nowISO();
  if (existingIdx >= 0) {
    const merged = { ...rows[existingIdx], ...r, updated_at: now };
    rows[existingIdx] = merged;
    return merged as RowOf<K>;
  }
  if (!r.created_at) r.created_at = now;
  if (!r.updated_at) r.updated_at = now;
  rows.push(r);
  return r as RowOf<K>;
}

// ===== Auth helpers =====
export interface AuthUser {
  id: string;
  email: string;
  password: string;
  profile: Profile;
}

export function listAuthUsers(): AuthUser[] {
  return readKey<AuthUser[]>('auth_users', []);
}

export function writeAuthUsers(users: AuthUser[]) {
  writeKey('auth_users', users);
}

export function findAuthUserByEmail(email: string): AuthUser | undefined {
  return listAuthUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

// ===== Misc helpers =====
export function generateShareToken() {
  return 'share_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export { uid, nowISO };
