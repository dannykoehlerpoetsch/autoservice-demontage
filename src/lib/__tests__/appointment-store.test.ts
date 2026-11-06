import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  findAppointmentRequest,
  isAppointmentId,
  markAppointmentRequestMailed,
  saveAppointmentRequest,
} from '@/lib/appointment/store';
import type { AppointmentInput } from '@/lib/appointment/schema';

/**
 * Der Demospeicher ist der Sicherheitsanker der Bestätigungsstrecke: nur wer eine der hier
 * liegenden Zufalls-IDs vorweist, kommt an eine Anfrage heran – und jede lässt sich höchstens
 * einmal mailen. Diese Datei prüft die Regeln des Speichers, nicht das Formular.
 */

const EINGABE: AppointmentInput = {
  name: 'Jennifer Krüger',
  phone: '+491701234567',
  email: 'j.krueger@beispiel.de',
  service: 'bremsen',
  date: '2026-06-01',
  note: 'Bremsbelag hinten',
};

const EIN_TAG = 24 * 60 * 60 * 1000;

describe('isAppointmentId', () => {
  it('lässt nur gut geformte Zufalls-IDs durch', () => {
    expect(isAppointmentId(randomUUID())).toBe(true);
  });

  it('weist alles andere ab, was als ID angeklopft wird', () => {
    for (const wert of [
      '',
      '1',
      'admin',
      undefined,
      null,
      42,
      {},
      [],
      // Wohlgeformt, aber großgeschrieben – der Server vergleicht hexadezimal klein.
      randomUUID().toUpperCase(),
      'nicht-nur-hex-0000-0000-0000-000000000000',
    ]) {
      expect(isAppointmentId(wert)).toBe(false);
    }
  });
});

describe('appointment store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('bewahrt die Anfrage so auf, wie die Bestätigungsseite sie braucht', () => {
    const id = saveAppointmentRequest(EINGABE, 'de');

    const gespeichert = findAppointmentRequest(id);

    expect(gespeichert?.input).toEqual(EINGABE);
    expect(gespeichert?.locale).toBe('de');
    expect(gespeichert?.mailSentAt).toBeNull();
  });

  it('merkt sich die Sprache der Anfrage getrennt vom Inhalt', () => {
    const id = saveAppointmentRequest(EINGABE, 'en');

    expect(findAppointmentRequest(id)?.locale).toBe('en');
  });

  it('führt eine wohlgeformte, aber unbekannte ID ins Leere', () => {
    expect(findAppointmentRequest(randomUUID())).toBeUndefined();
  });

  it('führt eine fremde ID ohne Prüfung ins Leere', () => {
    // Kein Nachschlagen in einem Map, bevor die Form geprüft ist – die ID kommt von außen.
    expect(findAppointmentRequest('../../andere-anfrage')).toBeUndefined();
  });

  it('lässt Anfragen nach 24 Stunden verfallen', () => {
    const id = saveAppointmentRequest(EINGABE, 'de');

    vi.advanceTimersByTime(EIN_TAG + 60_000);

    expect(findAppointmentRequest(id)).toBeUndefined();
  });

  it('grenzt die 24 Stunden nicht scharf nach unten aus', () => {
    const id = saveAppointmentRequest(EINGABE, 'de');

    vi.advanceTimersByTime(EIN_TAG - 60_000);

    expect(findAppointmentRequest(id)).toBeDefined();
  });

  it('begrenzt den Speicher gegen Formularspam', () => {
    const erste = saveAppointmentRequest(EINGABE, 'de');

    // Eine Anfrage mehr als die Obergrenze: die älteste muss weichen, die neueste bleiben.
    let letzte = erste;
    for (let i = 0; i < 500; i += 1) {
      letzte = saveAppointmentRequest({ ...EINGABE, note: `Anfrage ${i}` }, 'de');
    }

    expect(findAppointmentRequest(erste)).toBeUndefined();
    expect(findAppointmentRequest(letzte)).toBeDefined();
  });

  it('vermerkt den Versand und ignoriert fremde IDs dabei', () => {
    const id = saveAppointmentRequest(EINGABE, 'de');

    markAppointmentRequestMailed(id, 1_700_000_000_000);

    expect(findAppointmentRequest(id)?.mailSentAt).toBe(1_700_000_000_000);
    expect(() => markAppointmentRequestMailed(randomUUID())).not.toThrow();
  });
});
