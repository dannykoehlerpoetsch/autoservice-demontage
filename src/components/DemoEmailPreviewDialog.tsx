'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { buildDemoEmailPreview, type Translate } from '@/lib/appointment/email-preview';
import type { AppointmentInput } from '@/lib/appointment/schema';

/**
 * Vorschau der Bestätigungs-E-Mail – Text, der im Browser entsteht, ohne jeden Versand.
 *
 * Der Dialog zeigt, wie eine E-Mail aussähe, wäre ein Versand gebaut: Absender, Empfänger,
 * Betreff und Rumpf. Es gibt bewusst keinen "Senden"-Knopf, keinen Wartezustand und keine
 * Erfolgsmeldung – es geht nichts nach draußen.
 *
 * Der Rumpf kommt als Klartext aus `buildDemoEmailPreview` und wird als Text gerendert: Auch
 * lange Eingaben brechen um, statt die Box zu sprengen – `dangerouslySetInnerHTML` kommt hier
 * nicht vor.
 */

type DemoEmailPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentInput;
  /** Übersetzte Bezeichnung der gewählten Leistung – steht in Betreff und Rumpf. */
  serviceHeading: string;
};

export default function DemoEmailPreviewDialog({
  open,
  onOpenChange,
  appointment,
  serviceHeading,
}: DemoEmailPreviewDialogProps) {
  // Wurzelnamespace: die Vorschau braucht Schlüssel aus `DemoEmail` *und* aus
  // `Appointment.fields` und spricht deshalb absolute Namen an. next-intl prüft Schlüssel
  // zur Compilezeit, die Vorschau setzt sie aus Feldnamen zusammen – die Übersetzerin läuft
  // zur Laufzeit mit jedem Schlüssel und bekommt hier ihre schlichte Form.
  const t = useTranslations() as unknown as Translate;
  const tPreview = useTranslations('AppointmentConfirmation.preview');
  const locale = useLocale();

  // Reine Funktion ohne Seiteneffekte – ein Merken wäre teurer als der Bau des Textes.
  const preview = buildDemoEmailPreview(
    { ...appointment, serviceHeading },
    { locale, translate: t }
  );

  const zeilen = [
    { label: t('DemoEmail.labels.from'), wert: preview.from },
    {
      label: t('DemoEmail.labels.to'),
      wert: preview.to ?? t('AppointmentConfirmation.notProvided'),
    },
    { label: t('DemoEmail.labels.subject'), wert: preview.subject },
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
            {zeilen.map((zeile) => (
              <div key={zeile.label} className="grid gap-1 py-1.5 sm:grid-cols-[6rem_1fr]">
                <dt className="font-medium text-gray-600 dark:text-gray-300">{zeile.label}</dt>
                <dd className="break-words">{zeile.wert}</dd>
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
