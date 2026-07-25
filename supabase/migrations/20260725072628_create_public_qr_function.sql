/*
# SAHAYAK - Public QR Card Access

## Overview
Adds a public, read-only function `get_public_qr_card(share_token)` that returns
the emergency card data for a given QR share token WITHOUT requiring auth.
This powers the public Medical QR Emergency Card page that first responders
scan. It runs as SECURITY DEFINER (service-role privileges) so it bypasses RLS,
but it only exposes the fields the card owner has opted to share via the
show_* flags, and it requires the unguessable share_token (gen_random_uuid()).

## Security
- Function is SECURITY DEFINER, returns a curated JSON payload.
- No secrets or non-shared fields are exposed.
- The share_token is a uuid generated with gen_random_uuid() (122 bits of entropy).
*/

-- Drop and recreate for idempotency
DROP FUNCTION IF EXISTS get_public_qr_card(p_share_token uuid);

CREATE OR REPLACE FUNCTION get_public_qr_card(p_share_token uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object(
      'patient_name', p.full_name,
      'blood_group', CASE WHEN q.show_blood_group THEN p.blood_group ELSE NULL END,
      'allergies', CASE WHEN q.show_allergies THEN p.allergies ELSE NULL END,
      'chronic_conditions', CASE WHEN q.show_conditions THEN p.chronic_conditions ELSE NULL END,
      'emergency_contact_name', CASE WHEN q.show_emergency_contact THEN p.emergency_contact_name ELSE NULL END,
      'emergency_contact_phone', CASE WHEN q.show_emergency_contact THEN p.emergency_contact_phone ELSE NULL END,
      'emergency_contact_relation', CASE WHEN q.show_emergency_contact THEN p.emergency_contact_relation ELSE NULL END,
      'insurance_provider', CASE WHEN q.show_insurance THEN p.insurance_provider ELSE NULL END,
      'insurance_number', CASE WHEN q.show_insurance THEN p.insurance_number ELSE NULL END,
      'doctor_name', CASE WHEN q.show_doctor THEN p.doctor_name ELSE NULL END,
      'doctor_phone', CASE WHEN q.show_doctor THEN p.doctor_phone ELSE NULL END,
      'medications', CASE WHEN q.show_medications THEN (
        SELECT jsonb_agg(jsonb_build_object(
          'name', m.name, 'dosage', m.dosage, 'frequency', m.frequency,
          'instructions', m.instructions
        ))
        FROM medications m
        WHERE m.user_id = p.id AND m.active = true
      ) ELSE NULL END,
      'generated_at', now()
    )
    FROM qr_cards q
    JOIN profiles p ON p.id = q.patient_user_id
    WHERE q.share_token = p_share_token
      AND q.active = true
  ), 'null'::jsonb);
$$;

GRANT EXECUTE ON FUNCTION get_public_qr_card(uuid) TO anon, authenticated;
