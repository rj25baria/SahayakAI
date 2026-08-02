import { z } from 'zod';

export const VitalReadingSchema = z.object({
  heart_rate: z.number().min(30).max(250).nullable().optional(),
  spo2: z.number().min(50).max(100).nullable().optional(),
  systolic_bp: z.number().min(60).max(250).nullable().optional(),
  diastolic_bp: z.number().min(30).max(150).nullable().optional(),
  temperature: z.number().min(90).max(110).nullable().optional(),
  glucose: z.number().min(30).max(600).nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const AiTriageRequestSchema = z.object({
  symptoms: z.string().min(2, 'Symptoms description required').max(1000),
  age: z.number().min(0).max(120).optional(),
  gender: z.string().optional(),
  existing_conditions: z.array(z.string()).optional(),
  vitals: z.object({
    heart_rate: z.number().optional(),
    spo2: z.number().optional(),
    systolic_bp: z.number().optional(),
    diastolic_bp: z.number().optional(),
    temperature: z.number().optional(),
  }).optional(),
});

export const EmergencyRequestSchema = z.object({
  patient_user_id: z.string().min(1, 'Patient ID required'),
  type: z.string().default('manual_sos'),
  severity: z.enum(['info', 'warning', 'critical']).default('critical'),
  address: z.string().max(300).optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const QrVerificationSchema = z.object({
  request_id: z.string().min(1, 'Request ID required'),
  qr_token: z.string().min(1, 'QR Token required'),
  volunteer_id: z.string().min(1, 'Volunteer ID required'),
  volunteer_lat: z.number().optional(),
  volunteer_lng: z.number().optional(),
  outcome: z.enum(['SAFE', 'NEEDS_ASSISTANCE', 'EMERGENCY']).optional(),
  notes: z.string().max(500).optional(),
});
