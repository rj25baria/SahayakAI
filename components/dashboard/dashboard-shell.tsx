'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Activity,
  Pill,
  HeartPulse,
  Siren,
  Bell,
  BarChart3,
  ScrollText,
  Settings,
  Heart,
  Menu,
  Sun,
  Moon,
  Languages,
  LogOut,
  ShieldCheck,
  Users,
  Stethoscope,
  User,
  QrCode,
  ClipboardList,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeToAlertNotifications } from '@/lib/notifications';
import { MedicationReminderListener } from '@/components/notifications/medication-reminder-listener';
import { toast } from 'sonner';
import type { Role, Language, Theme } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
  badge?: string;
}

const ROLE_THEME: Record<Role, { accent: string; ring: string; tag: string; tagBg: string }> = {
  patient: {
    accent: 'from-primary to-chart-2',
    ring: 'ring-primary/30',
    tag: 'Elder Patient Portal',
    tagBg: 'bg-primary/10 text-primary',
  },
  guardian: {
    accent: 'from-sky-500 to-cyan-500',
    ring: 'ring-sky-400/30',
    tag: 'Guardian & Volunteer Hub',
    tagBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  doctor: {
    accent: 'from-emerald-500 to-teal-500',
    ring: 'ring-emerald-400/30',
    tag: 'Doctor Panel (Clinical)',
    tagBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  admin: {
    accent: 'from-amber-500 to-orange-500',
    ring: 'ring-amber-400/30',
    tag: 'Admin Console',
    tagBg: 'bg-amber-500/10 text-amber-600',
  },
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut, theme, setTheme, language, setLanguage } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role: Role = profile?.role ?? 'patient';
  const themeCfg = ROLE_THEME[role];

  // Role-specific navs
  const patientNav: NavItem[] = [
    { href: '/overview', label: t('nav.overview'), icon: Home, roles: ['patient'] },
    { href: '/vitals', label: t('nav.vitals'), icon: Activity, roles: ['patient'] },
    { href: '/medications', label: t('nav.medications'), icon: Pill, roles: ['patient'] },
    { href: '/wellness', label: t('nav.wellness'), icon: HeartPulse, roles: ['patient'] },
    { href: '/emergency', label: t('nav.emergency'), icon: Siren, roles: ['patient'], badge: 'SOS' },
    { href: '/alerts', label: t('nav.alerts'), icon: Bell, roles: ['patient'] },
    { href: '/analytics', label: t('nav.analytics'), icon: BarChart3, roles: ['patient'] },
    { href: '/audit', label: t('nav.audit'), icon: ScrollText, roles: ['patient'] },
    { href: '/settings', label: t('nav.settings'), icon: Settings, roles: ['patient'] },
  ];

  const guardianNav: NavItem[] = [
    { href: '/overview', label: 'My Wards', icon: Users, roles: ['guardian'] },
    { href: '/vitals', label: 'Patient Vitals', icon: Activity, roles: ['guardian'] },
    { href: '/medications', label: 'Adherence', icon: Pill, roles: ['guardian'] },
    { href: '/wellness', label: 'Wellness', icon: HeartPulse, roles: ['guardian'] },
    { href: '/emergency', label: 'SOS Coordination', icon: Siren, roles: ['guardian'], badge: 'Live' },
    { href: '/alerts', label: 'Active Alerts', icon: Bell, roles: ['guardian'] },
    { href: '/analytics', label: 'Trends', icon: BarChart3, roles: ['guardian'] },
    { href: '/settings', label: 'Settings', icon: Settings, roles: ['guardian'] },
  ];

  const doctorNav: NavItem[] = [
    { href: '/overview', label: 'Patient Roster', icon: Stethoscope, roles: ['doctor'] },
    { href: '/vitals', label: 'Vitals Review', icon: Activity, roles: ['doctor'] },
    { href: '/medications', label: 'Prescriptions', icon: Pill, roles: ['doctor'] },
    { href: '/wellness', label: 'Wellness Notes', icon: ClipboardList, roles: ['doctor'] },
    { href: '/alerts', label: 'Escalated Alerts', icon: Bell, roles: ['doctor'], badge: '!' },
    { href: '/emergency', label: 'Emergencies', icon: Siren, roles: ['doctor'] },
    { href: '/analytics', label: 'Population Trends', icon: BarChart3, roles: ['doctor'] },
    { href: '/audit', label: 'Audit Log', icon: ScrollText, roles: ['doctor'] },
    { href: '/settings', label: 'Preferences', icon: Settings, roles: ['doctor'] },
  ];

  const allNav = role === 'doctor' ? doctorNav : role === 'guardian' ? guardianNav : patientNav;
  const navItems = allNav.filter((i) => !i.roles || i.roles.includes(role));

  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md',
            'bg-gradient-to-br',
            themeCfg.accent
          )}
        >
          {role === 'doctor' ? (
            <Stethoscope className="h-5 w-5" />
          ) : role === 'guardian' ? (
            <Users className="h-5 w-5" />
          ) : (
            <HeartPulse className="h-5 w-5" />
          )}
        </div>
        <div className="leading-tight">
          <div className="text-base font-semibold tracking-tight">{t('app.name')}</div>
          <div className={cn('text-[10px] rounded-md inline-block px-1.5 py-0.5 font-medium', themeCfg.tagBg)}>
            {themeCfg.tag}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 no-scrollbar">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'h-4.5 w-4.5 shrink-0',
                  active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    'ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                    item.badge === 'SOS' || item.badge === 'Live'
                      ? 'bg-destructive text-white animate-pulse'
                      : item.badge === '!'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-primary text-white'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback
              className={cn(
                'text-xs font-medium bg-gradient-to-br text-white',
                themeCfg.accent
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{profile?.full_name}</div>
            <div className="truncate text-xs capitalize text-muted-foreground flex items-center gap-1">
              {role === 'doctor' && <Stethoscope className="h-3 w-3 text-emerald-500" />}
              {role === 'guardian' && <Users className="h-3 w-3 text-sky-500" />}
              {role === 'patient' && <User className="h-3 w-3 text-primary" />}
              <span>{t(`auth.${role}`)}</span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => signOut()}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const cycleLanguage = () => {
    const next: Language = language === 'en' ? 'hi' : 'en';
    setLanguage(next);
  };
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  // Subscribe to realtime alert notifications for the signed-in user
  useEffect(() => {
    if (!profile?.id) return;
    const unsub = subscribeToAlertNotifications(profile.id, (a) => {
      toast[a.severity === 'critical' ? 'error' : a.severity === 'warning' ? 'warning' : 'info'](
        a.title,
        { description: a.message }
      );
    });
    return () => { unsub(); };
  }, [profile?.id]);

  return (
    <div className="flex min-h-screen bg-background">
      <MedicationReminderListener />
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border/60 bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-r border-border/60 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Mobile navigation sidebar links</SheetDescription>
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/60 glass px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span className="hidden sm:inline">System operational</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold',
                themeCfg.tagBg,
                'border-current/20'
              )}
            >
              {role === 'doctor' && <Stethoscope className="h-3 w-3" />}
              {role === 'guardian' && <Users className="h-3 w-3" />}
              {role === 'patient' && <User className="h-3 w-3" />}
              {themeCfg.tag}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={cycleLanguage}
              aria-label="Switch language"
            >
              <Languages className="h-4.5 w-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </Button>
            <Link href="/emergency">
              <Button
                size="sm"
                variant={role === 'patient' ? 'destructive' : role === 'guardian' ? 'default' : 'outline'}
                className={cn(
                  'ml-1 h-9 gap-1.5 px-3 font-medium',
                  role === 'guardian' && 'bg-sky-600 hover:bg-sky-700',
                  role === 'doctor' && 'text-emerald-700 border-emerald-500/40 hover:bg-emerald-500/10'
                )}
              >
                <Siren className={cn('h-4 w-4', role === 'patient' && 'animate-pulse')} />
                <span className="hidden sm:inline">
                  {role === 'patient' ? 'SOS' : role === 'guardian' ? 'Respond' : 'ER View'}
                </span>
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
