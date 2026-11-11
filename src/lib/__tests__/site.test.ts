import { describe, it, expect, afterEach, vi } from 'vitest';

/**
 * The base URL is created when the module loads, so every check is reloaded with its own
 * environment state. The reason is a real failed build: the variable was given without a scheme,
 * `new URL()` threw `ERR_INVALID_URL` and the production build was red.
 */

const ORIGINAL_ENV_VALUE = process.env.NEXT_PUBLIC_SITE_URL;

async function baseUrl(value?: string) {
  if (value === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = value;
  }

  vi.resetModules();

  const modul = await import('../site');

  return modul.SITE_URL as string;
}

afterEach(() => {
  if (ORIGINAL_ENV_VALUE === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_ENV_VALUE;
  }
});

describe('SITE_URL', () => {
  it('uses the production URL when the variable is missing', async () => {
    expect(await baseUrl()).toBe('https://autoservice-demontage.vercel.app');
  });

  it('uses the production URL even for empty and whitespace-only values', async () => {
    expect(await baseUrl('')).toBe('https://autoservice-demontage.vercel.app');
    expect(await baseUrl('   ')).toBe('https://autoservice-demontage.vercel.app');
  });

  it('adds the missing schema – the case of the failed build', async () => {
    const value = await baseUrl('autoservice-demontage.vercel.app');

    expect(value).toBe('https://autoservice-demontage.vercel.app');
    expect(() => new URL(value)).not.toThrow();
  });

  it('leaves a set schema unchanged', async () => {
    expect(await baseUrl('https://preview-abc.vercel.app')).toBe('https://preview-abc.vercel.app');
    expect(await baseUrl('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('cleans up trailing slashes and paths', async () => {
    expect(await baseUrl('https://autoservice-demontage.vercel.app/')).toBe(
      'https://autoservice-demontage.vercel.app'
    );
    // A path inside the variable would otherwise build canonical links like /path/impressum.
    expect(await baseUrl('https://autoservice-demontage.vercel.app/impressum/')).toBe(
      'https://autoservice-demontage.vercel.app'
    );
  });

  it('falls back to the production URL when the value is unusable', async () => {
    const value = await baseUrl('https://');

    expect(value).toBe('https://autoservice-demontage.vercel.app');
    expect(() => new URL(value)).not.toThrow();
  });

  it("keeps the module's fixed addresses valid", async () => {
    vi.resetModules();

    const { PRODUCTION_URL, PORTFOLIO_URL } = await import('../site');

    expect(() => new URL(PRODUCTION_URL)).not.toThrow();
    expect(new URL(PRODUCTION_URL).origin).toBe(PRODUCTION_URL);
    expect(new URL(PORTFOLIO_URL).hostname).toBe('dakopo.vercel.app');
  });
});
