'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';
import { QrCode, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QrCardDisplay({
  url,
  patientName,
  onOpen,
  t,
}: {
  url: string;
  patientName: string;
  onOpen: () => void;
  t: (k: string) => string;
}) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: '#0f1419', light: '#ffffff' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(''));
  }, [url]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `sahayak-qr-${patientName.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  return (
    <Card className="overflow-hidden border-border/60">
      <div className="gradient-primary px-5 py-4 text-white">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          <span className="font-medium">{t('emergency.qrCard')}</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4 p-6">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="Medical QR code" className="h-48 w-48 rounded-xl" />
        ) : (
          <div className="h-48 w-48 animate-pulse rounded-xl bg-muted" />
        )}
        <p className="text-center text-sm text-muted-foreground">{t('emergency.qrDesc')}</p>
        <div className="flex w-full gap-2">
          <Button variant="outline" className="flex-1" onClick={onOpen}>
            <ExternalLink className="mr-2 h-4 w-4" /> {t('emergency.openPublic')}
          </Button>
          <Button variant="outline" className="flex-1" onClick={download}>
            <Download className="mr-2 h-4 w-4" /> {t('emergency.downloadCard')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
