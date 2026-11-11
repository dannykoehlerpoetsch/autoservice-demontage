import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { BETREIBER, betreiberAngabe, type BetreiberFeld } from '../legal/operator';

/**
 * Die Betreiberdaten sind die Angaben der Person, die diese Website betreibt. Die Prüfung verlässt
 * sich deshalb nicht auf ihren Inhalt, sondern nur auf das Verhalten: Ein leeres Feld und ein Feld
 * aus nichts als Leerraum gelten als „fehlt“ – davon hängt der Platzhalter auf beiden Seiten ab –
 * und ein eingetragener Wert kommt ohne Randzeichen heraus. Jede Prüfung beginnt darum bei leeren
 * Feldern; nach dem Lauf stehen die Daten wieder so da, wie sie in der Datei stehen.
 */

const FELDER = Object.keys(BETREIBER) as BetreiberFeld[];

const AUSGANGSSTAND: Record<BetreiberFeld, string> = { ...BETREIBER };

beforeEach(() => {
  for (const feld of FELDER) {
    BETREIBER[feld] = '';
  }
});

afterAll(() => {
  Object.assign(BETREIBER, AUSGANGSSTAND);
});

describe('Betreiberdaten', () => {
  it('kennt genau sechs Felder', () => {
    expect(FELDER).toEqual(['name', 'strasse', 'ort', 'email', 'telefon', 'ustIdNr']);
  });

  it('hält ein leeres Feld für nicht eingetragen', () => {
    expect(betreiberAngabe('name')).toBeNull();
  });

  it('hält Leerraum für nicht eingetragen', () => {
    BETREIBER.email = '   \n ';

    expect(betreiberAngabe('email')).toBeNull();
  });

  it('gibt einen eingetragenen Wert ohne Randzeichen zurück', () => {
    BETREIBER.name = '  Erika Beispiel  ';

    expect(betreiberAngabe('name')).toBe('Erika Beispiel');
  });

  it('prüft jedes Feld einzeln', () => {
    BETREIBER.telefon = '+49 30 1234567';

    expect(betreiberAngabe('telefon')).toBe('+49 30 1234567');
    expect(betreiberAngabe('name')).toBeNull();
  });
});
