import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import BookingProvider, { useBooking } from '../BookingProvider';
import type { AppointmentInput } from '@/lib/appointment/schema';

/**
 * The provider is the entire data rail of the demo: two values in React state, nothing else. Checked
 * here is what must not happen while doing so – that anything lands in storage, a cookie or the
 * network – and that the values survive the remounting of the children, because the confirmation
 * page is a different route.
 */

const SAVED_REQUEST: AppointmentInput = {
  name: 'Jennifer Krüger',
  phone: '+491701234567',
  email: 'j.krueger@beispiel.de',
  service: 'bremsen',
  date: '2026-11-20',
  note: 'Bremsbelag hinten',
};

function Wrapper() {
  const { serviceId, request, selectService, completeRequest, startNewRequest } = useBooking();
  const [kind, setKind] = useState(0);

  return (
    <>
      <button onClick={() => selectService('reifen')}>Service wählen</button>
      <button onClick={() => selectService(null)}>Service abwählen</button>
      <button onClick={() => completeRequest(SAVED_REQUEST)}>Anfrage abschließen</button>
      <button onClick={startNewRequest}>Neue Anfrage</button>
      <button onClick={() => setKind((k) => k + 1)}>Kind neu montieren</button>

      {/* The child deliberately unmounts and comes back – like during navigation. */}
      <div key={kind}>
        <span data-testid="service">{serviceId ?? 'leer'}</span>
        <span data-testid="anfrage">{request ? request.name : 'leer'}</span>
      </div>
    </>
  );
}

/** Only the consumer, without a provider above it. */
function Orphan() {
  useBooking();
  return null;
}

describe('BookingProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('remembers the chosen service', () => {
    render(
      <BookingProvider>
        <Wrapper />
      </BookingProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Service wählen' }));
    expect(screen.getByTestId('service')).toHaveTextContent('reifen');

    fireEvent.click(screen.getByRole('button', { name: 'Service abwählen' }));
    expect(screen.getByTestId('service')).toHaveTextContent('leer');
  });

  it('keeps the finished request and survives remounting the children', () => {
    render(
      <BookingProvider>
        <Wrapper />
      </BookingProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Anfrage abschließen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kind neu montieren' }));

    // The content was rebuilt, the value stayed: that is exactly what the confirmation page lives on.
    expect(screen.getByTestId('anfrage')).toHaveTextContent('Jennifer Krüger');
    expect(screen.getByTestId('service')).toHaveTextContent('bremsen');
  });

  it('preselects the service of the request', () => {
    render(
      <BookingProvider>
        <Wrapper />
      </BookingProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Neue Anfrage' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anfrage abschließen' }));

    // Whoever goes back into the form after finishing sees the same service as before.
    expect(screen.getByTestId('service')).toHaveTextContent('bremsen');
  });

  it('undoes everything on request', () => {
    render(
      <BookingProvider>
        <Wrapper />
      </BookingProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Anfrage abschließen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Neue Anfrage' }));

    expect(screen.getByTestId('anfrage')).toHaveTextContent('leer');
    expect(screen.getByTestId('service')).toHaveTextContent('leer');
  });

  it("keeps the data in the browser's working memory – nowhere else", () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    render(
      <BookingProvider>
        <Wrapper />
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

  it('reports a clear cause when used without the provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Orphan />)).toThrow(/BookingProvider/);

    consoleSpy.mockRestore();
  });
});
