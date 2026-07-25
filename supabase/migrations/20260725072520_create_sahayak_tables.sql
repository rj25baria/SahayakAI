/*
# SAHAYAK Preventive Healthcare Platform - Tables

## Overview
Creates all tables for SAHAYAK before adding RLS policies, so cross-table
policy subqueries resolve. Tables: profiles, vitals, medications,
medication_logs, wellness_checkins, alerts, audit_logs, guardians,
emergency_requests, emergency_status_updates, qr_cards.

## Important Notes
- Policies are added in a second migration after all tables exist.
- Realtime + triggers added at the end.
*/

-- ============================================================
-- GUARDIANS (created first - referenced by other tables' policies)
-- ============================================================
CREATE TABLE IF NOT EXISTS guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'family' CHECK (role IN ('family','neighbour','volunteer','ngo','security','doctor')),
  verified boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  trust_level integer DEFAULT 1 CHECK (trust_level BETWEEN 1 AND 5),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(guardian_user_id, patient_user_id)
);

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'patient' CHECK (role IN ('patient','guardian','doctor','admin')),
  date_of_birth date,
  gender text DEFAULT '',
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','hi')),
  address text DEFAULT '',
  lat double precision,
  lng double precision,
  blood_group text DEFAULT '',
  allergies text[] DEFAULT '{}',
  chronic_conditions text[] DEFAULT '{}',
  insurance_provider text DEFAULT '',
  insurance_number text DEFAULT '',
  doctor_name text DEFAULT '',
  doctor_phone text DEFAULT '',
  emergency_contact_name text DEFAULT '',
  emergency_contact_phone text DEFAULT '',
  emergency_contact_relation text DEFAULT '',
  avatar_url text DEFAULT '',
  theme text DEFAULT 'light' CHECK (theme IN ('light','dark')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- VITALS
-- ============================================================
CREATE TABLE IF NOT EXISTS vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  heart_rate integer,
  spo2 numeric(5,2),
  systolic_bp integer,
  diastolic_bp integer,
  temperature numeric(5,2),
  glucose numeric(5,2),
  bmi numeric(5,2),
  weight numeric(5,2),
  height numeric(5,2),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('vitalscan','manual','simulation')),
  notes text DEFAULT '',
  risk_level text DEFAULT 'normal' CHECK (risk_level IN ('normal','elevated','warning','critical')),
  risk_score integer DEFAULT 0,
  risk_factors jsonb DEFAULT '[]'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vitals_user_recorded ON vitals(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_risk ON vitals(risk_level) WHERE risk_level != 'normal';

-- ============================================================
-- MEDICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text NOT NULL DEFAULT '',
  frequency text DEFAULT '',
  times text[] DEFAULT '{}',
  instructions text DEFAULT '',
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  active boolean DEFAULT true,
  color text DEFAULT '#0ea5e9',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_user_active ON medications(user_id) WHERE active = true;

-- ============================================================
-- MEDICATION LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('taken','skipped','missed','pending')),
  taken_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medlogs_user_scheduled ON medication_logs(user_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_medlogs_status ON medication_logs(status) WHERE status != 'taken';

-- ============================================================
-- WELLNESS CHECK-INS
-- ============================================================
CREATE TABLE IF NOT EXISTS wellness_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  mood integer DEFAULT 3 CHECK (mood BETWEEN 1 AND 5),
  pain_level integer DEFAULT 0 CHECK (pain_level BETWEEN 0 AND 10),
  sleep_hours numeric(4,1),
  appetite text DEFAULT 'normal' CHECK (appetite IN ('low','normal','high')),
  mobility text DEFAULT 'normal' CHECK (mobility IN ('impaired','normal','good')),
  energy integer DEFAULT 3 CHECK (energy BETWEEN 1 AND 5),
  notes text DEFAULT '',
  score integer DEFAULT 0,
  risk_level text DEFAULT 'normal' CHECK (risk_level IN ('normal','elevated','warning','critical')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wellness_user_recorded ON wellness_checkins(user_id, recorded_at DESC);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  title text NOT NULL,
  message text NOT NULL,
  explanation text DEFAULT '',
  metric text DEFAULT '',
  metric_value numeric,
  threshold text DEFAULT '',
  dismissed boolean DEFAULT false,
  escalated boolean DEFAULT false,
  source text DEFAULT 'rule_engine',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_created ON alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(user_id, dismissed, severity) WHERE dismissed = false;

-- ============================================================
-- AUDIT LOGS (immutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor text DEFAULT 'user',
  target text DEFAULT '',
  severity text DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  details jsonb DEFAULT '{}'::jsonb,
  ip text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_logs(user_id, created_at DESC);

-- ============================================================
-- EMERGENCY REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES alerts(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'medical',
  severity text NOT NULL DEFAULT 'critical' CHECK (severity IN ('info','warning','critical')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','accepted','resolved','cancelled')),
  lat double precision,
  lng double precision,
  address text DEFAULT '',
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  resolved_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardians_patient ON guardians(patient_user_id, status);
CREATE INDEX IF NOT EXISTS idx_guardians_guardian ON guardians(guardian_user_id, status);

-- ============================================================
-- EMERGENCY STATUS UPDATES
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_status_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
  guardian_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'enroute' CHECK (status IN ('enroute','onscene','resolved','cancelled','update')),
  eta_minutes integer,
  message text DEFAULT '',
  lat double precision,
  lng double precision,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_updates_request ON emergency_status_updates(request_id, created_at DESC);

-- ============================================================
-- QR CARDS
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token uuid NOT NULL DEFAULT gen_random_uuid(),
  show_allergies boolean DEFAULT true,
  show_medications boolean DEFAULT true,
  show_conditions boolean DEFAULT true,
  show_emergency_contact boolean DEFAULT true,
  show_insurance boolean DEFAULT true,
  show_doctor boolean DEFAULT true,
  show_blood_group boolean DEFAULT true,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(patient_user_id)
);

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE vitals;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE medication_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE emergency_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE emergency_status_updates;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE guardians;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_medications_updated ON medications;
CREATE TRIGGER trg_medications_updated BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_guardians_updated ON guardians;
CREATE TRIGGER trg_guardians_updated BEFORE UPDATE ON guardians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_emergency_updated ON emergency_requests;
CREATE TRIGGER trg_emergency_updated BEFORE UPDATE ON emergency_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
