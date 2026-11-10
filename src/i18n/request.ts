import * as rootParams from 'next/root-params';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ locale: override }) => {
  // Der Aufrufer kann eine Locale vorgeben – zum Beispiel generateMetadata über
  // getTranslations({ locale }). Auch sie stammt aus dem [locale]-Segment und muss deshalb
  // geprüft werden, bevor sie in einen Dateipfad geschrieben wird.
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
