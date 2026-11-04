import Image from 'next/image';
import { MapPin, Phone } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Services from '@/components/Services';
import USP from '@/components/USP';
import Map from '@/components/Map';
import Section from '@/components/Section';
import SectionHeading from '@/components/SectionHeading';
import type { Locale } from '@/i18n/routing';

type HomeProps = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('Home');

  return (
    <>
      <section className="flex flex-col items-start m-auto md:items-center" id="home">
        <div className="relative w-full md:max-w-[70vw] h-[15vh] md:h-[25vh] mx-auto md:mt-8">
          <Image
            src="/Heroimage.png"
            alt={t('hero.imageAlt')}
            fill
            className="object-cover"
            sizes="60vw"
            priority
          />
        </div>
        <h1 className="text-4xl font-bold mb-4 md:text-center">{t('hero.title')}</h1>
        <h2 className="text-2xl font-bold mb-4 md:text-center">{t('hero.subtitle')}</h2>
        <p className="mb-2">{t('hero.intro')}</p>
        <p className="flex items-center gap-2 mb-2 self-center">
          <MapPin size={20} />
          {t('hero.address')}
        </p>
        <a
          href="tel:+4915112345678"
          className="text-sm px-3 py-1 rounded-md bg-brand text-white hover:bg-brand/90 transition-colors flex items-center gap-2 self-center"
        >
          {' '}
          <Phone size={20} />
          {t('hero.callButton')}
        </a>
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

      <Section id="anfahrt">
        <SectionHeading>{t('location.heading')}</SectionHeading>
        <Map />
      </Section>
    </>
  );
}
