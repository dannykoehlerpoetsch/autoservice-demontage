import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('NotFound');

  return (
    <section className="flex flex-col items-center justify-center text-center gap-4 py-24 px-4 grow m-auto">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p>{t('description')}</p>
      <Link
        href="/"
        className="text-sm px-4 py-2 rounded-md bg-brand text-white hover:bg-brand/90 transition-colors"
      >
        {t('backHome')}
      </Link>
    </section>
  );
}
