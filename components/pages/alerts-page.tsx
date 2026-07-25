'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { useAlerts } from '@/lib/hooks';
import { PageHeader, EmptyState } from '@/components/dashboard/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, CheckCircle2, ArrowUpRight, Info, X } from 'lucide-react';
import { logAudit } from '@/lib/audit';
import { loadDB, saveDB, insertRow, updateRows } from '@/lib/store';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import type { Alert } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AlertsPage() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { alerts, refresh } = useAlerts();

  const dismiss = async (a: Alert) => {
    const db = loadDB();
    updateRows('alerts', db, 'id', a.id, { dismissed: true });
    saveDB(db);
    if (user) await logAudit(user.id, 'alert.dismissed', { alertId: a.id });
    refresh();
  };

  const escalate = async (a: Alert) => {
    const db = loadDB();
    updateRows('alerts', db, 'id', a.id, { escalated: true });
    if (user) {
      insertRow('emergency_requests', db, {
        patient_user_id: user.id,
        alert_id: a.id,
        type: a.type,
        severity: a.severity,
        status: 'active',
        lat: profile?.lat ?? null,
        lng: profile?.lng ?? null,
        address: profile?.address ?? '',
        accepted_by: null,
        accepted_at: null,
        resolved_at: null,
        notes: '',
      });
      saveDB(db);
      await logAudit(user.id, 'alert.escalated', { alertId: a.id }, 'critical');
    } else {
      saveDB(db);
    }
    toast.success(t('alerts.escalated'));
    refresh();
  };

  const active = alerts.filter((a) => !a.dismissed);
  const history = alerts.filter((a) => a.dismissed);

  return (
    <div className="space-y-6">
      <PageHeader title={t('alerts.title')} subtitle={t('alerts.subtitle')} />

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">{t('alerts.active')} ({active.length})</TabsTrigger>
          <TabsTrigger value="history">{t('alerts.history')} ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3">
          {active.length === 0 ? (
            <EmptyState icon={CheckCircle2} title={t('alerts.noActive')} description={t('alerts.subtitle')} />
          ) : (
            active.map((a) => <AlertCard key={a.id} a={a} onDismiss={() => dismiss(a)} onEscalate={() => escalate(a)} t={t} />)
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {history.length === 0 ? (
            <EmptyState icon={Bell} title={t('common.noData')} />
          ) : (
            history.map((a) => <AlertCard key={a.id} a={a} dismissed onDismiss={() => dismiss(a)} t={t} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AlertCard({
  a, dismissed, onDismiss, onEscalate, t,
}: {
  a: Alert;
  dismissed?: boolean;
  onDismiss: () => void;
  onEscalate?: () => void;
  t: (k: string) => string;
}) {
  const Icon = a.severity === 'critical' ? AlertTriangle : a.severity === 'warning' ? AlertTriangle : Info;
  const color = a.severity === 'critical' ? 'text-destructive' : a.severity === 'warning' ? 'text-warning' : 'text-sky-500';
  return (
    <Card className={cn('p-5', a.severity === 'critical' && !dismissed ? 'border-destructive/30' : '')}>
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', a.severity === 'critical' ? 'bg-destructive/10' : a.severity === 'warning' ? 'bg-warning/10' : 'bg-sky-500/10')}>
          <Icon className={cn('h-4.5 w-4.5', color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{a.title}</h3>
            <Badge variant="outline" className={cn('text-[10px]', color)}>{a.severity}</Badge>
            {a.escalated && <Badge className="bg-destructive/10 text-destructive text-[10px]"><ArrowUpRight className="mr-1 h-3 w-3" />{t('alerts.escalated')}</Badge>}
            {dismissed && <Badge variant="outline" className="text-[10px] text-muted-foreground">{t('alerts.dismissed')}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>

          {/* Explainable */}
          {a.explanation && (
            <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
              <div className="text-xs font-medium text-muted-foreground">{t('alerts.explanation')}</div>
              <p className="mt-0.5 text-xs">{a.explanation}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {a.metric && <span>{t('alerts.metric')}: <span className="font-medium text-foreground">{a.metric}</span></span>}
                {a.metric_value != null && <span>{t('alerts.value')}: <span className="font-medium text-foreground">{a.metric_value}</span></span>}
                {a.threshold && <span>{t('alerts.threshold')}: <span className="font-medium text-foreground">{a.threshold}</span></span>}
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{format(parseISO(a.created_at), 'MMM d, yyyy · h:mm a')}</span>
            {!dismissed && (
              <div className="flex gap-2">
                {onEscalate && a.severity !== 'info' && !a.escalated && (
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={onEscalate}>
                    <ArrowUpRight className="mr-1 h-3 w-3" /> {t('alerts.escalate')}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onDismiss}>
                  <X className="mr-1 h-3 w-3" /> {t('alerts.dismiss')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
