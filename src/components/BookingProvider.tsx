'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ServiceId } from '@/lib/services';
import type { AppointmentInput } from '@/lib/appointment/schema';

/**
 * Clientseitiger Zustand der Demo-Terminanfrage – der einzige Ort, an dem die Eingaben stehen.
 *
 * Zwei Werte, beide React-State in einem Provider. Der Provider hängt im Layout und überlebt
 * deshalb die clientseitige Navigation:
 *
 * 1. `serviceId` – die Leistung, deren CTA im Detaildialog geklickt wurde. Das Formular
 *    wählt sie daraufhin voraus.
 * 2. `request` – die abgeschlossene Anfrage, die die Bestätigungsseite zusammenfasst.
 *
 * Bewusst kein Storage, kein Cookie, kein Server: Die Daten liegen nur im Arbeitsspeicher des
 * laufenden Browserkontextes. Ein Neuladen der Seite – oder der direkte Aufruf der
 * Bestätigungsseite – trifft deshalb die leere Variante, die den Verlust erklärt, statt zu
 * tun, als käme etwas zurück. Für eine Portfolio-Demo, die nichts versendet und nichts bucht,
 * ist das die kürzeste ehrliche Architektur: zwei Werte brauchen keine State-Bibliothek.
 */

type BookingContextValue = {
  /** Vorauswahl für das Formular, `null`, bis eine Leistung gewählt wurde. */
  serviceId: ServiceId | null;
  /** Abgeschlossene Anfrage für die Bestätigungsseite, `null`, solange nichts abgeschlossen ist. */
  request: AppointmentInput | null;
  /** Auswahl aus dem Detaildialog oder aus dem Servicefeld des Formulars. */
  selectService: (id: ServiceId | null) => void;
  /** Anfrage abschließen: macht die Zusammenfassung möglich und bleibt fürs Nachbearbeiten stehen. */
  completeRequest: (input: AppointmentInput) => void;
  /** Für eine frische Anfrage: Zusammenfassung und Vorauswahl zurücknehmen. */
  startNewRequest: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export default function BookingProvider({ children }: { children: ReactNode }) {
  const [serviceId, setServiceId] = useState<ServiceId | null>(null);
  const [request, setRequest] = useState<AppointmentInput | null>(null);

  const selectService = useCallback((id: ServiceId | null) => setServiceId(id), []);

  const completeRequest = useCallback((input: AppointmentInput) => {
    setRequest(input);
    // Die Leistung der Anfrage bleibt die Vorauswahl – wer zurückkehrt und nachbearbeitet,
    // sieht genau das, was in der Zusammenfassung steht.
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

export function useBookingService(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBookingService muss innerhalb von <BookingProvider> benutzt werden.');
  }
  return context;
}
