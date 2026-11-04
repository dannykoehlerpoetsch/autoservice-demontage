/**
 * Debug-Helfer: künstliche Verzögerung für Server-Content, damit man
 * Loading-/Suspense-Skeletons lokal überhaupt zu sehen bekommt.
 *
 * Nur aktiv, wenn `SLOW_CONTENT_MS` gesetzt ist, z. B.:
 *   SLOW_CONTENT_MS=1500 npm run dev
 *
 * In Produktion ohne gesetzte Variable ein No-Op.
 */
export async function debugDelay(): Promise<void> {
  const raw = process.env.SLOW_CONTENT_MS;
  if (!raw) return;

  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) return;

  await new Promise((resolve) => setTimeout(resolve, ms));
}
