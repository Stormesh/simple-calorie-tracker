import { createError, setHeader } from "h3";
import type { H3Event } from "h3";
import type { IRateLimitStatus } from "./rate-limit";

/**
 * Reject a request with 429, including a `Retry-After` header and the exact
 * reset timestamp so clients can tell the user how long to wait instead of
 * showing a generic failure.
 */
export const throwRateLimited = (event: H3Event, status: IRateLimitStatus): never => {
  const retryAfterSeconds = Math.max(1, Math.ceil((status.retryAt - Date.now()) / 1000));

  setHeader(event, "Retry-After", retryAfterSeconds);

  throw createError({
    statusCode: 429,
    statusMessage: "Rate limit exceeded",
    data: { retryAt: status.retryAt, remaining: status.remaining },
  });
};
