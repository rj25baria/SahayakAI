'use client';

export interface WhatsAppAlertInput {
  to_phone?: string;
  patient_name: string;
  patient_phone?: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  explanation?: string;
  address?: string;
  maps_url?: string;
}

export interface PushInput {
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  data?: Record<string, string>;
}

export async function sendWhatsAppAlert(input: WhatsAppAlertInput): Promise<{ ok: boolean; delivered_via: string }> {
  console.info('[MOCK] sendWhatsAppAlert', input);
  return { ok: true, delivered_via: 'mock' };
}

export async function sendPushNotification(input: PushInput): Promise<{ ok: boolean; delivered_via: string }> {
  console.info('[MOCK] sendPushNotification', input);
  return { ok: true, delivered_via: 'mock' };
}

export async function showBrowserNotification(
  title: string,
  body: string,
  severity: 'info' | 'warning' | 'critical' = 'info'
) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      return;
    }
  }
  if (Notification.permission === 'granted') {
    try {
      new Notification(`${severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️'} ${title}`, { body });
    } catch {
      // ignore
    }
  }
}

export async function notifyGuardians(
  patientId: string,
  guardians: { guardian_profile?: { phone: string; full_name: string } }[],
  alert: WhatsAppAlertInput & { maps_url?: string }
) {
  const waPromises = guardians
    .filter((g) => g.guardian_profile?.phone)
    .map((g) => sendWhatsAppAlert({ ...alert, to_phone: g.guardian_profile!.phone }));
  const pushPromise = sendPushNotification({
    title: alert.title,
    body: alert.message,
    severity: alert.severity,
    data: { patientId, type: 'emergency' },
  });
  const browserPromise = showBrowserNotification(alert.title, alert.message, alert.severity);
  return Promise.allSettled([...waPromises, pushPromise, browserPromise]);
}

export function subscribeToAlertNotifications(
  userId: string,
  onAlert: (alert: { title: string; message: string; severity: 'info' | 'warning' | 'critical' }) => void
) {
  console.info('[MOCK] subscribeToAlertNotifications for', userId);
  const interval = setInterval(() => {
    // no-op: mock subscription just exists to preserve interface
  }, 10_000);
  return () => clearInterval(interval);
}
