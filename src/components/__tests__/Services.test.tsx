import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import Services from '../Services';
import deMessages from '../../../messages/de.json';
import enMessages from '../../../messages/en.json';

function renderServices() {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <Services />
    </NextIntlClientProvider>
  );
}

describe('Services', () => {
  it('renders one clickable card per translated service', () => {
    renderServices();

    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(deMessages.Services.items.length);

    for (const { heading, service } of deMessages.Services.items) {
      expect(screen.getByText(heading)).toBeInTheDocument();
      expect(screen.getByText(service)).toBeInTheDocument();
    }
  });

  it('opens a dialog with heading, details, one CTA and one close control', () => {
    renderServices();
    const [first] = deMessages.Services.items;

    fireEvent.click(screen.getByText(first.heading));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: first.heading })).toBeInTheDocument();
    expect(screen.getByText(first.details)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schließen' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `Jetzt Termin für ${first.heading} buchen` })
    ).toBeInTheDocument();
    // Kein zweiter Schließen-Button mehr unter dem Text.
    expect(within(dialog).getAllByRole('button')).toHaveLength(2);
  });

  it('shows the details of the service that was clicked', () => {
    renderServices();
    const brakes = deMessages.Services.items[3];

    fireEvent.click(screen.getByText(brakes.heading));

    expect(screen.getByText(brakes.details)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: brakes.heading })).toBeInTheDocument();
  });

  it('closes the dialog via the close button in the corner', () => {
    renderServices();
    const [first] = deMessages.Services.items;

    fireEvent.click(screen.getByText(first.heading));
    expect(screen.queryByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('provides a short and a detailed description for every service in both locales', () => {
    for (const messages of [deMessages, enMessages]) {
      expect(messages.Services.items).toHaveLength(8);
      for (const item of messages.Services.items) {
        expect(item.service).toBeTruthy();
        expect(item.details).toBeTruthy();
      }
    }
  });
});
