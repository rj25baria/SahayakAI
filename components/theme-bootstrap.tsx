'use client';

import { useEffect } from 'react';

export function ThemeBootstrap() {
  // Apply theme class before paint to avoid FOUC. Actual theme is driven by
  // the auth context once loaded; this just sets a sensible default.
  useEffect(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
    if (stored === 'dark') document.documentElement.classList.add('dark');
  }, []);
  return null;
}
