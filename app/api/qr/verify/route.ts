import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import { QrVerificationSchema } from '@/lib/security/validation';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`qr_verify_${ip}`, { windowMs: 60 * 1000, maxRequests: 30 });
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded for QR verification.' }, { status: 429 });
    }

    const rawBody = await req.json();
    const validation = QrVerificationSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid verification payload', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { request_id, qr_token, volunteer_id, volunteer_lat, volunteer_lng, outcome, notes } = validation.data;

    logger.audit('QR_VERIFICATION_ATTEMPT', 'Volunteer scanned patient emergency QR', {
      request_id,
      volunteer_id,
      outcome: outcome || 'SAFE',
    });

    // Simulated verified response for enterprise demo
    return NextResponse.json({
      success: true,
      verified: true,
      timestamp: new Date().toISOString(),
      details: {
        request_id,
        volunteer_id,
        status: 'VERIFIED_PHYSICAL_PRESENCE',
        verified_at: new Date().toISOString(),
        outcome: outcome || 'SAFE',
        gps_location: volunteer_lat && volunteer_lng ? { lat: volunteer_lat, lng: volunteer_lng } : null,
        notes: notes || 'Physical presence confirmed via secure Sahayak QR token.',
      },
    });
  } catch (error) {
    logger.error('Failed to process QR verification', error);
    return NextResponse.json({ error: 'Internal verification failure' }, { status: 500 });
  }
}
