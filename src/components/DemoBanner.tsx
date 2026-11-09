import { Megaphone, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PORTFOLIO_URL } from '@/lib/site';

export default function DemoBanner() {
  const t = useTranslations('DemoBanner');

  return (
    <aside
      aria-label={t('ariaLabel')}
      className="bg-slate-900 dark:bg-black px-4 py-2 text-amber-300"
    >
      <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-sm font-medium leading-snug">
        <Megaphone size={16} className="shrink-0" aria-hidden />
        <span className="text-white">{t('text')}</span>
        <a
          href={PORTFOLIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-amber-200"
        >
          {t('cta')}
          <ExternalLink size={13} className="shrink-0" aria-hidden />
          <span className="sr-only">{t('newTab')}</span>
        </a>
      </p>
    </aside>
  );
}
