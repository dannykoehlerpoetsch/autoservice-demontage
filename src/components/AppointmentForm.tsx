'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import {
  FIELD_LIMITS,
  getAppointmentDateBounds,
  parseAppointmentRequest,
  readAppointmentValues,
  type AppointmentErrorKey,
  type AppointmentErrors,
  type AppointmentField,
} from '@/lib/appointment/schema';
import { todayIso, type IsoDate } from '@/lib/dates';
import { isServiceId, type ServiceListing } from '@/lib/services';
import { useBookingService } from './BookingProvider';
import AppointmentDatePicker from './AppointmentDatePicker';

/**
 * Formular für die Demo-Terminanfrage.
 *
 * Geprüft wird hier, im Browser: `parseAppointmentRequest` gegen dasselbe Zod-Schema, das
 * auch die Feldlängen und den Terminrahmen setzt. Eine Server Action gibt es nicht – was
 * gültig ist, wandert in den `BookingProvider` und von dort auf die Bestätigungsseite.
 *
 * Die Felder bleiben ungesteuert (`defaultValue` statt `value`): nach einem Fehlversuch
 * stehen die Eingaben noch im Formular, ohne dass jeder Anschlag durch React muss. Nur die
 * Serviceauswahl ist gesteuert, weil der Detaildialog sie mitsetzen kann.
 *
 * Native Browservalidierung ist per `noValidate` aus, damit immer die übersetzten Meldungen
 * des Schemas erscheinen und nicht die des Browsers.
 */

/** Reihenfolge und Eingabetypen der drei Textfelder. */
const TEXT_FIELDS = [
  { name: 'name', type: 'text', autoComplete: 'name', required: true, hasHint: false },
  {
    name: 'phone',
    type: 'tel',
    autoComplete: 'tel',
    inputMode: 'tel',
    required: false,
    hasHint: true,
  },
  {
    name: 'email',
    type: 'email',
    autoComplete: 'email',
    inputMode: 'email',
    required: false,
    hasHint: true,
  },
] as const satisfies readonly {
  name: AppointmentField;
  type: string;
  autoComplete: string;
  inputMode?: string;
  required: boolean;
  hasHint: boolean;
}[];

export default function AppointmentForm() {
  const t = useTranslations('Appointment');
  const tServices = useTranslations('Services');
  const router = useRouter();
  const { serviceId, request, selectService, completeRequest } = useBookingService();

  const [errors, setErrors] = useState<AppointmentErrors>({});
  const [date, setDate] = useState<IsoDate>(request?.date ?? '');

  // Der Terminrahmen hängt am heutigen Kalendertag – `todayIso()` rechnet dabei in der
  // Zeitzone der Werkstatt, nicht in der des Rechners. Dieselbe Funktion liefert beim
  // Rendern und im Browser dasselbe Datum, eine Servervorgabe ist nicht nötig.
  const bounds = useMemo(() => getAppointmentDateBounds(todayIso()), []);

  const items = tServices.raw('items') as ServiceListing[];
  const errorFields = Object.entries(errors) as [AppointmentField, AppointmentErrorKey][];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = parseAppointmentRequest(
      readAppointmentValues(new FormData(event.currentTarget)),
      bounds
    );

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    completeRequest(result.data);
    router.push('/termin-anfrage/bestaetigung');
  }

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

  return (
    <section className="flex flex-col items-start md:px-4 py-4 m-auto w-full max-w-xl" id="termin">
      <h1 className="text-3xl font-bold mb-3">{t('title')}</h1>
      <p className="mb-2 max-w-2xl">{t('intro')}</p>

      <div className="mb-2 flex w-full items-start gap-2 rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100">
        <Info size={18} className="mt-0.5 shrink-0 text-brand-line" aria-hidden="true" />
        <p>
          {t('demoNotice')} {t('testDataHint')}
        </p>
      </div>

      <p className="mb-6 text-xs text-gray-500 dark:text-gray-400">{t('requiredHint')}</p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 w-full">
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
              {t(`fields.${field.name}`)}{' '}
              {field.required ? (
                <span aria-hidden="true">*</span>
              ) : (
                <span className="font-normal text-gray-500 dark:text-gray-400">
                  {t('optional')}
                </span>
              )}
            </label>
            <input
              id={`field-${field.name}`}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              inputMode={'inputMode' in field ? field.inputMode : undefined}
              required={field.required}
              maxLength={FIELD_LIMITS[field.name]}
              placeholder={t(`placeholders.${field.name}`)}
              defaultValue={request?.[field.name] ?? ''}
              aria-invalid={errors[field.name] ? 'true' : undefined}
              aria-describedby={
                errors[field.name]
                  ? `error-${field.name}`
                  : field.hasHint
                    ? `hint-${field.name}`
                    : undefined
              }
              className="rounded-md border border-gray-300 bg-bg-primary px-3 py-2 text-sm transition-colors hover:border-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line aria-[invalid=true]:border-red-500 dark:border-gray-600 dark:hover:border-gray-500"
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
            id="field-service"
            name="service"
            required
            value={serviceId ?? ''}
            onChange={(event) => {
              // Das Feld kann nur die bekannten Kennungen liefern; geprüft wird trotzdem
              // erst wieder durch das Schema.
              selectService(isServiceId(event.target.value) ? event.target.value : null);
            }}
            aria-invalid={errors.service ? 'true' : undefined}
            aria-describedby={errors.service ? 'error-service' : undefined}
            className="rounded-md border border-gray-300 bg-bg-primary px-3 py-2 text-sm transition-colors hover:border-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line aria-[invalid=true]:border-red-500 dark:border-gray-600 dark:hover:border-gray-500"
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
            minDate={bounds.minDate}
            maxDate={bounds.maxDate}
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
            {t('fields.note')}{' '}
            <span className="font-normal text-gray-500 dark:text-gray-400">{t('optional')}</span>
          </label>
          <textarea
            id="field-note"
            name="note"
            rows={4}
            maxLength={FIELD_LIMITS.note}
            placeholder={t('placeholders.note')}
            defaultValue={request?.note ?? ''}
            aria-invalid={errors.note ? 'true' : undefined}
            aria-describedby={errors.note ? 'error-note' : 'hint-note'}
            className="resize-y rounded-md border border-gray-300 bg-bg-primary px-3 py-2 text-sm transition-colors hover:border-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line aria-[invalid=true]:border-red-500 dark:border-gray-600 dark:hover:border-gray-500"
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
            className="cursor-pointer rounded-md bg-brand-strong px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-strong/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line"
          >
            {t('submit')}
          </button>
          <Link href="/#services" className="text-sm underline hover:text-brand-strong self-start">
            {t('backToServices')}
          </Link>
        </div>
      </form>
    </section>
  );
}
