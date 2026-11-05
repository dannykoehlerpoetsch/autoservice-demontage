'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { sendAppointmentRequestMail } from '@/lib/appointment/actions';

/**
 * Optionaler E-Mail-Versand auf der Bestätigungsseite.
 *
 * Das Formular schickt nur die Anfrage-ID und die Bestätigung des Wunsches – die
 * Empfängeradresse kennt der Server aus seiner eigenen Kopie der Anfrage, und jeder
 * Eintrag lässt sich genau einmal versenden.
 *
 * Die Ankreuzbox ist gesteuert und ihr Zustand geht als verstecktes Feld mit (`yes`/`no`):
 * bei einer React-Action verlässt man sich nicht darauf, dass eine Checkbox es ins
 * Formular-Inhalt schafft – der versteckte Wert tut das nachweislich immer.
 */

type AppointmentMailOptInProps = {
  id: string;
  email: string;
  /** Steht schon in der Serverkopie: dann gibt es keinen Versandknopf mehr. */
  alreadySent: boolean;
};

export default function AppointmentMailOptIn({
  id,
  email,
  alreadySent,
}: AppointmentMailOptInProps) {
  const t = useTranslations('AppointmentConfirmation.mail');
  const [state, formAction, isPending] = useActionState(sendAppointmentRequestMail, null);
  const [zustimmung, setZustimmung] = useState(true);

  return (
    <div className="mt-8 flex w-full flex-col gap-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <h2 className="text-lg font-semibold">{t('heading')}</h2>

      {alreadySent ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('alreadySent')}</p>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-300">{t('intro')}</p>

          <form action={formAction} noValidate className="mt-1 flex flex-col gap-3">
            <input type="hidden" name="id" value={id} />
            {/*
             * Der Wert kommt absichtlich aus einem versteckten Feld und nicht aus der
             * Ankreuzbox selbst: geprüfte Eingaben sollen nach einer Action zuverlässig
             * denselben Weg zurücklegen – die Box ist nur die Bedienung dazu.
             */}
            <input type="hidden" name="consent" value={zustimmung ? 'yes' : 'no'} readOnly />

            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={zustimmung}
                onChange={(event) => setZustimmung(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand"
              />
              <span>{t('consent', { email })}</span>
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="cursor-pointer self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? t('submitting') : t('submit')}
            </button>
          </form>
        </>
      )}

      {state && <StatusMessage state={state} />}
    </div>
  );
}

function StatusMessage({
  state,
}: {
  state: NonNullable<Awaited<ReturnType<typeof sendAppointmentRequestMail>>>;
}) {
  const t = useTranslations('AppointmentConfirmation.mail');

  const message = (() => {
    switch (state.status) {
      case 'sent':
        return t('sent', { email: state.email ?? '' });
      case 'already-sent':
        return t('alreadySent');
      case 'consent-required':
        return t('consentRequired');
      case 'not-configured':
        return t('notConfigured');
      case 'failed':
        return t('failed');
      case 'expired':
        return t('expired');
    }
  })();

  const isError = state.status === 'failed' || state.status === 'expired';
  const isNotice = state.status === 'not-configured';

  return (
    <p
      role="status"
      aria-live="polite"
      className={
        isError
          ? 'text-sm text-red-700 dark:text-red-300'
          : isNotice
            ? 'text-sm text-yellow-800 dark:text-yellow-200'
            : 'text-sm text-gray-700 dark:text-gray-200'
      }
    >
      {message}
    </p>
  );
}
