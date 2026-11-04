'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ThemeToggle() {
  const t = useTranslations('Header');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

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
      className="p-2 rounded-md hover:bg-green-400 dark:hover:bg-green-800 transition-colors cursor-pointer"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
