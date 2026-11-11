import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className="footer-bg text-white py-4 px-6 text-center">
      <p>
        &copy; {new Date().getFullYear()} DaKoPo. {t('rights')}
      </p>
      {/*
       * Two legal pages, both reachable from every page through the same landmark: the legal
       * notice (service provider) and the privacy policy (processing). No link here may point at
       * a real workshop – there is no address, phone or mail.
       */}
      <nav aria-label={t('legalNavLabel')} className="mt-1 flex flex-wrap justify-center gap-x-2">
        <Link href="/impressum" scroll={true} className="hover:underline">
          {t('impressum')}
        </Link>
        <span aria-hidden="true" className="select-none">
          ·
        </span>
        <Link href="/datenschutz" scroll={true} className="hover:underline">
          {t('datenschutz')}
        </Link>
      </nav>
      {/* text-white/90 instead of /70: semi-transparent white only measures 2.29:1 on the brand colour. */}
      <p className="text-xs text-white/90 mt-2">{t('demoNote')}</p>
    </footer>
  );
}
