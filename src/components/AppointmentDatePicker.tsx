'use client';

import * as Popover from '@radix-ui/react-popover';
import { CalendarDays, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { de } from 'react-day-picker/locale/de';
import { enUS } from 'react-day-picker/locale/en-US';
import {
  formatIsoDateLong,
  fromIsoDate,
  intlLocaleFor,
  toIsoDate,
  type IsoDate,
} from '@/lib/dates';
import 'react-day-picker/style.css';

/**
 * Terminkalender: ein Button als Auslöser, der Kalender selbst in einem Radix-Popover.
 *
 * Auswählbar sind nur Tage zwischen `minDate` und `maxDate`. Beide Grenzen kommen aus
 * `todayIso()` – gerechnet wird in der Zeitzone der Werkstatt, damit "heute" nicht je nach
 * Rechner des Besuchers anders ausfällt und beim Rendern und Hydrieren dasselbe Datum steht.
 *
 * Der Formularwert liegt in einem `hidden`-Input – der Kalender wird in ein Portal außerhalb
 * des Formulars gerendert und steuert die Übergabe des Formulars nicht bei.
 */

type AppointmentDatePickerProps = {
  name: string;
  id: string;
  /** Zugreifbarer Name des Auslösers, ohne sichtbaren Beschriftungstext. */
  label: string;
  value: IsoDate;
  onChange: (value: IsoDate) => void;
  minDate: IsoDate;
  maxDate: IsoDate;
  invalid: boolean;
  describedBy?: string;
  placeholder: string;
};

export default function AppointmentDatePicker({
  name,
  id,
  label,
  value,
  onChange,
  minDate,
  maxDate,
  invalid,
  describedBy,
  placeholder,
}: AppointmentDatePickerProps) {
  const t = useTranslations('Appointment.calendar');
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  // react-day-picker will Date-Objekte, der Kalender-String bleibt die Wahrheit.
  const min = fromIsoDate(minDate);
  const max = fromIsoDate(maxDate);
  const selected = fromIsoDate(value);
  const intlLocale = intlLocaleFor(locale);

  const longDate = (date: Date) =>
    new Intl.DateTimeFormat(intlLocale, { dateStyle: 'full' }).format(date);

  const valueText = selected ? formatIsoDateLong(value, intlLocale) : placeholder;

  return (
    <div className="flex items-center gap-2">
      {/*
       * Trägt den eigentlichen Formularwert (YYYY-MM-DD) – er muss die Schemaprüfung im
       * Formular passieren. Der Schlüssel hält Anfangs- und aktuellen Wert gleich, damit ein
       * Zurücksetzen des Formulars nicht ausgerechnet den gewählten Termin tilgt.
       */}
      <input key={value} type="hidden" name={name} value={value} />

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            id={id}
            aria-label={`${label}: ${valueText}`}
            data-min-date={minDate}
            data-max-date={maxDate}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            aria-expanded={open}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-bg-primary px-3 py-2 text-left text-sm transition-colors hover:border-brand-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line dark:border-gray-600"
          >
            <CalendarDays size={18} aria-hidden="true" className="shrink-0 text-brand-line" />
            <span className={selected ? '' : 'text-gray-500 dark:text-gray-400'}>{valueText}</span>
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            /*
             * Radix meldet den Popover-Inhalt als `role="dialog"`; ohne Namen fragt ein
             * Screenreader ins Leere. Der Name ist derselbe wie am Auslöser – der Kalender
             * ist ja genau dieses Feld.
             */
            aria-label={label}
            className="z-100 rounded-lg border border-gray-200 bg-bg-primary p-2 shadow-xl outline-none data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out motion-reduce:animate-none dark:border-gray-700"
          >
            <DayPicker
              mode="single"
              selected={selected ?? undefined}
              defaultMonth={selected ?? min ?? undefined}
              // Matcher arbeiten exklusiv: minDate und maxDate bleiben dadurch wählbar.
              disabled={min && max ? [{ before: min }, { after: max }] : undefined}
              locale={locale === 'de' ? de : enUS}
              onSelect={(date) => {
                if (!date) {
                  return;
                }
                onChange(toIsoDate(date));
                setOpen(false);
              }}
              labels={{
                labelNav: () => t('navigation'),
                labelPrevious: () => t('previousMonth'),
                labelNext: () => t('nextMonth'),
                labelGrid: (date: Date) => t('grid', { month: longDate(date) }),
                labelDayButton: (date: Date, modifiers: { selected?: boolean; today?: boolean }) =>
                  [
                    longDate(date),
                    ...(modifiers.today ? [t('today')] : []),
                    ...(modifiers.selected ? [t('selected')] : []),
                  ].join(', '),
              }}
              autoFocus
            />

            <div className="mt-2 flex items-center justify-between gap-3 border-t border-gray-100 pt-2 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('hint')}</p>
              <button
                type="button"
                disabled={!value}
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <X size={14} aria-hidden="true" />
                {t('clear')}
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
