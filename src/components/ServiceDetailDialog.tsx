import * as Dialog from '@radix-ui/react-dialog';
import { CalendarPlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useBooking } from './BookingProvider';
import type { ServiceItem } from './Services';

type ServiceDetailDialogProps = {
  service: ServiceItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ServiceDetailDialog({
  service,
  open,
  onOpenChange,
}: ServiceDetailDialogProps) {
  const t = useTranslations('Services');
  const router = useRouter();
  const { selectService } = useBooking();

  // The selection moves into the BookingProvider (layout context) and therefore survives
  // navigation: the form on /termin-anfrage preselects the service with it.
  const requestAppointment = () => {
    if (!service) {
      return;
    }

    selectService(service.id);
    onOpenChange(false);
    router.push('/termin-anfrage');
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out motion-reduce:animate-none" />

        <Dialog.Content className="fixed inset-0 z-100 m-auto h-fit max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-[32rem] overflow-y-auto rounded-2xl border border-gray-200 bg-bg-primary p-5 shadow-2xl outline-none data-[state=open]:animate-content-in data-[state=closed]:animate-content-out motion-reduce:animate-none sm:p-6 dark:border-gray-700">
          <Dialog.Title className="mb-3 text-balance text-xl font-semibold">
            {service?.heading}
          </Dialog.Title>

          <Dialog.Description asChild>
            <p className="mb-6 text-sm leading-relaxed">{service?.details}</p>
          </Dialog.Description>

          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-brand-strong px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-strong/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line"
            onClick={requestAppointment}
          >
            <CalendarPlus size={18} />
            {t('dialog.cta', { service: service?.heading ?? '' })}
          </button>

          <Dialog.Close
            aria-label={t('dialog.close')}
            className="absolute right-4 top-4 cursor-pointer rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <X size={20} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
