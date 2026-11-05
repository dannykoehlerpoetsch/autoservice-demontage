import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { getMailConfig, sendMail } from '@/lib/appointment/mail';

const MAIL_VARIA = [
  'RESEND_API_KEY',
  'MAIL_FROM',
  'MAIL_REPLY_TO',
  'SMTP_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
] as const;

function setze(vars: Record<string, string>) {
  for (const name of MAIL_VARIA) {
    vi.stubEnv(name, vars[name] ?? '');
  }
}

describe('Mail-Konfiguration', () => {
  beforeEach(() => {
    setze({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('ohne Zugangsdaten bleibt der Versand aus – und sagt warum', () => {
    const config = getMailConfig();

    expect(config.kind).toBe('none');
    if (config.kind === 'none') {
      expect(config.missing).toContain('RESEND_API_KEY');
    }
  });

  it('Resend schlägt SMTP, wenn beide gesetzt sind', () => {
    setze({
      RESEND_API_KEY: 're_test_123',
      MAIL_FROM: 'Werkstatt <terms@example.com>',
      MAIL_REPLY_TO: 'antwort@example.com',
      SMTP_HOST: 'smtp.example.com',
    });

    const config = getMailConfig();

    expect(config).toEqual({
      kind: 'resend',
      apiKey: 're_test_123',
      from: 'Werkstatt <terms@example.com>',
      replyTo: 'antwort@example.com',
    });
  });

  it('ohne Absenderadresse wird auch ein Schlüssel kein Versand', () => {
    setze({ RESEND_API_KEY: 're_test_123' });

    const config = getMailConfig();

    expect(config.kind).toBe('none');
    if (config.kind === 'none') {
      expect(config.missing).toContain('MAIL_FROM');
    }
  });

  it('SMTP mit Host und Port, inkl. Antwortadresse', () => {
    setze({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'benutzer',
      SMTP_PASS: 'geheim',
      MAIL_FROM: 'Terms <terms@example.com>',
    });

    const config = getMailConfig();

    expect(config).toEqual({
      kind: 'smtp',
      url: undefined,
      host: 'smtp.example.com',
      port: 587,
      user: 'benutzer',
      password: 'geheim',
      from: 'Terms <terms@example.com>',
      replyTo: undefined,
    });
  });

  it('leere Werte zählen nicht als gesetzt', () => {
    setze({ SMTP_URL: '   ', MAIL_FROM: 'Terms <terms@example.com>' });

    expect(getMailConfig().kind).toBe('none');
  });

  it('sendMail ohne Provider wirft nicht, sondern meldet „not-configured“', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    const result = await sendMail({
      to: 'j.krueger@beispiel.de',
      subject: 'Terminanfrage',
      text: 'Guten Tag',
    });

    expect(result).toEqual({ status: 'not-configured' });
    // Der Text landet im Log – sonst wäre die Anfrage für niemanden nachvollziehbar.
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0][0])).toContain('j.krueger@beispiel.de');

    info.mockRestore();
  });
});
