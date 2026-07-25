'use client';

import { PublicQrPage } from '@/components/pages/public-qr-page';

export default function Page({ params }: { params: { token: string } }) {
  return <PublicQrPage token={params.token} />;
}
