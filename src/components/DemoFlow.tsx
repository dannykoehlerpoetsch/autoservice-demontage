import { useTranslations } from 'next-intl';
import { ArrowRight, Info } from 'lucide-react';
import { Link } from '@/i18n/navigation';

/**
 * "How the demo works" – the flow of the portfolio demo in four steps.
 *
 * The section explains what the page does instead of describing a location: discover a service,
 * fill the request, look at the summary, open the email preview. It picks up the same path that
 * `ServiceDetailDialog`, `AppointmentForm` and `AppointmentConfirmation` take technically –
 * without repeating it when it is not needed.
 *
 * Not a client component: only translated text stands here, everything runs in server rendering.
 * Number and list are double-carried – `<ol>` carries the order (also for screen readers), the
 * number is a visual aid and therefore `aria-hidden`.
 */

type Step = { title: string; text: string };

export default function DemoFlow() {
  const t = useTranslations('DemoFlow');
  const steps = t.raw('steps') as Step[];

  return (
    <div className="w-full">
      <ol role="list" className="grid gap-4 md:grid-cols-2">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-strong text-sm font-semibold text-white"
            >
              {index + 1}
            </span>
            <div>
              <h3 className="mb-1 font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-4 flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm leading-relaxed dark:border-yellow-800 dark:bg-yellow-950/40">
        <Info size={18} className="mt-0.5 shrink-0 text-brand-line" aria-hidden="true" />
        {t('note')}
      </p>

      <Link
        href="/termin-anfrage"
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand-strong px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-strong/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line"
      >
        <ArrowRight size={18} aria-hidden="true" />
        {t('cta')}
      </Link>
    </div>
  );
}
