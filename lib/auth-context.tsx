'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Profile, Role, Language, Theme } from '@/lib/types';
import {
  loadDB,
  saveDB,
  getSession,
  setSession,
  listAuthUsers,
  writeAuthUsers,
  findAuthUserByEmail,
  insertRow,
  upsertRow,
  updateRows,
  maybeSingleEq,
  generateShareToken,
  uid,
  nowISO,
} from '@/lib/store';
import type { AuthSession, AuthUser } from '@/lib/store';

interface User {
  id: string;
  email: string;
  user_metadata?: Profile | Record<string, unknown>;
}

export interface AuthContextValue {
  user: User | null;
  session: AuthSession | null;
  profile: Profile | null;
  loading: boolean;
  language: Language;
  theme: Theme;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    meta: { full_name: string; role: Role; language: Language; phone: string }
  ) => Promise<{ error: string | null }>;
  signInDemo: () => Promise<{ error: string | null }>;
  signInPatient: () => Promise<{ error: string | null }>;
  signInGuardian: () => Promise<{ error: string | null }>;
  signInDoctor: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<Language>('en');
  const [theme, setThemeState] = useState<Theme>('light');

  const applyTheme = useCallback((t: Theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (t === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, []);

  const loadProfileFor = useCallback(async (uid: string): Promise<Profile | null> => {
    const db = loadDB();
    return maybeSingleEq('profiles', db, 'id', uid);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await loadProfileFor(user.id);
    if (p) {
      setProfile(p);
      setLanguageState(p.language);
      setThemeState(p.theme);
      applyTheme(p.theme);
    }
  }, [user, loadProfileFor, applyTheme]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const s = getSession();
      if (!mounted) return;
      setSessionState(s);
      setUser(s ? { id: s.user.id, email: s.user.email } : null);
      if (s) {
        const p = await loadProfileFor(s.user.id);
        if (mounted && p) {
          setProfile(p);
          setLanguageState(p.language);
          setThemeState(p.theme);
          applyTheme(p.theme);
        }
      }
      setLoading(false);
    };
    init();
    return () => {
      mounted = false;
    };
  }, [loadProfileFor, applyTheme]);

  const setLanguage = useCallback(
    (lang: Language) => {
      setLanguageState(lang);
      if (user) {
        const db = loadDB();
        updateRows('profiles', db, 'id', user.id, { language: lang });
        saveDB(db);
      }
    },
    [user]
  );

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      applyTheme(t);
      if (user) {
        const db = loadDB();
        updateRows('profiles', db, 'id', user.id, { theme: t });
        saveDB(db);
      }
    },
    [user, applyTheme]
  );

  const ensureQrCard = (db: ReturnType<typeof loadDB>, userId: string) => {
    const existing = maybeSingleEq('qr_cards', db, 'patient_user_id', userId);
    if (!existing) {
      insertRow('qr_cards', db, {
        patient_user_id: userId,
        share_token: generateShareToken(),
        show_allergies: true,
        show_medications: true,
        show_conditions: true,
        show_emergency_contact: true,
        show_insurance: true,
        show_doctor: true,
        show_blood_group: true,
        active: true,
      });
    }
  };

  const signIn = useCallback(async (email: string, password: string) => {
    const existing = findAuthUserByEmail(email);
    if (!existing || existing.password !== password) {
      return { error: 'Invalid email or password.' };
    }
    const s: AuthSession = { user: { id: existing.id, email: existing.email } };
    setSession(s);
    setSessionState(s);
    setUser({ id: existing.id, email: existing.email, user_metadata: existing.profile });
    const p = await loadProfileFor(existing.id);
    if (p) {
      setProfile(p);
      setLanguageState(p.language);
      setThemeState(p.theme);
      applyTheme(p.theme);
    }
    // Audit
    const db = loadDB();
    insertRow('audit_logs', db, {
      user_id: existing.id,
      action: 'auth.signin',
      actor: 'user',
      target: '',
      severity: 'info',
      details: { method: 'password' },
      ip: '127.0.0.1',
    });
    saveDB(db);
    return { error: null };
  }, [loadProfileFor, applyTheme]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      meta: { full_name: string; role: Role; language: Language; phone: string }
    ) => {
      const existing = findAuthUserByEmail(email);
      if (existing) return { error: 'An account with this email already exists.' };
      if (!password || password.length < 6) return { error: 'Password must be at least 6 characters.' };
      if (!meta.full_name) return { error: 'Full name is required.' };

      const id = uid('u_');
      const newProfile: Profile = {
        id,
        full_name: meta.full_name,
        phone: meta.phone,
        role: meta.role,
        date_of_birth: null,
        gender: 'other',
        language: meta.language,
        address: '',
        lat: null,
        lng: null,
        blood_group: '',
        allergies: [],
        chronic_conditions: [],
        insurance_provider: '',
        insurance_number: '',
        doctor_name: '',
        doctor_phone: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relation: '',
        avatar_url: '',
        theme: 'light',
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      const db = loadDB();
      upsertRow('profiles', db, newProfile, 'id');
      ensureQrCard(db, id);
      saveDB(db);
      const users = listAuthUsers();
      users.push({ id, email, password, profile: newProfile });
      writeAuthUsers(users);

      return signIn(email, password);
    },
    [signIn]
  );

  const signInPatient = useCallback(async () => {
    const email = 'demo@sahayak.app';
    const password = 'demo123456';
    const existing = findAuthUserByEmail(email);
    if (!existing) {
      const r = await signUp(email, password, {
        full_name: 'Aarav Sharma',
        role: 'patient',
        language: 'en',
        phone: '+91 98765 43210',
      });
      if (r.error) return r;
    }
    return signIn(email, password);
  }, [signIn, signUp]);

  const signInGuardian = useCallback(async () => {
    const email = 'guardian@sahayak.app';
    const password = 'demo123456';
    const existing = findAuthUserByEmail(email);
    if (!existing) {
      const r = await signUp(email, password, {
        full_name: 'Rohan Sharma',
        role: 'guardian',
        language: 'en',
        phone: '+91 99887 65432',
      });
      if (r.error) return r;
    }
    return signIn(email, password);
  }, [signIn, signUp]);

  const signInDoctor = useCallback(async () => {
    const email = 'doctor@sahayak.app';
    const password = 'demo123456';
    const existing = findAuthUserByEmail(email);
    if (!existing) {
      const r = await signUp(email, password, {
        full_name: 'Dr. Priya Mehta',
        role: 'doctor',
        language: 'en',
        phone: '+91 98123 45678',
      });
      if (r.error) return r;
    }
    return signIn(email, password);
  }, [signIn, signUp]);

  const signInDemo = useCallback(async () => {
    return signInPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signInPatient]);

  const signOut = useCallback(async () => {
    setSession(null);
    setSessionState(null);
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        language,
        theme,
        setLanguage,
        setTheme,
        signIn,
        signUp,
        signInDemo,
        signInPatient,
        signInGuardian,
        signInDoctor,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
