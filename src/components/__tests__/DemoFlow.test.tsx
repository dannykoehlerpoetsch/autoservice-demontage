import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import messages from '../../../messages/de.json';
import DemoFlow from '../DemoFlow';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

function renderDemoFlow() {
  return render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <DemoFlow />
    </NextIntlClientProvider>
  );
}

const schritte = messages.DemoFlow.steps as { title: string; text: string }[];

describe('DemoFlow', () => {
  it('zaehlt die Schritte in einer geordneten Liste', () => {
    renderDemoFlow();

    const liste = screen.getByRole('list');

    expect(liste.tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(schritte.length);
  });

  it('zeigt jeden Schritt mit Titel und Text aus den Übersetzungen', () => {
    renderDemoFlow();

    for (const schritt of schritte) {
      expect(screen.getByRole('heading', { name: schritt.title })).toBeInTheDocument();
      expect(screen.getByText(schritt.text)).toBeInTheDocument();
    }
  });

  it('gibt die Reihenfolge an die Liste weiter und verbirgt die Zahl dem Screenreader', () => {
    renderDemoFlow();

    const zahlen = screen.getAllByText(/^[\d]$/u);

    expect(zahlen.length).toBeGreaterThan(0);
    for (const zahl of zahlen) {
      expect(zahl).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('weist darauf hin, dass nichts vereinbart und nichts versendet wird', () => {
    renderDemoFlow();

    expect(screen.getByText(messages.DemoFlow.note)).toBeInTheDocument();
  });

  it('führt ohne Umwege zur Demo-Anfrage', () => {
    renderDemoFlow();

    const link = screen.getByRole('link', { name: messages.DemoFlow.cta });

    expect(link).toHaveAttribute('href', '/termin-anfrage');
  });
});
