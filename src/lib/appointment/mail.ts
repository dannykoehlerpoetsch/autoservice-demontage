/**
 * Mailversand für Terminanfragen – mit zwei hintereinander gereichten Anbietern:
 *
 * 1. `RESEND_API_KEY` gesetzt  -> Resend (REST-API, kein SDK als zusätzliche Abhängigkeit)
 * 2. `SMTP_*`/`SMTP_URL` gesetzt -> nodemailer gegen einen beliebigen SMTP-Server
 * 3. nichts davon             -> `{ status: 'not-configured' }`, die UI sagt es offen
 *
 * Beide Provider-Module werden erst dynamisch importiert, also nur dann geladen, wenn
 * tatsächlich ein Provider konfiguriert ist.
 *
 * Versendet wird ausschließlich als `text/plain`: die Eingaben des Nutzers landen damit
 * nirgends als HTML. Außerdem geht die Mail immer an die Adresse aus der Serverkopie
 * (siehe `store.ts`), nie an ein Adressfeld aus dem Request.
 */

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

export type MailResult =
  | { status: 'sent'; provider: 'resend' | 'smtp' }
  | { status: 'not-configured' }
  | { status: 'failed'; reason: string };

type MailConfig =
  | { kind: 'resend'; apiKey: string; from: string; replyTo?: string }
  | {
      kind: 'smtp';
      url?: string;
      host?: string;
      port?: number;
      user?: string;
      password?: string;
      from: string;
      replyTo?: string;
    }
  | { kind: 'none'; missing: string };

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getMailConfig(): MailConfig {
  const from = env('MAIL_FROM');
  const replyTo = env('MAIL_REPLY_TO');
  const apiKey = env('RESEND_API_KEY');

  if (apiKey) {
    return from
      ? { kind: 'resend', apiKey, from, replyTo }
      : { kind: 'none', missing: 'RESEND_API_KEY ist gesetzt, MAIL_FROM fehlt aber.' };
  }

  const smtpUrl = env('SMTP_URL');
  const smtpHost = env('SMTP_HOST');

  if (smtpUrl || smtpHost) {
    if (!from) {
      return { kind: 'none', missing: 'SMTP ist gesetzt, MAIL_FROM fehlt aber.' };
    }

    const port = env('SMTP_PORT');
    return {
      kind: 'smtp',
      url: smtpUrl,
      host: smtpHost,
      port: port ? Number(port) : undefined,
      user: env('SMTP_USER'),
      password: env('SMTP_PASS'),
      from,
      replyTo,
    };
  }

  return { kind: 'none', missing: 'Weder RESEND_API_KEY noch SMTP_URL/SMTP_HOST gesetzt.' };
}

async function sendWithResend(
  message: MailMessage,
  config: Extract<MailConfig, { kind: 'resend' }>
) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      reply_to: message.replyTo ?? config.replyTo,
      // Kein HTML-Anteil -> keine Markup-Ebene, in die Nutzerangaben geraten könnten.
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    // Die Anbieter-Antwort kann freien Text enthalten – er landet hier nur im Log.
    throw new Error(`Resend antwortete mit ${response.status}: ${body.slice(0, 300)}`);
  }
}

async function sendWithSmtp(message: MailMessage, config: Extract<MailConfig, { kind: 'smtp' }>) {
  const { createTransport } = await import('nodemailer');

  const transport = createTransport(
    config.url
      ? config.url
      : {
          host: config.host,
          port: config.port ?? 587,
          auth: config.user ? { user: config.user, pass: config.password } : undefined,
        }
  );

  await transport.sendMail({
    from: config.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    replyTo: message.replyTo ?? config.replyTo,
  });
}

/** Mail rausschicken. Wirft nicht: Ergebnisse kommen als Status zurück. */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const config = getMailConfig();

  if (config.kind === 'none') {
    console.info(
      [
        `[booking] Kein Mail-Provider konfiguriert (${config.missing}) – Nachricht nicht versendet.`,
        `         Empfänger: ${message.to}`,
        `         Betreff: ${message.subject}`,
        `         Text:`,
        message.text,
      ].join('\n')
    );
    return { status: 'not-configured' };
  }

  try {
    if (config.kind === 'resend') {
      await sendWithResend(message, config);
      return { status: 'sent', provider: 'resend' };
    }

    await sendWithSmtp(message, config);
    return { status: 'sent', provider: 'smtp' };
  } catch (error) {
    console.error('[booking] Mailversand fehlgeschlagen', error);
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'unbekannter Fehler',
    };
  }
}
