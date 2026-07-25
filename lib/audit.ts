'use client';

import { loadDB, saveDB, insertRow } from '@/lib/store';

export async function logAudit(
  userId: string,
  action: string,
  details: Record<string, unknown> = {},
  severity: 'info' | 'warning' | 'critical' = 'info',
  target = '',
  actor = 'user'
) {
  try {
    const db = loadDB();
    insertRow('audit_logs', db, {
      user_id: userId,
      action,
      actor,
      target,
      severity,
      details,
      ip: '127.0.0.1',
    });
    saveDB(db);
  } catch (e) {
    console.error('logAudit failed', e);
  }
}
