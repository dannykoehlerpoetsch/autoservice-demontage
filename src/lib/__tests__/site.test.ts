import { describe, it, expect, afterEach, vi } from 'vitest';

/**
 * Die Basis-URL entsteht beim Laden des Moduls, also wird jede Prüfung mit eigenem
 * Umgebungsstand neu geladen. Der Anlass ist ein echter Fehlbuild: die Variable war ohne Schema
 * angegeben, `new URL()` warf `ERR_INVALID_URL` und der Produktionsbuild war rot.
 */

const URSPRUNG = process.env.NEXT_PUBLIC_SITE_URL;

async function basis(wert?: string) {
  if (wert === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = wert;
  }

  vi.resetModules();

  const modul = await import('../site');

  return modul.SITE_URL as string;
}

afterEach(() => {
  if (URSPRUNG === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = URSPRUNG;
  }
});

describe('SITE_URL', () => {
  it('nutzt die Produktionsadresse, wenn die Variable fehlt', async () => {
    expect(await basis()).toBe('https://autoservice-demontage.vercel.app');
  });

  it('nutzt die Produktionsadresse auch fuer leere und reine Leerraum-Angaben', async () => {
    expect(await basis('')).toBe('https://autoservice-demontage.vercel.app');
    expect(await basis('   ')).toBe('https://autoservice-demontage.vercel.app');
  });

  it('ergaenzt das fehlende Schema – der Fall des fehlgeschlagenen Builds', async () => {
    const wert = await basis('autoservice-demontage.vercel.app');

    expect(wert).toBe('https://autoservice-demontage.vercel.app');
    expect(() => new URL(wert)).not.toThrow();
  });

  it('laesst ein gesetztes Schema unveraendert', async () => {
    expect(await basis('https://preview-abc.vercel.app')).toBe('https://preview-abc.vercel.app');
    expect(await basis('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('raeumt Schraegstriche und Pfade am Ende auf', async () => {
    expect(await basis('https://autoservice-demontage.vercel.app/')).toBe(
      'https://autoservice-demontage.vercel.app'
    );
    // Ein Pfad in der Variable wuerde sonst Canonical-Links wie /pfad/impressum bauen.
    expect(await basis('https://autoservice-demontage.vercel.app/impressum/')).toBe(
      'https://autoservice-demontage.vercel.app'
    );
  });

  it('faellt auf die Produktionsadresse zurueck, wenn die Angabe unbrauchbar ist', async () => {
    const wert = await basis('https://');

    expect(wert).toBe('https://autoservice-demontage.vercel.app');
    expect(() => new URL(wert)).not.toThrow();
  });

  it('haelt die festen Adressen des Moduls gueltig', async () => {
    vi.resetModules();

    const { PRODUKTIONS_URL, PORTFOLIO_URL } = await import('../site');

    expect(() => new URL(PRODUKTIONS_URL)).not.toThrow();
    expect(new URL(PRODUKTIONS_URL).origin).toBe(PRODUKTIONS_URL);
    expect(new URL(PORTFOLIO_URL).hostname).toBe('dakopo.vercel.app');
  });
});
