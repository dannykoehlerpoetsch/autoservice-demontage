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
 * Appointment calendar: a button as the trigger, the calendar itself inside a Radix popover.
 *
 * Only days between `minDate` and `maxDate` can be picked. Both bounds come from `todayIso()` –
 * arithmetic runs in the workshop's timezone so "today" does not differ depending on the
 * visitor's machine and rendering and hydration see the same date.
 *
 * The form value lives in a `hidden` input – the calendar is rendered into a portal outside the
 * form and does not contribute to the form submission.
 */

type AppointmentDatePickerProps = {
  name: string;
  id: string;
  /** Accessible name of the trigger, without visible label text. */
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

  // react-day-picker wants Date objects, the calendar string stays the source of truth.
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
       * Carries the actual form value (YYYY-MM-DD) – it has to pass the schema check in the
       * form. The key keeps the initial and the current value equal so that resetting the form
       * does not wipe exactly the chosen appointment.
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
             * Radix reports the popover content as `role="dialog"`; without a name a screen
             * reader asks into the void. The name is the same as on the trigger – the calendar
             * is exactly this field.
             */
            aria-label={label}
            className="z-100 rounded-lg border border-gray-200 bg-bg-primary p-2 shadow-xl outline-none data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out motion-reduce:animate-none dark:border-gray-700"
          >
            <DayPicker
              mode="single"
              selected={selected ?? undefined}
              defaultMonth={selected ?? min ?? undefined}
              // Matchers work exclusively: minDate and maxDate stay selectable because of that.
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
