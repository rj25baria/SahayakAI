export type Role = 'patient' | 'guardian' | 'doctor' | 'admin';
export type Language = 'en' | 'hi';
export type Theme = 'light' | 'dark';

export type RiskLevel = 'normal' | 'elevated' | 'warning' | 'critical';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type Source = 'vitalscan' | 'manual' | 'simulation';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
  date_of_birth: string | null;
  gender: string;
  language: Language;
  address: string;
  lat: number | null;
  lng: number | null;
  blood_group: string;
  allergies: string[];
  chronic_conditions: string[];
  insurance_provider: string;
  insurance_number: string;
  doctor_name: string;
  doctor_phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  avatar_url: string;
  theme: Theme;
  created_at: string;
  updated_at: string;
}

export interface VitalReading {
  id: string;
  user_id: string;
  heart_rate: number | null;
  spo2: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  temperature: number | null;
  glucose: number | null;
  bmi: number | null;
  weight: number | null;
  height: number | null;
  source: Source;
  notes: string;
  risk_level: RiskLevel;
  risk_score: number;
  risk_factors: RiskFactor[];
  recorded_at: string;
  created_at: string;
}

export interface RiskFactor {
  metric: string;
  value: string;
  threshold: string;
  severity: AlertSeverity;
  message: string;
}

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  instructions: string;
  start_date: string;
  end_date: string | null;
  active: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export type MedLogStatus = 'taken' | 'skipped' | 'missed' | 'pending';

export interface MedicationLog {
  id: string;
  user_id: string;
  medication_id: string | null;
  scheduled_time: string;
  status: MedLogStatus;
  taken_at: string | null;
  notes: string;
  created_at: string;
}

export interface WellnessCheckin {
  id: string;
  user_id: string;
  mood: number;
  pain_level: number;
  sleep_hours: number | null;
  appetite: 'low' | 'normal' | 'high';
  mobility: 'impaired' | 'normal' | 'good';
  energy: number;
  notes: string;
  score: number;
  risk_level: RiskLevel;
  recorded_at: string;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  explanation: string;
  metric: string;
  metric_value: number | null;
  threshold: string;
  dismissed: boolean;
  escalated: boolean;
  source: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  actor: string;
  target: string;
  severity: AlertSeverity;
  details: Record<string, unknown>;
  ip: string;
  created_at: string;
}

export type GuardianRole =
  | 'family'
  | 'neighbour'
  | 'volunteer'
  | 'ngo'
  | 'security'
  | 'doctor';

export type GuardianStatus = 'pending' | 'accepted' | 'declined';

export interface Guardian {
  id: string;
  guardian_user_id: string;
  patient_user_id: string;
  role: GuardianRole;
  verified: boolean;
  status: GuardianStatus;
  trust_level: number;
  notes: string;
  created_at: string;
  updated_at: string;
  guardian_profile?: Profile;
  patient_profile?: Profile;
}

export type EmergencyStatus = 'active' | 'accepted' | 'resolved' | 'cancelled';

export interface EmergencyRequest {
  id: string;
  patient_user_id: string;
  alert_id: string | null;
  type: string;
  severity: AlertSeverity;
  status: EmergencyStatus;
  lat: number | null;
  lng: number | null;
  address: string;
  accepted_by: string | null;
  accepted_at: string | null;
  resolved_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  patient_profile?: Profile;
  accepted_by_profile?: Profile;
}

export type EmergencyUpdateStatus =
  | 'enroute'
  | 'onscene'
  | 'resolved'
  | 'cancelled'
  | 'update';

export interface EmergencyStatusUpdate {
  id: string;
  request_id: string;
  guardian_user_id: string;
  status: EmergencyUpdateStatus;
  eta_minutes: number | null;
  message: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
  guardian_profile?: Profile;
}

export interface QrCard {
  id: string;
  patient_user_id: string;
  share_token: string;
  show_allergies: boolean;
  show_medications: boolean;
  show_conditions: boolean;
  show_emergency_contact: boolean;
  show_insurance: boolean;
  show_doctor: boolean;
  show_blood_group: boolean;
  active: boolean;
  created_at: string;
}

export interface PublicQrCard {
  patient_name: string;
  blood_group: string | null;
  allergies: string[] | null;
  chronic_conditions: string[] | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  insurance_provider: string | null;
  insurance_number: string | null;
  doctor_name: string | null;
  doctor_phone: string | null;
  medications: { name: string; dosage: string; frequency: string; instructions: string }[] | null;
  generated_at: string;
}
