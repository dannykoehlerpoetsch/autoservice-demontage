'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ServiceId } from '@/lib/services';
import type { AppointmentInput } from '@/lib/appointment/schema';

/**
 * Client-side state of the demo appointment request – the only place the input lives.
 *
 * Two values, both React state in one provider. The provider sits in the layout and therefore
 * survives client-side navigation:
 *
 * 1. `serviceId` – the service whose CTA was clicked in the detail dialog. The form preselects it.
 * 2. `request` – the finished request that the confirmation page summarises.
 *
 * Deliberately no storage, no cookie, no server: the data only lies in the memory of the running
 * browser context. Reloading the page – or calling the confirmation page directly – therefore hits
 * the empty variant, which explains the loss instead of acting as if something came back. For a
 * portfolio demo that sends nothing and books nothing this is the shortest honest architecture:
 * two values need no state library.
 */

type BookingContextValue = {
  /** Preselection for the form, `null` until a service was chosen. */
  serviceId: ServiceId | null;
  /** Finished request for the confirmation page, `null` while nothing was finished. */
  request: AppointmentInput | null;
  /** Auswahl aus dem Detaildialog oder aus dem Servicefeld des Formulars. */
  selectService: (id: ServiceId | null) => void;
  /** Finishes the request: makes the summary possible and stays for editing. */
  completeRequest: (input: AppointmentInput) => void;
  /** For a fresh request: undo the summary and the preselection. */
  startNewRequest: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export default function BookingProvider({ children }: { children: ReactNode }) {
  const [serviceId, setServiceId] = useState<ServiceId | null>(null);
  const [request, setRequest] = useState<AppointmentInput | null>(null);

  const selectService = useCallback((id: ServiceId | null) => setServiceId(id), []);

  const completeRequest = useCallback((input: AppointmentInput) => {
    setRequest(input);
    // The service of the request stays the preselection – whoever returns and edits
    // sees exactly what the summary shows.
    setServiceId(input.service);
  }, []);

  const startNewRequest = useCallback(() => {
    setRequest(null);
    setServiceId(null);
  }, []);

  const value = useMemo(
    () => ({ serviceId, request, selectService, completeRequest, startNewRequest }),
    [serviceId, request, selectService, completeRequest, startNewRequest]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBookingService must be used inside <BookingProvider>.');
  }
  return context;
}
