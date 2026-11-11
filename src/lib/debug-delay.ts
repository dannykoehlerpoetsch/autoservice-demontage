/**
 * Debug helper: an artificial delay for server content so the loading / suspense skeletons can
 * actually be seen locally.
 *
 * Only active when `SLOW_CONTENT_MS` is set, for example:
 *   SLOW_CONTENT_MS=1500 bun run dev
 *
 * A no-op in production when the variable is not set.
 */
export async function debugDelay(): Promise<void> {
  const raw = process.env.SLOW_CONTENT_MS;
  if (!raw) return;

  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) return;

  await new Promise((resolve) => setTimeout(resolve, ms));
}
