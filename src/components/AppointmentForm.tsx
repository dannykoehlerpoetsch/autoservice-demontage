'use client';

import { useActionState, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { submitAppointmentRequest } from '@/lib/appointment/actions';
import {
  FIELD_LIMITS,
  type AppointmentErrorKey,
  type AppointmentField,
} from '@/lib/appointment/schema';
import { isServiceId, type ServiceId } from '@/lib/services';
import type { IsoDate } from '@/lib/dates';
import { useBookingService } from './BookingProvider';
import AppointmentDatePicker from './AppointmentDatePicker';

/**
 * Formular für die Terminanfrage.
 *
 * Die einzige Prüfinstanz ist das Zod-Schema im Server-Action – das Formular schickt nur
 * die Felddaten und spiegelt zurück, was der Server beanstandet hat. Native
 * Browservalidierung ist per `noValidate` aus, damit immer die (übersetzten) Meldungen des
 * Schemas erscheinen und nicht die des Browsers.
 */

type ServiceItem = { id: string; heading: string };

/** Erster Kandidat, der eine bekannte Leistungs-ID ist – Rest wird ignoriert. */
function pickServiceId(...candidates: (string | undefined)[]): ServiceId | '' {
  for (const candidate of candidates) {
    if (isServiceId(candidate)) {
      return candidate;
    }
  }
  return '';
}

type AppointmentFormProps = {
  /** Terminrahmen vom Server, damit "heute" nicht von Client- zu Servertag springt. */
  minDate: IsoDate;
  maxDate: IsoDate;
};

const TEXT_FIELDS = [
  { name: 'name', type: 'text', autoComplete: 'name', hasHint: false },
  { name: 'phone', type: 'tel', autoComplete: 'tel', inputMode: 'tel', hasHint: true },
  { name: 'email', type: 'email', autoComplete: 'email', inputMode: 'email', hasHint: true },
] as const satisfies readonly {
  name: AppointmentField;
  type: string;
  autoComplete: string;
  inputMode?: string;
  hasHint: boolean;
}[];

export default function AppointmentForm({ minDate, maxDate }: AppointmentFormProps) {
  const t = useTranslations('Appointment');
  const tServices = useTranslations('Services');
  const locale = useLocale();
  const { service } = useBookingService();

  const [state, formAction, isPending] = useActionState(submitAppointmentRequest, null);
  const [date, setDate] = useState<IsoDate>(state?.values.date ?? '');

  const items = tServices.raw('items') as ServiceItem[];
  const errors = state?.errors ?? {};
  const errorFields = Object.entries(errors) as [AppointmentField, AppointmentErrorKey][];

  const valueOf = (field: AppointmentField) => state?.values?.[field] ?? '';

  // Explizite Zuordnung statt dynamischer Schlüssel: die Meldungstexte bleiben typisiert.
  function errorLabel(field: AppointmentField, key: AppointmentErrorKey): string {
    switch (key) {
      case 'required':
        return t('errors.required');
      case 'tooLong':
        return t('errors.tooLong', { max: FIELD_LIMITS[field as keyof typeof FIELD_LIMITS] });
      case 'nameTooShort':
        return t('errors.nameTooShort');
      case 'nameInvalid':
        return t('errors.nameInvalid');
      case 'phoneInvalid':
        return t('errors.phoneInvalid');
      case 'emailInvalid':
        return t('errors.emailInvalid');
      case 'serviceInvalid':
        return t('errors.serviceInvalid');
      case 'dateInvalid':
        return t('errors.dateInvalid');
      case 'dateInPast':
        return t('errors.dateInPast');
      case 'dateTooFar':
        return t('errors.dateTooFar');
      case 'noteInvalid':
        return t('errors.noteInvalid');
    }
  }

  // Vorauswahl: zuerst der vom Server zurückgemeldete Wert (nach einem Fehlversuch), dann die
  // Auswahl aus dem Service-Dialog.
  //
  // Das Feld ist bewusst ungesteuert und zusätzlich `key`-gesteuert: React setzt ein Formular
  // nach einer Action zurück, und bei einem gesteuerten `select` gewinnt dieser Reset mitunter
  // über den React-Wert. Über den Schlüssel gehört zum angezeigten Wert immer derselbe
  // Anfangswert, wohin der Reset auch zurückschiebt.
  const initialService = pickServiceId(state?.values.service, service?.id);

  return (
    <section className="flex flex-col items-start md:px-4 py-4 m-auto w-full max-w-xl" id="termin">
      <h1 className="text-3xl font-bold mb-3">{t('title')}</h1>
      <p className="mb-2 max-w-2xl">{t('intro')}</p>
      <p className="mb-6 text-xs text-gray-500 dark:text-gray-400">{t('requiredHint')}</p>

      <form action={formAction} noValidate className="flex flex-col gap-5 w-full">
        {/*
         * Der Server darf `getLocale()` in einer Server Action nicht aufrufen; die Sprache der
         * Anfrage wandert deshalb als verstecktes Feld mit – geprüft wird sie dort trotzdem.
         */}
        <input type="hidden" name="locale" value={locale} readOnly />
        {errorFields.length > 0 && (
          <div
            id="form-errors"
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
          >
            <p className="font-medium mb-1">{t('errorSummary')}</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {errorFields.map(([field, key]) => (
                <li key={field}>
                  <span className="font-medium">{t(`fields.${field}`)}:</span>{' '}
                  {errorLabel(field, key)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {TEXT_FIELDS.map((field) => (
          <div key={field.name} className="flex flex-col gap-1">
            <label htmlFor={`field-${field.name}`} className="text-sm font-medium">
              {t(`fields.${field.name}`)} <span aria-hidden="true">*</span>
            </label>
            <input
              id={`field-${field.name}`}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              inputMode={'inputMode' in field ? field.inputMode : undefined}
              required
              maxLength={FIELD_LIMITS[field.name]}
              placeholder={t(`placeholders.${field.name}`)}
              defaultValue={valueOf(field.name)}
              aria-invalid={errors[field.name] ? 'true' : undefined}
              aria-describedby={
                errors[field.name]
                  ? `error-${field.name}`
                  : field.hasHint
                    ? `hint-${field.name}`
                    : undefined
              }
              className="rounded-md border border-gray-300 bg-bg-primary px-3 py-2 text-sm transition-colors hover:border-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand aria-[invalid=true]:border-red-500 dark:border-gray-600 dark:hover:border-gray-500"
            />
            {field.hasHint && !errors[field.name] && (
              <p id={`hint-${field.name}`} className="text-xs text-gray-500 dark:text-gray-400">
                {t(`hints.${field.name}`)}
              </p>
            )}
            {errors[field.name] && (
              <p id={`error-${field.name}`} className="text-xs text-red-700 dark:text-red-300">
                {errorLabel(field.name, errors[field.name]!)}
              </p>
            )}
          </div>
        ))}

        <div className="flex flex-col gap-1">
          <label htmlFor="field-service" className="text-sm font-medium">
            {t('fields.service')} <span aria-hidden="true">*</span>
          </label>
          <select
            key={initialService}
            id="field-service"
            name="service"
            required
            defaultValue={initialService}
            aria-invalid={errors.service ? 'true' : undefined}
            aria-describedby={errors.service ? 'error-service' : undefined}
            className="rounded-md border border-gray-300 bg-bg-primary px-3 py-2 text-sm transition-colors hover:border-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand aria-[invalid=true]:border-red-500 dark:border-gray-600 dark:hover:border-gray-500"
          >
            <option value="">{t('placeholders.service')}</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.heading}
              </option>
            ))}
          </select>
          {errors.service && (
            <p id="error-service" className="text-xs text-red-700 dark:text-red-300">
              {errorLabel('service', errors.service)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="field-date" className="text-sm font-medium">
            {t('fields.date')} <span aria-hidden="true">*</span>
          </label>
          <AppointmentDatePicker
            name="date"
            id="field-date"
            label={t('fields.date')}
            value={date}
            onChange={setDate}
            minDate={minDate}
            maxDate={maxDate}
            invalid={Boolean(errors.date)}
            describedBy={errors.date ? 'error-date' : undefined}
            placeholder={t('placeholders.date')}
          />
          {errors.date && (
            <p id="error-date" className="text-xs text-red-700 dark:text-red-300">
              {errorLabel('date', errors.date)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="field-note" className="text-sm font-medium">
            {t('fields.note')}
          </label>
          <textarea
            id="field-note"
            name="note"
            rows={4}
            maxLength={FIELD_LIMITS.note}
            placeholder={t('placeholders.note')}
            defaultValue={valueOf('note')}
            aria-invalid={errors.note ? 'true' : undefined}
            aria-describedby={errors.note ? 'error-note' : 'hint-note'}
            className="resize-y rounded-md border border-gray-300 bg-bg-primary px-3 py-2 text-sm transition-colors hover:border-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand aria-[invalid=true]:border-red-500 dark:border-gray-600 dark:hover:border-gray-500"
          />
          <p id="hint-note" className="text-xs text-gray-500 dark:text-gray-400">
            {t('hints.note')}
          </p>
          {errors.note && (
            <p id="error-note" className="text-xs text-red-700 dark:text-red-300">
              {errorLabel('note', errors.note)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t('submitting') : t('submit')}
          </button>
          <Link href="/#services" className="text-sm underline hover:text-brand self-start">
            {t('backToServices')}
          </Link>
        </div>
      </form>
    </section>
  );
}
