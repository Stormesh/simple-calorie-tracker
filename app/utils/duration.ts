const MINUTE_MS = 60 * 1000;

/**
 * Human-readable wait for a `retryAt` epoch timestamp, e.g. "45 minutes" or
 * "3h 20m". Rounds up so the interface never promises an earlier retry than the
 * server will actually allow.
 */
export const formatRetryDelay = (retryAt: number, now: number = Date.now()): string => {
  const remainingMs = retryAt - now;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "a moment";

  const totalMinutes = Math.ceil(remainingMs / MINUTE_MS);
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
};
