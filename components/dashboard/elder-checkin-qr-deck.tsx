'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, ShieldCheck, CheckCircle2, Copy, ExternalLink, Download, Sparkles, Check, Users } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';

export function ElderCheckinQrDeck() {
  const { profile } = useAuth();
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const checkinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/vitals?checkin=true&elderId=${profile?.id || 'demo_elder'}`
    : '';

  useEffect(() => {
    if (!checkinUrl) return;
    QRCode.toDataURL(checkinUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#4f46e5', light: '#ffffff' }, // Indigo theme for Guardian Pass
    })
      .then(setQrUrl)
      .catch((err) => console.error('Guardian Checkin QR error:', err));
  }, [checkinUrl]);

  const handleCopy = () => {
    if (!checkinUrl) return;
    navigator.clipboard.writeText(checkinUrl);
    setCopied(true);
    toast.success('Guardian Check-in QR Link Copied!', { description: 'Guardians can scan to log daily physical wellness.' });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `sahayak_guardian_pass_${profile?.full_name?.replace(/\s+/g, '_') || 'elder'}.png`;
    a.click();
    toast.success('Guardian Check-in Pass Downloaded 📥');
  };

  const handleSimulateScan = () => {
    toast.success('Guardian Check-in Recorded! 👍', {
      description: `Physical visit verified for ${profile?.full_name || 'Elder'}. Guardian log updated.`,
    });
  };

  return (
    <Card className="p-5 border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 via-background to-purple-500/5 shadow-md">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* QR Code Graphic Frame */}
        <div className="flex flex-col items-center shrink-0">
          <div className="relative group p-3 bg-white rounded-2xl border-2 border-indigo-500/40 shadow-lg">
            {qrUrl ? (
              <Image src={qrUrl} alt="Guardian Pass & Check-In QR" width={176} height={176} unoptimized className="h-44 w-44 object-contain rounded-lg" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-44 w-44 flex items-center justify-center text-xs text-muted-foreground">Rendering QR...</div>
            )}
            <div className="absolute -top-2.5 right-2 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow">
              GUARDIAN PASS
            </div>
          </div>

          <div className="mt-2 text-[11px] font-mono text-muted-foreground text-center">
            Scan for Daily Family Check-In
          </div>
        </div>

        {/* Content Details */}
        <div className="space-y-3 flex-1 min-w-0 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 font-bold px-2.5 py-1">
              <QrCode className="mr-1.5 h-4 w-4 text-indigo-600" /> Guardian & Family Check-in QR Pass
            </Badge>

            <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Status: Safe & Checked-in
            </Badge>
          </div>

          <h3 className="text-lg font-bold text-foreground tracking-tight">
            {profile?.full_name || 'Aarav Sharma'} &apos;s Guardian Access & Daily Check-in Code
          </h3>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Guardians, family members, or volunteers scan this QR code upon home visits or daily calls to log physical presence, record vitals, and stay synced with the Sahayak Caregiver Network.
          </p>

          {/* Quick Actions */}
          <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-2">
            <Button size="sm" onClick={handleSimulateScan} className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Simulate Guardian Visit Check-in
            </Button>

            <Button size="sm" onClick={handleCopy} variant="outline" className="h-9 text-xs gap-1.5 border-indigo-500/40 text-indigo-700 dark:text-indigo-300">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied Link' : 'Copy Check-in Link'}
            </Button>

            <Button size="sm" onClick={handleDownload} variant="ghost" className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
              <Download className="h-3.5 w-3.5" /> Download QR
            </Button>
          </div>

          <div className="pt-2 text-[11px] text-muted-foreground flex items-center justify-center md:justify-start gap-1">
            <Users className="h-3.5 w-3.5 text-indigo-500" /> Linked Guardians: Rohan Sharma (Primary), Priya V. (Volunteer)
          </div>
        </div>
      </div>
    </Card>
  );
}
