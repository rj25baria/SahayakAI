'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useQrCard } from '@/lib/hooks';
import { loadDB, saveDB, updateRows } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, ShieldAlert, HeartPulse, Pill, Phone, Copy, ExternalLink, Download, Sparkles, Check, Stethoscope } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';

export function MedicalQrCardDeck() {
  const { user, profile } = useAuth();
  const { card, setCard } = useQrCard();
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const publicUrl = typeof window !== 'undefined' && card?.share_token
    ? `${window.location.origin}/qr/${card.share_token}`
    : '';

  useEffect(() => {
    if (!publicUrl) return;
    QRCode.toDataURL(publicUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#0369a1', light: '#ffffff' },
    })
      .then(setQrUrl)
      .catch((err) => console.error('Medical QR render error:', err));
  }, [publicUrl]);

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Medical QR Link Copied!', { description: 'Share this link with first responders or family.' });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `sahayak_medical_qr_${profile?.full_name?.replace(/\s+/g, '_') || 'elder'}.png`;
    a.click();
    toast.success('Medical QR Code Downloaded 📥');
  };

  const updateCardFlag = (flag: 'show_allergies' | 'show_medications' | 'show_conditions' | 'show_emergency_contact' | 'show_insurance' | 'show_doctor' | 'show_blood_group', value: boolean) => {
    if (!card) return;
    const db = loadDB();
    updateRows('qr_cards', db, 'id', card.id, { [flag]: value });
    saveDB(db);
    setCard({ ...card, [flag]: value });
    toast.info('QR Visibility Updated', { description: `${flag.replace('show_', '').replace('_', ' ')} set to ${value ? 'Visible' : 'Hidden'}` });
  };

  if (!card) return null;

  return (
    <Card className="p-5 border-2 border-sky-500/30 bg-gradient-to-br from-sky-500/5 via-background to-teal-500/5 shadow-md">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* QR Image Frame */}
        <div className="flex flex-col items-center shrink-0">
          <div className="relative group p-3 bg-white rounded-2xl border-2 border-sky-500/40 shadow-lg">
            {qrUrl ? (
              <Image src={qrUrl} alt="Emergency Medical ID QR Code" width={176} height={176} unoptimized className="h-44 w-44 object-contain rounded-lg" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-44 w-44 flex items-center justify-center text-xs text-muted-foreground">Rendering QR...</div>
            )}
            <div className="absolute -top-2.5 right-2 bg-sky-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              EMERGENCY ID
            </div>
          </div>

          <div className="mt-2 text-[11px] font-mono text-muted-foreground text-center">
            Scan with any phone camera
          </div>
        </div>

        {/* Content Details */}
        <div className="space-y-3 flex-1 min-w-0 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <Badge variant="outline" className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/40 font-bold px-2.5 py-1">
              <QrCode className="mr-1.5 h-4 w-4 text-sky-600" /> Public Emergency Medical QR ID
            </Badge>

            {profile?.blood_group && (
              <Badge variant="destructive" className="font-bold text-xs px-2.5 py-1">
                Blood: {profile.blood_group}
              </Badge>
            )}
          </div>

          <h3 className="text-lg font-bold text-foreground tracking-tight">
            {profile?.full_name || 'Elder Patient'} &apos;s Life-Saving Medical Card
          </h3>

          <p className="text-xs text-muted-foreground leading-relaxed">
            In case of emergency, paramedics or bystanders scan this QR code to instantly view allergies, blood group, current medications, doctor contact, and emergency guardians — no app install needed.
          </p>

          {/* Controls & Quick Actions */}
          <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-2">
            <Button size="sm" onClick={handleCopy} variant="outline" className="h-9 text-xs gap-1.5 border-sky-500/40 text-sky-700 dark:text-sky-300">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied Link' : 'Copy Emergency Link'}
            </Button>

            {card.share_token && (
              <a href={`/qr/${card.share_token}`} target="_blank" rel="noreferrer">
                <Button size="sm" variant="default" className="h-9 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold">
                  <ExternalLink className="h-3.5 w-3.5" /> Preview Emergency Card
                </Button>
              </a>
            )}

            <Button size="sm" onClick={handleDownload} variant="ghost" className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
              <Download className="h-3.5 w-3.5" /> Download Printable QR
            </Button>
          </div>

          {/* Privacy Visibility Toggles */}
          <div className="pt-2 border-t border-border/50">
            <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center justify-center md:justify-start gap-1">
              <Sparkles className="h-3 w-3 text-sky-500" /> Quick Data Visibility Toggles:
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 text-xs">
              <ToggleChip label="Blood Group" active={card.show_blood_group} onClick={() => updateCardFlag('show_blood_group', !card.show_blood_group)} />
              <ToggleChip label="Allergies" active={card.show_allergies} onClick={() => updateCardFlag('show_allergies', !card.show_allergies)} />
              <ToggleChip label="Meds" active={card.show_medications} onClick={() => updateCardFlag('show_medications', !card.show_medications)} />
              <ToggleChip label="Conditions" active={card.show_conditions} onClick={() => updateCardFlag('show_conditions', !card.show_conditions)} />
              <ToggleChip label="Doctor" active={card.show_doctor} onClick={() => updateCardFlag('show_doctor', !card.show_doctor)} />
              <ToggleChip label="Emergency Contact" active={card.show_emergency_contact} onClick={() => updateCardFlag('show_emergency_contact', !card.show_emergency_contact)} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all border ${
        active
          ? 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300 font-semibold'
          : 'bg-muted/50 border-border/50 text-muted-foreground line-through opacity-60'
      }`}
    >
      {active ? '✓ ' : '✗ '}{label}
    </button>
  );
}
