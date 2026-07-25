/*
# SAHAYAK - Row Level Security Policies

## Overview
Enables RLS on all tables and adds ownership + guardian-scoped access policies.
This is a multi-user app with sign-in, so policies use `TO authenticated` with
`auth.uid()` checks. Guardian-accepted links grant SELECT on patient data and
limited UPDATE on emergency requests / status updates.

## Security Notes
- Patient-data tables: owner full CRUD; linked guardians SELECT only.
- audit_logs: client can SELECT own + INSERT; no UPDATE/DELETE (immutable).
- guardians: both parties see and modify the membership row.
- emergency_requests + status_updates: patient + linked guardians can read/write.
*/

-- Enable RLS on all tables (safe to repeat; ENABLE is idempotent)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_cards ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
DROP POLICY IF EXISTS "select_own_or_linked_profile" ON profiles;
CREATE POLICY "select_own_or_linked_profile"
ON profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM guardians g
    WHERE (g.guardian_user_id = auth.uid() AND g.patient_user_id = profiles.id
           AND g.status = 'accepted')
       OR (g.patient_user_id = auth.uid() AND g.guardian_user_id = profiles.id
           AND g.status = 'accepted')
  )
);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
ON profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================================
-- VITALS
-- ============================================================
DROP POLICY IF EXISTS "select_own_or_guardian_vitals" ON vitals;
CREATE POLICY "select_own_or_guardian_vitals"
ON vitals FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM guardians g
    WHERE g.guardian_user_id = auth.uid() AND g.patient_user_id = vitals.user_id
          AND g.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "insert_own_vitals" ON vitals;
CREATE POLICY "insert_own_vitals"
ON vitals FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_vitals" ON vitals;
CREATE POLICY "update_own_vitals"
ON vitals FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_vitals" ON vitals;
CREATE POLICY "delete_own_vitals"
ON vitals FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- MEDICATIONS
-- ============================================================
DROP POLICY IF EXISTS "select_own_or_guardian_medications" ON medications;
CREATE POLICY "select_own_or_guardian_medications"
ON medications FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM guardians g
    WHERE g.guardian_user_id = auth.uid() AND g.patient_user_id = medications.user_id
          AND g.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "insert_own_medications" ON medications;
CREATE POLICY "insert_own_medications"
ON medications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_medications" ON medications;
CREATE POLICY "update_own_medications"
ON medications FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_medications" ON medications;
CREATE POLICY "delete_own_medications"
ON medications FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- MEDICATION LOGS
-- ============================================================
DROP POLICY IF EXISTS "select_own_or_guardian_med_logs" ON medication_logs;
CREATE POLICY "select_own_or_guardian_med_logs"
ON medication_logs FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM guardians g
    WHERE g.guardian_user_id = auth.uid() AND g.patient_user_id = medication_logs.user_id
          AND g.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "insert_own_med_logs" ON medication_logs;
CREATE POLICY "insert_own_med_logs"
ON medication_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_med_logs" ON medication_logs;
CREATE POLICY "update_own_med_logs"
ON medication_logs FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_med_logs" ON medication_logs;
CREATE POLICY "delete_own_med_logs"
ON medication_logs FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- WELLNESS CHECK-INS
-- ============================================================
DROP POLICY IF EXISTS "select_own_or_guardian_wellness" ON wellness_checkins;
CREATE POLICY "select_own_or_guardian_wellness"
ON wellness_checkins FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM guardians g
    WHERE g.guardian_user_id = auth.uid() AND g.patient_user_id = wellness_checkins.user_id
          AND g.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "insert_own_wellness" ON wellness_checkins;
CREATE POLICY "insert_own_wellness"
ON wellness_checkins FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_wellness" ON wellness_checkins;
CREATE POLICY "update_own_wellness"
ON wellness_checkins FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_wellness" ON wellness_checkins;
CREATE POLICY "delete_own_wellness"
ON wellness_checkins FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- ALERTS
-- ============================================================
DROP POLICY IF EXISTS "select_own_or_guardian_alerts" ON alerts;
CREATE POLICY "select_own_or_guardian_alerts"
ON alerts FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM guardians g
    WHERE g.guardian_user_id = auth.uid() AND g.patient_user_id = alerts.user_id
          AND g.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "insert_own_alerts" ON alerts;
CREATE POLICY "insert_own_alerts"
ON alerts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_alerts" ON alerts;
CREATE POLICY "update_own_alerts"
ON alerts FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_alerts" ON alerts;
CREATE POLICY "delete_own_alerts"
ON alerts FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- AUDIT LOGS (immutable - no UPDATE/DELETE)
-- ============================================================
DROP POLICY IF EXISTS "select_own_audit_logs" ON audit_logs;
CREATE POLICY "select_own_audit_logs"
ON audit_logs FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_audit_logs" ON audit_logs;
CREATE POLICY "insert_own_audit_logs"
ON audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ============================================================
-- GUARDIANS
-- ============================================================
DROP POLICY IF EXISTS "select_own_guardians" ON guardians;
CREATE POLICY "select_own_guardians"
ON guardians FOR SELECT TO authenticated
USING (guardian_user_id = auth.uid() OR patient_user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_guardians" ON guardians;
CREATE POLICY "insert_own_guardians"
ON guardians FOR INSERT TO authenticated
WITH CHECK (guardian_user_id = auth.uid() OR patient_user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_guardians" ON guardians;
CREATE POLICY "update_own_guardians"
ON guardians FOR UPDATE TO authenticated
USING (guardian_user_id = auth.uid() OR patient_user_id = auth.uid())
WITH CHECK (guardian_user_id = auth.uid() OR patient_user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_guardians" ON guardians;
CREATE POLICY "delete_own_guardians"
ON guardians FOR DELETE TO authenticated
USING (guardian_user_id = auth.uid() OR patient_user_id = auth.uid());

-- ============================================================
-- EMERGENCY REQUESTS
-- ============================================================
DROP POLICY IF EXISTS "select_emergency_requests" ON emergency_requests;
CREATE POLICY "select_emergency_requests"
ON emergency_requests FOR SELECT TO authenticated
USING (
  patient_user_id = auth.uid()
  OR accepted_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM guardians g
    WHERE g.guardian_user_id = auth.uid() AND g.patient_user_id = emergency_requests.patient_user_id
          AND g.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "insert_emergency_requests" ON emergency_requests;
CREATE POLICY "insert_emergency_requests"
ON emergency_requests FOR INSERT TO authenticated
WITH CHECK (patient_user_id = auth.uid());

DROP POLICY IF EXISTS "update_emergency_requests" ON emergency_requests;
CREATE POLICY "update_emergency_requests"
ON emergency_requests FOR UPDATE TO authenticated
USING (
  patient_user_id = auth.uid()
  OR accepted_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM guardians g
    WHERE g.guardian_user_id = auth.uid() AND g.patient_user_id = emergency_requests.patient_user_id
          AND g.status = 'accepted'
  )
)
WITH CHECK (
  patient_user_id = auth.uid()
  OR accepted_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM guardians g
    WHERE g.guardian_user_id = auth.uid() AND g.patient_user_id = emergency_requests.patient_user_id
          AND g.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "delete_emergency_requests" ON emergency_requests;
CREATE POLICY "delete_emergency_requests"
ON emergency_requests FOR DELETE TO authenticated
USING (patient_user_id = auth.uid());

-- ============================================================
-- EMERGENCY STATUS UPDATES
-- ============================================================
DROP POLICY IF EXISTS "select_status_updates" ON emergency_status_updates;
CREATE POLICY "select_status_updates"
ON emergency_status_updates FOR SELECT TO authenticated
USING (
  guardian_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM emergency_requests er
    WHERE er.id = emergency_status_updates.request_id
          AND er.patient_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM emergency_requests er
    JOIN guardians g ON g.patient_user_id = er.patient_user_id
    WHERE er.id = emergency_status_updates.request_id
          AND g.guardian_user_id = auth.uid() AND g.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "insert_status_updates" ON emergency_status_updates;
CREATE POLICY "insert_status_updates"
ON emergency_status_updates FOR INSERT TO authenticated
WITH CHECK (guardian_user_id = auth.uid());

DROP POLICY IF EXISTS "update_status_updates" ON emergency_status_updates;
CREATE POLICY "update_status_updates"
ON emergency_status_updates FOR UPDATE TO authenticated
USING (guardian_user_id = auth.uid()) WITH CHECK (guardian_user_id = auth.uid());

-- ============================================================
-- QR CARDS
-- ============================================================
DROP POLICY IF EXISTS "select_own_or_guardian_qr_cards" ON qr_cards;
CREATE POLICY "select_own_or_guardian_qr_cards"
ON qr_cards FOR SELECT TO authenticated
USING (
  patient_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM guardians g
    WHERE g.guardian_user_id = auth.uid() AND g.patient_user_id = qr_cards.patient_user_id
          AND g.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "insert_own_qr_cards" ON qr_cards;
CREATE POLICY "insert_own_qr_cards"
ON qr_cards FOR INSERT TO authenticated
WITH CHECK (patient_user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_qr_cards" ON qr_cards;
CREATE POLICY "update_own_qr_cards"
ON qr_cards FOR UPDATE TO authenticated
USING (patient_user_id = auth.uid()) WITH CHECK (patient_user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_qr_cards" ON qr_cards;
CREATE POLICY "delete_own_qr_cards"
ON qr_cards FOR DELETE TO authenticated
USING (patient_user_id = auth.uid());
