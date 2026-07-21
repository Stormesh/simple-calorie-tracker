import type { H3Event } from "h3";

interface IRateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, IRateLimitEntry>();
const MAX_SUBMISSIONS = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;

const cleanup = () => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
};

export const checkRateLimit = (
  ip: string,
): { allowed: boolean; remaining: number; resetAt: number } => {
  cleanup();

  const now = Date.now();
  const existing = store.get(ip);

  if (!existing || existing.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_SUBMISSIONS - 1, resetAt: now + WINDOW_MS };
  }

  if (existing.count >= MAX_SUBMISSIONS) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return { allowed: true, remaining: MAX_SUBMISSIONS - existing.count, resetAt: existing.resetAt };
};

export const getRateLimitIp = (event: H3Event): string => {
  const req = event.node.req;
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0]! : forwarded;
    return first.split(",")[0]!.trim();
  }
  return req.socket?.remoteAddress || "unknown";
};
