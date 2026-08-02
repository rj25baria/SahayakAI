import type { AlertSeverity, RiskFactor, RiskLevel } from '@/lib/types';

export interface VitalInput {
  heart_rate?: number | null;
  spo2?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  temperature?: number | null;
  glucose?: number | null;
  bmi?: number | null;
}

export interface WellnessInput {
  mood: number;
  pain_level: number;
  sleep_hours: number | null;
  appetite: 'low' | 'normal' | 'high';
  mobility: 'impaired' | 'normal' | 'good';
  energy: number;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
}

interface Rule {
  metric: string;
  label: string;
  test: (v: VitalInput) => boolean;
  severity: AlertSeverity;
  threshold: string;
  value: (v: VitalInput) => string;
  message: string;
}

const pointsFor = (s: AlertSeverity) => (s === 'critical' ? 35 : s === 'warning' ? 18 : 5);

const levelFor = (score: number): RiskLevel => {
  if (score >= 60) return 'critical';
  if (score >= 30) return 'warning';
  if (score >= 12) return 'elevated';
  return 'normal';
};

const VITAL_RULES: Rule[] = [
  {
    metric: 'spo2',
    label: 'SpO₂',
    test: (v) => v.spo2 != null && v.spo2 < 90,
    severity: 'critical',
    threshold: '≥ 92 %',
    value: (v) => `${v.spo2}%`,
    message: 'Blood oxygen saturation dangerously low — seek medical attention.',
  },
  {
    metric: 'spo2',
    label: 'SpO₂',
    test: (v) => v.spo2 != null && v.spo2 >= 90 && v.spo2 < 92,
    severity: 'warning',
    threshold: '≥ 92 %',
    value: (v) => `${v.spo2}%`,
    message: 'Blood oxygen saturation below normal.',
  },
  {
    metric: 'heart_rate',
    label: 'Heart Rate',
    test: (v) => v.heart_rate != null && (v.heart_rate < 50 || v.heart_rate > 120),
    severity: 'critical',
    threshold: '50–120 bpm',
    value: (v) => `${v.heart_rate} bpm`,
    message: 'Heart rate outside safe range.',
  },
  {
    metric: 'heart_rate',
    label: 'Heart Rate',
    test: (v) =>
      v.heart_rate != null &&
      ((v.heart_rate >= 50 && v.heart_rate < 60) || (v.heart_rate > 100 && v.heart_rate <= 120)),
    severity: 'warning',
    threshold: '60–100 bpm',
    value: (v) => `${v.heart_rate} bpm`,
    message: 'Heart rate outside the resting normal range.',
  },
  {
    metric: 'systolic_bp',
    label: 'Systolic BP',
    test: (v) => v.systolic_bp != null && (v.systolic_bp >= 180 || v.systolic_bp < 90),
    severity: 'critical',
    threshold: '90–180 mmHg',
    value: (v) => `${v.systolic_bp} mmHg`,
    message: 'Blood pressure critically abnormal.',
  },
  {
    metric: 'systolic_bp',
    label: 'Systolic BP',
    test: (v) =>
      v.systolic_bp != null &&
      ((v.systolic_bp >= 140 && v.systolic_bp < 180) || (v.systolic_bp >= 90 && v.systolic_bp < 100)),
    severity: 'warning',
    threshold: '100–140 mmHg',
    value: (v) => `${v.systolic_bp} mmHg`,
    message: 'Blood pressure outside the optimal range.',
  },
  {
    metric: 'diastolic_bp',
    label: 'Diastolic BP',
    test: (v) => v.diastolic_bp != null && (v.diastolic_bp >= 120 || v.diastolic_bp < 50),
    severity: 'critical',
    threshold: '50–120 mmHg',
    value: (v) => `${v.diastolic_bp} mmHg`,
    message: 'Diastolic blood pressure critically abnormal.',
  },
  {
    metric: 'diastolic_bp',
    label: 'Diastolic BP',
    test: (v) =>
      v.diastolic_bp != null &&
      ((v.diastolic_bp >= 90 && v.diastolic_bp < 120) || (v.diastolic_bp >= 50 && v.diastolic_bp < 60)),
    severity: 'warning',
    threshold: '60–90 mmHg',
    value: (v) => `${v.diastolic_bp} mmHg`,
    message: 'Diastolic blood pressure outside optimal range.',
  },
  {
    metric: 'temperature',
    label: 'Temperature',
    test: (v) => v.temperature != null && (v.temperature >= 39.5 || v.temperature < 35),
    severity: 'critical',
    threshold: '35–39.5 °C',
    value: (v) => `${v.temperature} °C`,
    message: 'Body temperature critically abnormal.',
  },
  {
    metric: 'temperature',
    label: 'Temperature',
    test: (v) =>
      v.temperature != null &&
      ((v.temperature >= 38 && v.temperature < 39.5) || (v.temperature >= 35 && v.temperature < 36)),
    severity: 'warning',
    threshold: '36–38 °C',
    value: (v) => `${v.temperature} °C`,
    message: 'Body temperature outside normal range.',
  },
  {
    metric: 'glucose',
    label: 'Glucose',
    test: (v) => v.glucose != null && (v.glucose >= 250 || v.glucose < 54),
    severity: 'critical',
    threshold: '54–250 mg/dL',
    value: (v) => `${v.glucose} mg/dL`,
    message: 'Blood glucose critically abnormal.',
  },
  {
    metric: 'glucose',
    label: 'Glucose',
    test: (v) =>
      v.glucose != null &&
      ((v.glucose >= 180 && v.glucose < 250) || (v.glucose >= 54 && v.glucose < 70)),
    severity: 'warning',
    threshold: '70–180 mg/dL',
    value: (v) => `${v.glucose} mg/dL`,
    message: 'Blood glucose outside target range.',
  },
  {
    metric: 'bmi',
    label: 'BMI',
    test: (v) => v.bmi != null && (v.bmi >= 35 || v.bmi < 16),
    severity: 'warning',
    threshold: '18.5–30',
    value: (v) => `${v.bmi}`,
    message: 'BMI indicates high-risk weight category.',
  },
];

export function evaluateVitals(v: VitalInput): RiskResult {
  const factors: RiskFactor[] = [];
  let score = 0;
  for (const rule of VITAL_RULES) {
    if (rule.test(v)) {
      factors.push({
        metric: rule.metric,
        value: rule.value(v),
        threshold: rule.threshold,
        severity: rule.severity,
        message: rule.message,
      });
      score += pointsFor(rule.severity);
    }
  }
  score = Math.min(score, 100);
  return { score, level: levelFor(score), factors };
}

export function evaluateWellness(w: WellnessInput): RiskResult {
  const factors: RiskFactor[] = [];
  let score = 0;
  if (w.pain_level >= 7) {
    factors.push({
      metric: 'pain_level',
      value: `${w.pain_level}/10`,
      threshold: '< 7/10',
      severity: 'critical',
      message: 'Severe pain reported.',
    });
    score += 25;
  } else if (w.pain_level >= 4) {
    factors.push({
      metric: 'pain_level',
      value: `${w.pain_level}/10`,
      threshold: '< 4/10',
      severity: 'warning',
      message: 'Moderate pain reported.',
    });
    score += 12;
  }
  if (w.sleep_hours != null && w.sleep_hours < 4) {
    factors.push({
      metric: 'sleep_hours',
      value: `${w.sleep_hours} h`,
      threshold: '≥ 6 h',
      severity: 'warning',
      message: 'Severely insufficient sleep.',
    });
    score += 12;
  }
  if (w.mood <= 2) {
    factors.push({
      metric: 'mood',
      value: `${w.mood}/5`,
      threshold: '≥ 3/5',
      severity: 'warning',
      message: 'Low mood reported.',
    });
    score += 10;
  }
  if (w.energy <= 2) {
    factors.push({
      metric: 'energy',
      value: `${w.energy}/5`,
      threshold: '≥ 3/5',
      severity: 'warning',
      message: 'Low energy reported.',
    });
    score += 10;
  }
  if (w.mobility === 'impaired') {
    factors.push({
      metric: 'mobility',
      value: 'impaired',
      threshold: 'normal/good',
      severity: 'warning',
      message: 'Mobility impaired.',
    });
    score += 12;
  }
  if (w.appetite === 'low') {
    factors.push({
      metric: 'appetite',
      value: 'low',
      threshold: 'normal',
      severity: 'info',
      message: 'Reduced appetite.',
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return { score, level: levelFor(score), factors };
}

export function riskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'critical':
      return 'text-rose-600 dark:text-rose-400';
    case 'warning':
      return 'text-amber-600 dark:text-amber-400';
    case 'elevated':
      return 'text-sky-600 dark:text-sky-400';
    default:
      return 'text-emerald-600 dark:text-emerald-400';
  }
}

export function riskLevelBg(level: RiskLevel): string {
  switch (level) {
    case 'critical':
      return 'bg-rose-500';
    case 'warning':
      return 'bg-amber-500';
    case 'elevated':
      return 'bg-sky-500';
    default:
      return 'bg-emerald-500';
  }
}

export function riskLevelLabel(level: RiskLevel, t: (k: string) => string): string {
  switch (level) {
    case 'critical':
      return t('risk.critical');
    case 'warning':
      return t('risk.warning');
    case 'elevated':
      return t('risk.elevated');
    default:
      return t('risk.normal');
  }
}

export function severityColor(s: AlertSeverity): string {
  switch (s) {
    case 'critical':
      return 'text-rose-600 dark:text-rose-400';
    case 'warning':
      return 'text-amber-600 dark:text-amber-400';
    default:
      return 'text-sky-600 dark:text-sky-400';
  }
}

export interface SafetyScoreFactor {
  title: string;
  points: number;
  maxPoints: number;
  isPositive: boolean;
  reason: string;
}

export interface ElderSafetyScoreResult {
  score: number;
  level: RiskLevel;
  factors: SafetyScoreFactor[];
}

export function calculateElderSafetyScore(patientId: string, dbData: any): ElderSafetyScoreResult {
  if (!dbData) return { score: 90, level: 'normal', factors: [] };

  const factors: SafetyScoreFactor[] = [];
  let baseScore = 100;

  // 1. Check-in Response Rate (last 7 days)
  const prompts = (dbData.checkin_prompts || []).filter((p: any) => p.patient_user_id === patientId);
  const missedPrompts = prompts.filter((p: any) => p.status === 'timeout').length;
  if (missedPrompts === 0) {
    factors.push({
      title: '100% Check-in Response Rate',
      points: 25,
      maxPoints: 25,
      isPositive: true,
      reason: 'Elder responded promptly to all scheduled wellness prompts in the past 7 days.',
    });
  } else {
    const penalty = Math.min(25, missedPrompts * 12);
    baseScore -= penalty;
    factors.push({
      title: `${missedPrompts} Missed Check-in${missedPrompts > 1 ? 's' : ''}`,
      points: -penalty,
      maxPoints: 25,
      isPositive: false,
      reason: `${missedPrompts} scheduled check-in prompt${missedPrompts > 1 ? 's were' : ' was'} missed without response.`,
    });
  }

  // 2. Medication Adherence Rate
  const logs = (dbData.medication_logs || []).filter((l: any) => l.user_id === patientId);
  const totalMeds = logs.length;
  const takenMeds = logs.filter((l: any) => l.status === 'taken').length;
  const medRate = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;

  if (medRate >= 90) {
    factors.push({
      title: `${medRate}% High Medication Adherence`,
      points: 25,
      maxPoints: 25,
      isPositive: true,
      reason: 'Excellent compliance with prescribed daily medication schedules.',
    });
  } else {
    const penalty = Math.min(25, Math.round((100 - medRate) * 0.3));
    baseScore -= penalty;
    factors.push({
      title: `${medRate}% Medication Adherence`,
      points: -penalty,
      maxPoints: 25,
      isPositive: false,
      reason: `Some scheduled medication doses were missed or delayed.`,
    });
  }

  // 3. Vitals Stability
  const vitals = (dbData.vitals || []).filter((v: any) => v.user_id === patientId);
  const latestVital = vitals[0];
  if (!latestVital || latestVital.risk_level === 'normal') {
    factors.push({
      title: 'Stable Vital Signs',
      points: 25,
      maxPoints: 25,
      isPositive: true,
      reason: 'Heart rate, SpO₂, blood pressure and glucose within safe physiological limits.',
    });
  } else {
    const penalty = latestVital.risk_level === 'critical' ? 25 : latestVital.risk_level === 'warning' ? 15 : 8;
    baseScore -= penalty;
    factors.push({
      title: `Vitals Assessment: ${latestVital.risk_level.toUpperCase()}`,
      points: -penalty,
      maxPoints: 25,
      isPositive: false,
      reason: `Latest vital reading flagged ${latestVital.risk_level} deviation.`,
    });
  }

  // 4. Active Emergency / Alerts Penalty
  const activeEmergencies = (dbData.emergency_requests || []).filter(
    (e: any) => e.patient_user_id === patientId && e.status !== 'resolved' && e.status !== 'cancelled'
  );
  if (activeEmergencies.length > 0) {
    baseScore -= 25;
    factors.push({
      title: 'Active Emergency Request In Progress',
      points: -25,
      maxPoints: 25,
      isPositive: false,
      reason: 'An active SOS / No-response escalation is currently open.',
    });
  } else {
    factors.push({
      title: 'No Active Emergency Escalations',
      points: 25,
      maxPoints: 25,
      isPositive: true,
      reason: 'Zero unresolved emergency incidents in progress.',
    });
  }

  const score = Math.max(0, Math.min(100, Math.round(baseScore)));
  const level: RiskLevel = score >= 80 ? 'normal' : score >= 60 ? 'elevated' : score >= 40 ? 'warning' : 'critical';

  return { score, level, factors };
}
