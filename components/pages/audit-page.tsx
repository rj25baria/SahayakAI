'use client';

import { useI18n } from '@/lib/i18n-context';
import { useAuditLogs } from '@/lib/hooks';
import { PageHeader, EmptyState } from '@/components/dashboard/shared';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { AuditLog } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AuditPage() {
  const { t } = useI18n();
  const { logs } = useAuditLogs();

  return (
    <div className="space-y-6">
      <PageHeader title={t('audit.title')} subtitle={t('audit.subtitle')} />

      <Card className="p-5">
        {logs.length === 0 ? (
          <EmptyState icon={ScrollText} title={t('audit.noLogs')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">{t('audit.time')}</th>
                  <th className="pb-2 pr-4 font-medium">{t('audit.action')}</th>
                  <th className="pb-2 pr-4 font-medium">{t('audit.actor')}</th>
                  <th className="pb-2 pr-4 font-medium">{t('audit.severity')}</th>
                  <th className="pb-2 font-medium">{t('audit.details')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l: AuditLog) => (
                  <tr key={l.id} className="border-b border-border/40 align-top">
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{format(parseISO(l.created_at), 'MMM d, h:mm:ss a')}</td>
                    <td className="py-3 pr-4 font-medium">{l.action}</td>
                    <td className="py-3 pr-4 text-xs">{l.actor}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className={cn('text-[10px]', l.severity === 'critical' ? 'text-destructive' : l.severity === 'warning' ? 'text-warning' : 'text-muted-foreground')}>
                        {l.severity}
                      </Badge>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">
                      <pre className="max-w-xs overflow-x-auto whitespace-pre-wrap font-sans">
                        {Object.keys(l.details).length > 0 ? JSON.stringify(l.details) : l.target || '—'}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
