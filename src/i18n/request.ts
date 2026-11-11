import * as rootParams from 'next/root-params';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ locale: override }) => {
  // The caller may pass a locale – for instance generateMetadata through
  // getTranslations({ locale }). It comes from the [locale] segment too, which is why it has to be
  // validated before it is written into a file path.
  let locale = override && hasLocale(routing.locales, override) ? override : undefined;

  if (!locale) {
    const paramValue = await rootParams.locale();
    if (hasLocale(routing.locales, paramValue)) {
      locale = paramValue;
    } else {
      notFound();
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
