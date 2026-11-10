import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import BookingProvider, { useBookingService } from '../BookingProvider';
import type { AppointmentInput } from '@/lib/appointment/schema';

/**
 * Der Provider ist die gesamte Datenschiene der Demo: zwei Werte in React-State, weiter
 * nichts. Geprüft wird hier, was dabei nicht passieren darf – dass etwas in Storage, Cookie
 * oder Netzwerk landet – und dass die Werte das Neumontieren der Kinder überleben, weil die
 * Bestätigungsseite eine andere Route ist.
 */

const ANFRAGE: AppointmentInput = {
  name: 'Jennifer Krüger',
  phone: '+491701234567',
  email: 'j.krueger@beispiel.de',
  service: 'bremsen',
  date: '2026-11-20',
  note: 'Bremsbelag hinten',
};

function Rahmen() {
  const { serviceId, request, selectService, completeRequest, startNewRequest } =
    useBookingService();
  const [kind, setKind] = useState(0);

  return (
    <>
      <button onClick={() => selectService('reifen')}>Service wählen</button>
      <button onClick={() => selectService(null)}>Service abwählen</button>
      <button onClick={() => completeRequest(ANFRAGE)}>Anfrage abschließen</button>
      <button onClick={startNewRequest}>Neue Anfrage</button>
      <button onClick={() => setKind((k) => k + 1)}>Kind neu montieren</button>

      {/* Das Kind geht bewusst unter und kommt wieder – wie bei einer Navigation. */}
      <div key={kind}>
        <span data-testid="service">{serviceId ?? 'leer'}</span>
        <span data-testid="anfrage">{request ? request.name : 'leer'}</span>
      </div>
    </>
  );
}

/** Nur der Consumer, ohne Provider darüber. */
function Waise() {
  useBookingService();
  return null;
}

describe('BookingProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('merkt sich die gewählte Leistung', () => {
    render(
      <BookingProvider>
        <Rahmen />
      </BookingProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Service wählen' }));
    expect(screen.getByTestId('service')).toHaveTextContent('reifen');

    fireEvent.click(screen.getByRole('button', { name: 'Service abwählen' }));
    expect(screen.getByTestId('service')).toHaveTextContent('leer');
  });

  it('hält die abgeschlossene Anfrage und übersteht das Neumontieren der Kinder', () => {
    render(
      <BookingProvider>
        <Rahmen />
      </BookingProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Anfrage abschließen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kind neu montieren' }));

    // Der Inhalt ist neu gebaut, der Wert geblieben: genau davon lebt die Bestätigungsseite.
    expect(screen.getByTestId('anfrage')).toHaveTextContent('Jennifer Krüger');
    expect(screen.getByTestId('service')).toHaveTextContent('bremsen');
  });

  it('setzt die Vorauswahl auf die Leistung der Anfrage', () => {
    render(
      <BookingProvider>
        <Rahmen />
      </BookingProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Neue Anfrage' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anfrage abschließen' }));

    // Wer nach dem Abschluss zurück ins Formular geht, sieht dieselbe Leistung wie zuvor.
    expect(screen.getByTestId('service')).toHaveTextContent('bremsen');
  });

  it('nimmt auf Wunsch alles zurück', () => {
    render(
      <BookingProvider>
        <Rahmen />
      </BookingProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Anfrage abschließen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Neue Anfrage' }));

    expect(screen.getByTestId('anfrage')).toHaveTextContent('leer');
    expect(screen.getByTestId('service')).toHaveTextContent('leer');
  });

  it('lässt die Daten im Arbeitspeicher des Browsers – nirgends sonst', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    render(
      <BookingProvider>
        <Rahmen />
      </BookingProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Anfrage abschließen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Service wählen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Neue Anfrage' }));

    expect(storage).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.cookie).toBe('');
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);
  });

  it('meldet eine klare Ursache, wenn es ohne Provider benutzt wird', () => {
    const konsole = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Waise />)).toThrow(/BookingProvider/);

    konsole.mockRestore();
  });
});
