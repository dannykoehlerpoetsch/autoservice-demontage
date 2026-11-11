import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageSkeleton from '../PageSkeleton';
import Loading from '../../app/[locale]/loading';

/**
 * Der Ladezustand einer Locale-Seite. Er zeigt dieselben Anker wie die fertige Startseite, damit
 * Sprungmarken während des Ladens nicht ins Leere laufen – und er darf nicht mit Inhalt
 * verwechselt werden, der schon bedienbar wäre.
 */

describe('PageSkeleton', () => {
  it('meldet dem Browser, dass der Inhalt noch kommt', () => {
    const { container } = render(<PageSkeleton />);

    const wurzel = container.firstElementChild;

    expect(wurzel?.getAttribute('aria-busy')).toBe('true');
    expect(wurzel?.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('setzt die Anker der Startseite', () => {
    const { container } = render(<PageSkeleton />);

    for (const anker of ['home', 'services', 'demo']) {
      expect(container.querySelector(`#${anker}`), `#${anker}`).not.toBeNull();
    }
  });

  it('ist reine Dekoration ohne jede Bedienung', () => {
    const { container } = render(<PageSkeleton />);

    expect(container.querySelectorAll('button, a, input, select')).toHaveLength(0);

    const balken = Array.from(container.querySelectorAll('[aria-hidden="true"]'));
    expect(balken.length).toBeGreaterThan(10);
  });
});

describe('loading.tsx', () => {
  it('gibt das Gerüst mit der Einblendklasse weiter', () => {
    const { container } = render(<Loading />);

    expect(container.querySelector('.fallback-reveal')).not.toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
