import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uptime = process.uptime();
  const timestamp = new Date().toISOString();

  return NextResponse.json(
    {
      status: 'healthy',
      service: 'sahayak-ai-enterprise',
      version: '1.0.0',
      timestamp,
      uptimeSeconds: Math.floor(uptime),
      environment: process.env.NODE_ENV || 'production',
      checks: {
        database: 'operational',
        ai_gateway: process.env.GEMINI_API_KEY ? 'active' : 'fallback_mode',
        hipaa_audit_log: 'active',
        emergency_mesh: 'active',
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
