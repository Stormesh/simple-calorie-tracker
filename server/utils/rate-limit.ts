import type { H3Event } from "h3";

/**
 * Sliding-window rate limiting.
 *
 * The default limiter counts in module memory, which on Cloudflare Workers
 * means "per isolate": it is best-effort, not a durable quota. That trade-off
 * is deliberate — it costs no writes on the hot path. Swapping in a durable
 * backend (D1 or a Durable Object) means implementing `IRateLimiter` and
 * replacing `createRateLimiter`; call sites do not change.
 */

export interface IRateLimitPolicy {
  /** Stable identifier, used in the bucket key. */
  readonly name: string;
  /** Requests allowed per window. */
  readonly max: number;
  /** Window length in milliseconds. */
  readonly windowMs: number;
}

export interface IRateLimitStatus {
  readonly allowed: boolean;
  /** Requests left in the most constrained window. */
  readonly remaining: number;
  /**
   * Epoch ms at which another request would be accepted. Equals `now` while
   * the caller is still allowed, because nothing is exhausted yet.
   */
  readonly retryAt: number;
}

export interface IRateLimiter {
  /** Inspect the current status without consuming quota. */
  peek(ip: string, policies: readonly IRateLimitPolicy[]): IRateLimitStatus;
  /** Record one accepted request. No-op for windows already at their limit. */
  consume(ip: string, policies: readonly IRateLimitPolicy[]): void;
}

interface IBucket {
  count: number;
  resetAt: number;
}

const MINUTE_MS = 60 * 1000;

/** Exported so the durable flag quota can size its windows from one source. */
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Submissions: room for a bulk-entry sitting without leaving the door open. */
export const SUBMISSION_POLICIES: readonly IRateLimitPolicy[] = [
  { name: "submission-hourly", max: 10, windowMs: HOUR_MS },
  { name: "submission-daily", max: 30, windowMs: DAY_MS },
];

/**
 * Failed moderator-token attempts. Successful requests are never consumed, so
 * routine moderation is not throttled while brute force stays bounded.
 */
export const MODERATOR_POLICIES: readonly IRateLimitPolicy[] = [
  { name: "moderator-auth", max: 20, windowMs: MINUTE_MS },
];

const bucketKey = (ip: string, policy: IRateLimitPolicy): string => `${policy.name}:${ip}`;

export const createRateLimiter = (now: () => number = Date.now): IRateLimiter => {
  const buckets = new Map<string, IBucket>();

  const pruneExpired = (time: number): void => {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= time) buckets.delete(key);
    }
  };

  const peek = (ip: string, policies: readonly IRateLimitPolicy[]): IRateLimitStatus => {
    const time = now();
    pruneExpired(time);

    let allowed = true;
    let remaining = Number.POSITIVE_INFINITY;
    let retryAt = time;

    for (const policy of policies) {
      const bucket = buckets.get(bucketKey(ip, policy));
      const capacity = policy.max - (bucket?.count ?? 0);

      remaining = Math.min(remaining, Math.max(0, capacity));

      if (capacity <= 0) {
        allowed = false;
        // The caller is unblocked only once *every* exhausted window has reset,
        // so the latest reset wins.
        retryAt = Math.max(retryAt, bucket?.resetAt ?? time + policy.windowMs);
      }
    }

    return { allowed, remaining, retryAt };
  };

  const consume = (ip: string, policies: readonly IRateLimitPolicy[]): void => {
    const time = now();
    pruneExpired(time);

    for (const policy of policies) {
      const key = bucketKey(ip, policy);
      const bucket = buckets.get(key) ?? { count: 0, resetAt: time + policy.windowMs };

      // A window already at its limit must not be extended by further attempts.
      if (bucket.count >= policy.max) continue;

      bucket.count += 1;
      buckets.set(key, bucket);
    }
  };

  return { peek, consume };
};

const defaultLimiter = createRateLimiter();

export const peekRateLimit = (
  ip: string,
  policies: readonly IRateLimitPolicy[],
): IRateLimitStatus => defaultLimiter.peek(ip, policies);

export const consumeRateLimit = (ip: string, policies: readonly IRateLimitPolicy[]): void =>
  defaultLimiter.consume(ip, policies);

/** Longest textual IPv6 address, used to reject junk before it becomes a map key. */
const MAX_IP_LENGTH = 45;

const firstHeaderValue = (value: string | string[] | undefined): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(",")[0]?.trim() || undefined;
};

const asIp = (value: string | undefined): string | undefined =>
  value && value.length <= MAX_IP_LENGTH ? value : undefined;

/**
 * Identify the caller for rate limiting.
 *
 * Prefers `cf-connecting-ip`, which Cloudflare overwrites at the edge, over
 * `x-forwarded-for`, which a client can set by hand anywhere Cloudflare is not
 * in front of the app.
 */
export const getRateLimitIp = (event: H3Event): string => {
  const headers = event.node.req.headers;

  const connectingIp = asIp(firstHeaderValue(headers["cf-connecting-ip"]));
  if (connectingIp) return connectingIp;

  const forwardedIp = asIp(firstHeaderValue(headers["x-forwarded-for"]));
  if (forwardedIp) return forwardedIp;

  return event.node.req.socket?.remoteAddress ?? "unknown";
};
