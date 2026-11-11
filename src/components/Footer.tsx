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
       * Zwei rechtliche Seiten, beide von jeder Seite aus über dasselbe Landmark erreichbar:
       * Impressum (Diensteanbieter) und Datenschutzerklärung (Verarbeitung). Kein Link darf
       * hier auf eine reale Werkstatt deuten – Adresse, Telefon und Mail gibt es nicht.
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
      {/* text-white/90 statt /70: halbtransparentes Weiß misst auf der Marke nur 2,29:1. */}
      <p className="text-xs text-white/90 mt-2">{t('demoNote')}</p>
    </footer>
  );
}
