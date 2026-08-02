/**
 * Structured Enterprise Logger with HIPAA Audit Support
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'AUDIT';

export interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  correlationId?: string;
  userId?: string;
  action?: string;
  details?: Record<string, unknown>;
  error?: string;
}

export function logEvent(
  level: LogLevel,
  message: string,
  details?: Record<string, unknown>,
  userId?: string,
  correlationId?: string
) {
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    correlationId: correlationId || Math.random().toString(36).substring(2, 9),
    userId,
    details,
  };

  const output = JSON.stringify(payload);

  switch (level) {
    case 'ERROR':
    case 'SECURITY':
      console.error(output);
      break;
    case 'WARN':
      console.warn(output);
      break;
    default:
      console.log(output);
      break;
  }
}

export const logger = {
  info: (msg: string, details?: Record<string, unknown>, userId?: string) =>
    logEvent('INFO', msg, details, userId),
  warn: (msg: string, details?: Record<string, unknown>, userId?: string) =>
    logEvent('WARN', msg, details, userId),
  error: (msg: string, error?: unknown, details?: Record<string, unknown>, userId?: string) =>
    logEvent('ERROR', msg, { ...details, error: error instanceof Error ? error.message : String(error) }, userId),
  audit: (action: string, msg: string, details?: Record<string, unknown>, userId?: string) =>
    logEvent('AUDIT', `[HIPAA AUDIT] ${action}: ${msg}`, details, userId),
  security: (msg: string, details?: Record<string, unknown>, userId?: string) =>
    logEvent('SECURITY', `[SECURITY ALERT] ${msg}`, details, userId),
};
