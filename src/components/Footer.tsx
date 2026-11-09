import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className="footer-bg text-white py-4 px-6 text-center">
      <p>
        &copy; {new Date().getFullYear()} DaKoPo. {t('rights')}
        <br />
        <Link href="/impressum" scroll={true} className="hover:underline">
          {t('impressum')}
        </Link>
      </p>
      <p className="text-xs text-white/70 mt-2">{t('demoNote')}</p>
    </footer>
  );
}
