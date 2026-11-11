import { Suspense } from 'react';
import Image from 'next/image';
import { CalendarCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import Services from '@/components/Services';
import USP from '@/components/USP';
import DemoFlow from '@/components/DemoFlow';
import PageSkeleton from '@/components/PageSkeleton';
import Section from '@/components/Section';
import SectionHeading from '@/components/SectionHeading';
import { debugDelay } from '@/lib/debug-delay';

async function HomeContent() {
  await debugDelay();
  const t = await getTranslations('Home');

  return (
    <>
      <section className="flex flex-col items-start m-auto md:items-center" id="home">
        {/*
         * Die Höhe folgt dem Seitenverhältnis des Logos, nicht der Viewport-Höhe. Ein
         * fester vh-Wert würde das Breiten-/Höhenverhältnis des Rahmens vom Browserfenster
         * abhängig machen: bei object-cover schrumpft dann nur die Breite, das Logo wird
         * links und rechts abgeschnitten. aspect-... hält das Verhältnis des Bildes ein,
         * object-contain zeigt es zusätzlich immer vollständig – auch nach dem nächsten
         * Logo-Tausch mit anderem Verhältnis.
         */}
        <div className="relative w-full md:max-w-[70vw] mx-auto md:mt-8 aspect-[1686/346]">
          <Image
            src="/Heroimage.png"
            alt={t('hero.imageAlt')}
            fill
            className="object-contain"
            sizes="(min-width: 768px) 70vw, 100vw"
            priority
          />
        </div>
        <h1 className="text-4xl font-bold mb-4 md:text-center">{t('hero.title')}</h1>
        <h2 className="text-2xl font-bold mb-4 md:text-center">{t('hero.subtitle')}</h2>
        <p className="mb-2">{t('hero.intro')}</p>
        {/*
         * Kein Telefon- und kein Kontaktlink: der Betrieb ist fiktiv, es gibt nichts
         * anzurufen. Die Primärinteraktion der Seite ist die Demo-Anfrage.
         */}
        <Link
          href="/termin-anfrage"
          className="text-sm px-3 py-1 rounded-md bg-brand-strong text-white hover:bg-brand-strong/90 transition-colors flex items-center gap-2 self-center"
        >
          <CalendarCheck size={20} aria-hidden="true" />
          {t('hero.demoCta')}
        </Link>
      </section>

      <Section>
        <SectionHeading>{t('why.heading')}</SectionHeading>
        <p>{t('why.text')}</p>
        <USP />
      </Section>

      <Section id="services">
        <SectionHeading>{t('services.heading')}</SectionHeading>
        <h3 className="text-lg font-semibold mb-2">{t('services.subheading')}</h3>
        <p className="mb-6 max-w-2xl md:max-w-4xl">{t('services.intro')}</p>
        <Services />
      </Section>

      <Section id="demo">
        <SectionHeading>{t('demo.heading')}</SectionHeading>
        <p className="mb-6 max-w-2xl md:max-w-4xl">{t('demo.intro')}</p>
        <DemoFlow />
      </Section>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<PageSkeleton className="fallback-reveal" />}>
      <HomeContent />
    </Suspense>
  );
}
