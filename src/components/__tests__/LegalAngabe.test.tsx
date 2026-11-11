import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Angabe, Anschrift } from '../LegalAngabe';
import { BETREIBER, type BetreiberFeld } from '@/lib/legal/operator';

/**
 * Die beiden Bausteine der Rechtsseiten. Ihre einzige Aufgabe: einen eingetragenen Wert zeigen,
 * sonst einen eindeutigen Platzhalter – und die Anschrift an beiden Stellen gleich aussehen lassen.
 */

const platzhalter = (feld: BetreiberFeld) => `[noch eintragen: ${feld}]`;

const FELDER: BetreiberFeld[] = ['name', 'strasse', 'ort', 'email', 'telefon', 'ustIdNr'];

// Jede Pruefung beginnt bei leeren Feldern; danach steht der Stand der Datei wieder da.
const AUSGANGSSTAND: Record<BetreiberFeld, string> = { ...BETREIBER };

beforeEach(() => {
  for (const feld of FELDER) {
    BETREIBER[feld] = '';
  }
});

afterAll(() => {
  Object.assign(BETREIBER, AUSGANGSSTAND);
});

describe('Angabe', () => {
  it('zeigt den Platzhalter, solange das Feld leer ist', () => {
    render(<Angabe feld="name" platzhalter={platzhalter} />);

    const element = screen.getByText('[noch eintragen: name]');

    expect(element).toBeInTheDocument();
    expect(element.getAttribute('data-rechts-platzhalter')).toBe('true');
    expect(element.getAttribute('data-rechts-wert')).toBeNull();
  });

  it('zeigt den eingetragenen Wert ohne jeden Zusatz', () => {
    BETREIBER.name = 'Erika Beispiel';

    render(<Angabe feld="name" platzhalter={platzhalter} />);

    expect(screen.getByText('Erika Beispiel')).toBeInTheDocument();
    expect(screen.getByText('Erika Beispiel').getAttribute('data-rechts-wert')).toBe('true');
    expect(screen.queryByText('[noch eintragen: name]')).toBeNull();
  });
});

describe('Anschrift', () => {
  it('steht in einem address-Element und nennt drei Zeilen', () => {
    const { container } = render(<Anschrift platzhalter={platzhalter} />);

    const anschrift = container.querySelector('address');

    expect(anschrift).not.toBeNull();
    expect(anschrift?.querySelectorAll('[data-rechts-platzhalter="true"]')).toHaveLength(3);
  });

  it('mischt wertvolle und leere Felder, ohne die Struktur zu ändern', () => {
    BETREIBER.name = 'Erika Beispiel';
    BETREIBER.ort = '12345 Beispielstadt';

    const { container } = render(<Anschrift platzhalter={platzhalter} />);

    const anschrift = container.querySelector('address');

    expect(anschrift?.querySelectorAll('[data-rechts-wert="true"]')).toHaveLength(2);
    expect(anschrift?.querySelectorAll('[data-rechts-platzhalter="true"]')).toHaveLength(1);
    expect(anschrift?.textContent).toContain('Erika Beispiel');
    expect(anschrift?.textContent).toContain('[noch eintragen: strasse]');
  });

  it('setzt die Schrift gegen die kursive Voreinstellung von address', () => {
    const { container } = render(<Anschrift platzhalter={platzhalter} />);

    expect(container.querySelector('address')?.getAttribute('class')).toContain('not-italic');
  });
});
