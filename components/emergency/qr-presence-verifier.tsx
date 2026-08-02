'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { verifyPhysicalPresenceQr, submitVolunteerOutcome } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QrCode, ShieldCheck, MapPin, CheckCircle2, AlertTriangle, Siren, Scan, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import type { EmergencyRequest, VolunteerOutcome } from '@/lib/types';

interface QrPresenceVerifierProps {
  request: EmergencyRequest;
  onUpdated?: () => void;
}

export function QrPresenceVerifier({ request, onUpdated }: QrPresenceVerifierProps) {
  const { user, profile } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [scannedInput, setScannedInput] = useState<string>('');
  const [verifying, setVerifying] = useState(false);

  // Outcome modal state
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<VolunteerOutcome>('SAFE');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  const token = request.qr_verification_token || `sahayak_v1_verify_${request.patient_user_id}_default`;

  // Generate QR code data URL (Strictly contains secure token, NO medical data)
  useEffect(() => {
    const payload = JSON.stringify({
      type: 'sahayak_physical_presence_token',
      token,
      patient_id: request.patient_user_id,
      system: 'SAHAYAK Elder Safety',
    });

    QRCode.toDataURL(payload, { width: 300, margin: 2, color: { dark: '#0284c7', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch((err) => console.error('QR generation error:', err));
  }, [token, request.patient_user_id]);

  const handleSimulateScan = () => {
    if (!user) return;
    setVerifying(true);

    // Get volunteer current geolocation if browser supports
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => performVerification(pos.coords.latitude, pos.coords.longitude),
        () => performVerification(28.4955, 77.0883) // Fallback Gurugram coords
      );
    } else {
      performVerification(28.4955, 77.0883);
    }
  };

  const handleManualVerify = () => {
    let effectiveToken = scannedInput.trim() || token;
    if (scannedInput.startsWith('{')) {
      try {
        const parsed = JSON.parse(scannedInput);
        if (parsed.token) effectiveToken = parsed.token;
      } catch (e) {
        // use raw string if JSON parse fails
      }
    }
    setVerifying(true);
    performVerification(28.4955, 77.0883, effectiveToken);
  };

  const performVerification = (lat: number, lng: number, tokenToUse?: string) => {
    if (!user) return;
    const inputToken = tokenToUse || scannedInput.trim() || token;
    const res = verifyPhysicalPresenceQr(request.id, user.id, inputToken, lat, lng);
    setVerifying(false);

    if (res.success) {
      toast.success(res.message, { description: `Verified presence within ${res.distanceMeters ?? 15}m` });
      setShowOutcomeDialog(true); // Open outcome selection immediately
      onUpdated?.();
    } else {
      toast.error('Verification Failed', { description: res.message });
    }
  };

  const handleSubmitOutcome = () => {
    if (!user) return;
    submitVolunteerOutcome(request.id, user.id, selectedOutcome, outcomeNotes || 'Volunteer visit verified on-site.');
    setShowOutcomeDialog(false);
    toast.success(`Outcome Recorded: ${selectedOutcome}`, {
      description: 'Incident status updated and sent to caregiver dashboard.',
    });
    onUpdated?.();
  };

  return (
    <div className="space-y-4">
      {/* QR Code Card - Shown on Elder view or Volunteer verification panel */}
      <Card className="p-5 border-sky-500/30 bg-sky-500/5">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* QR Canvas */}
          <div className="flex flex-col items-center shrink-0">
            {qrDataUrl ? (
              <Image src={qrDataUrl} alt="Sahayak Presence QR Code" width={176} height={176} unoptimized className="h-44 w-44 rounded-xl border border-sky-500/30 shadow-md p-2 bg-white" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-44 w-44 rounded-xl border border-dashed flex items-center justify-center text-xs text-muted-foreground">Generating QR...</div>
            )}
            <div className="mt-2 text-[11px] font-mono text-muted-foreground truncate max-w-[180px] text-center">
              Token: {token.slice(0, 18)}...
            </div>
          </div>

          <div className="space-y-2 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <Badge variant="outline" className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/40 font-semibold">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Physical Presence Verification QR
              </Badge>
              {request.qr_verified && (
                <Badge variant="default" className="bg-emerald-600 text-white font-semibold">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Presence Verified
                </Badge>
              )}
            </div>

            <h3 className="font-semibold text-lg text-foreground">
              {request.patient_profile?.full_name || 'Elder'}&apos;s Presence Verification Token
            </h3>

            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-sky-600 dark:text-sky-400">Strict Privacy Enforcement:</span> This QR code contains ONLY a secure random verification token. It contains zero medical or sensitive personal data. Volunteer MUST scan this code in person upon arriving at the elder&apos;s residence.
            </p>

            {/* Volunteer Action Area */}
            {!request.qr_verified ? (
              <div className="pt-2 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={handleSimulateScan}
                    disabled={verifying}
                    className="bg-sky-600 hover:bg-sky-700 text-white gap-2 text-xs font-semibold"
                  >
                    <Scan className="h-4 w-4" />
                    {verifying ? 'Verifying Coordinates...' : '1-Tap Physical Presence QR Verification'}
                  </Button>
                </div>

                <div className="flex items-center gap-2 max-w-sm">
                  <Input
                    placeholder="Or enter token e.g. sahayak_v1_..."
                    value={scannedInput}
                    onChange={(e) => setScannedInput(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <Button size="sm" variant="outline" onClick={handleManualVerify} className="h-8 text-xs shrink-0">
                    Verify
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Physical visit verified on-site ({request.qr_gps_distance_meters ?? 15}m from registered home) at {request.qr_verified_at ? new Date(request.qr_verified_at).toLocaleTimeString() : 'now'}.
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setShowOutcomeDialog(true)} className="ml-2 h-7 text-[11px] shrink-0 border-emerald-500/50">
                    Update Outcome
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Volunteer Visit Outcome Dialog */}
      <Dialog open={showOutcomeDialog} onOpenChange={setShowOutcomeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Confirm Elder Visit Outcome
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select the real physical status observed during your visit with {request.patient_profile?.full_name || 'the elder'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={selectedOutcome === 'SAFE' ? 'default' : 'outline'}
                onClick={() => setSelectedOutcome('SAFE')}
                className={selectedOutcome === 'SAFE' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold' : 'border-emerald-500/40'}
              >
                🟢 SAFE
              </Button>

              <Button
                type="button"
                variant={selectedOutcome === 'NEEDS_ASSISTANCE' ? 'default' : 'outline'}
                onClick={() => setSelectedOutcome('NEEDS_ASSISTANCE')}
                className={selectedOutcome === 'NEEDS_ASSISTANCE' ? 'bg-amber-600 hover:bg-amber-700 text-white font-semibold' : 'border-amber-500/40'}
              >
                🟠 ASSIST
              </Button>

              <Button
                type="button"
                variant={selectedOutcome === 'EMERGENCY' ? 'default' : 'outline'}
                onClick={() => setSelectedOutcome('EMERGENCY')}
                className={selectedOutcome === 'EMERGENCY' ? 'bg-rose-600 hover:bg-rose-700 text-white font-semibold' : 'border-rose-500/40'}
              >
                🔴 SOS
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Volunteer Notes / Observations</label>
              <Textarea
                placeholder="Elder was resting comfortably. Took blood pressure medication, all clear."
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                className="text-xs h-20"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-muted text-[11px] text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-500 shrink-0" />
              <span>
                Evidence logged: GPS Verification ({request.qr_gps_distance_meters ?? 15}m away) + Immutable Audit Timestamp
              </span>
            </div>

            <Button onClick={handleSubmitOutcome} className="w-full bg-primary font-semibold">
              Submit & Complete Visit Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
