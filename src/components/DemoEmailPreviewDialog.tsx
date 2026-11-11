'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { buildDemoEmailPreview, type Translate } from '@/lib/appointment/email-preview';
import type { AppointmentInput } from '@/lib/appointment/schema';

/**
 * Preview of the confirmation email – text that is produced in the browser, without any sending.
 *
 * The dialog shows what an email would look like if sending were built: sender, recipient,
 * subject and body. There is deliberately no "send" button, no waiting state and no success
 * message – nothing goes out.
 *
 * The body arrives as plain text from `buildDemoEmailPreview` and is rendered as text: even long
 * input wraps instead of bursting the box – `dangerouslySetInnerHTML` does not appear here.
 */

type DemoEmailPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentInput;
  /** Translated name of the chosen service – stands in subject and body. */
  serviceHeading: string;
};

export default function DemoEmailPreviewDialog({
  open,
  onOpenChange,
  appointment,
  serviceHeading,
}: DemoEmailPreviewDialogProps) {
  // Root namespace: the preview needs keys from `DemoEmail` *and* from
  // `Appointment.fields` and therefore addresses absolute names. next-intl checks keys at
  // compile time, the preview assembles them from field names – the translator runs at runtime
  // with any key and gets its plain form here.
  const t = useTranslations() as unknown as Translate;
  const tPreview = useTranslations('AppointmentConfirmation.preview');
  const locale = useLocale();

  // Pure function without side effects – memoising would cost more than building the text.
  const preview = buildDemoEmailPreview(
    { ...appointment, serviceHeading },
    { locale, translate: t }
  );

  const rows = [
    { label: t('DemoEmail.labels.from'), value: preview.from },
    {
      label: t('DemoEmail.labels.to'),
      value: preview.to ?? t('AppointmentConfirmation.notProvided'),
    },
    { label: t('DemoEmail.labels.subject'), value: preview.subject },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out motion-reduce:animate-none" />

        <Dialog.Content className="fixed inset-0 z-100 m-auto h-fit max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-[32rem] overflow-y-auto rounded-2xl border border-gray-200 bg-bg-primary p-5 shadow-2xl outline-none data-[state=open]:animate-content-in data-[state=closed]:animate-content-out motion-reduce:animate-none sm:p-6 dark:border-gray-700">
          <Dialog.Title className="mb-1 pr-8 text-xl font-semibold">
            {tPreview('title')}
          </Dialog.Title>
          <Dialog.Description asChild>
            <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {tPreview('note')}
            </p>
          </Dialog.Description>

          <dl className="mb-4 divide-y divide-gray-200 text-sm dark:divide-gray-700">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-1 py-1.5 sm:grid-cols-[6rem_1fr]">
                <dt className="font-medium text-gray-600 dark:text-gray-300">{row.label}</dt>
                <dd className="break-words">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div
            tabIndex={0}
            aria-label={t('DemoEmail.bodyLabel')}
            className="max-h-[45vh] overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-line dark:border-gray-700 dark:bg-gray-900"
          >
            <pre className="m-0 break-words font-sans text-sm leading-relaxed whitespace-pre-wrap">
              {preview.body}
            </pre>
          </div>

          <Dialog.Close
            aria-label={tPreview('close')}
            className="absolute right-4 top-4 cursor-pointer rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <X size={20} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
