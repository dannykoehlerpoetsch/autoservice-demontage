'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { applyStoredOrSystemTheme } from '@/lib/theme-script';

export default function ThemeToggle() {
  const t = useTranslations('Header');
  const locale = useLocale();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Switching locales re-renders the root <html> element, which resets the
    // `dark` class applied outside of React's control. Re-apply it here so the
    // user's stored preference (or system preference) survives locale changes.
    applyStoredOrSystemTheme();
    setIsDark(document.documentElement.classList.contains('dark'));
  }, [locale]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t('themeLight') : t('themeDark')}
      className="p-2 rounded-md hover:bg-black/20 dark:hover:bg-white/10 transition-colors cursor-pointer"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
