'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ServiceId } from '@/lib/services';

/**
 * Merkt sich die Leistung, deren CTA im Detail-Dialog geklickt wurde, damit das
 * Formular auf /termin-anfrage die Auswahl vorauswählen kann.
 *
 * Der Provider hängt im Layout und überlebt damit die client-seitige Navigation zu der
 * neuen Seite – ein normaler `useState` im Dialog wäre mit dem Seitenwechsel weg.
 * Bewusst kein URL-Parameter und kein Storage: die Auswahl ist nur für den einen
 * Durchgang interessant, und der Server verlässt sich ohnehin ausschließlich auf die
 * `z.enum`-Prüfung der Dienstkennung.
 */

export type SelectedService = { id: ServiceId; heading: string };

type BookingContextValue = {
  service: SelectedService | null;
  selectService: (service: SelectedService) => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export default function BookingProvider({ children }: { children: ReactNode }) {
  const [service, setService] = useState<SelectedService | null>(null);
  const selectService = useCallback((next: SelectedService) => setService(next), []);
  const value = useMemo(() => ({ service, selectService }), [service, selectService]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBookingService(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBookingService muss innerhalb von <BookingProvider> benutzt werden.');
  }
  return context;
}
