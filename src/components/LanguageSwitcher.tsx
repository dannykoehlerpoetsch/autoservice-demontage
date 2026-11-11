'use client';

import { useLocale, useTranslations } from 'next-intl';
import { routing, type Locale } from '@/i18n/routing';
import { usePathname, useRouter } from '@/i18n/navigation';

export default function LanguageSwitcher() {
  const t = useTranslations('Header');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label className="flex items-center gap-1 text-sm">
      <span className="sr-only">{t('languageLabel')}</span>
      <select
        value={locale}
        onChange={(e) =>
          router.replace(pathname, { locale: e.target.value as Locale, scroll: false })
        }
        className="bg-transparent border border-white/60 rounded-md px-2 py-1 cursor-pointer"
        aria-label={t('languageLabel')}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc} className="text-black">
            {loc.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
