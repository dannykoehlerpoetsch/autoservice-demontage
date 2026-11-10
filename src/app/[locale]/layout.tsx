import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { toLocale } from '@/i18n/locale';
import { sans } from '@/lib/fonts';
import { SITE_URL } from '@/lib/site';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DemoBanner from '@/components/DemoBanner';
import BookingProvider from '@/components/BookingProvider';
import ThemeInit from '@/components/ThemeInit';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: 'Metadata' });
  const ogLocale = locale === 'de' ? 'de_DE' : 'en_US';

  return {
    metadataBase: new URL(SITE_URL),
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: locale === routing.defaultLocale ? '/' : `/${locale}`,
      siteName: t('title'),
      images: [{ url: '/Heroimage.png' }],
      locale: ogLocale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/Heroimage.png'],
    },
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/*
         * Theme init has to run before the first paint. It lives in <head> rather than
         * <body> on purpose: the beforeInteractive strategy of next/script renders a
         * React-owned <script> as the first child of <body>, and an extension injecting its
         * own <script> at that position gets hydrated against that node (hydration mismatch).
         * Nodes rendered into <head> are not hydrated in place, so injected scripts cannot
         * shift them. ThemeInit unmounts itself once the script has run.
         */}
        <ThemeInit />
      </head>
      <body className={`${sans.className} flex flex-col min-h-screen`} suppressHydrationWarning>
        <NextIntlClientProvider>
          {/* Klebt nicht: der Hinweis scrollt weg, der darunterliegende Header bleibt oben stehen. */}
          <DemoBanner />
          {/* Überlebt die Navigation – trägt Serviceauswahl und abgeschlossene Demo-Anfrage. */}
          <BookingProvider>
            <Header />
            <main className="grow flex flex-col">{children}</main>
            <Footer />
          </BookingProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
