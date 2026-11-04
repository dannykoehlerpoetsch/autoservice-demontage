'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations('ErrorPage');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex flex-col items-center justify-center text-center gap-4 py-24 px-4 grow m-auto">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p>{t('description')}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="text-sm px-4 py-2 rounded-md bg-brand text-white hover:bg-brand/90 transition-colors cursor-pointer"
        >
          {t('retry')}
        </button>
        <Link href="/" className="text-sm underline hover:text-brand">
          {t('backHome')}
        </Link>
      </div>
    </section>
  );
}
