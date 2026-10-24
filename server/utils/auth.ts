import type { H3Event } from "h3";
import { createHash, timingSafeEqual } from "node:crypto";
import { MODERATOR_POLICIES, consumeRateLimit, getRateLimitIp, peekRateLimit } from "./rate-limit";
import { throwRateLimited } from "./rate-limit-http";

const MODERATOR_HEADER = "moderator-token";

/**
 * Compare two secrets without leaking their contents through timing.
 *
 * Both values are hashed first so the comparison always runs over two
 * fixed-length digests. That sidesteps `timingSafeEqual`'s equal-length
 * requirement without exposing the secret's length.
 */
const secretsMatch = (candidate: string, expected: string): boolean =>
  timingSafeEqual(
    createHash("sha256").update(candidate).digest(),
    createHash("sha256").update(expected).digest(),
  );

let warnedAboutMissingSecret = false;

/**
 * Guard a moderator-only endpoint.
 *
 * The credential is a static shared secret in the `moderator-token` header.
 * Requiring a custom header is also what blocks cross-site form submissions: a
 * browser cannot set one without a CORS preflight, and this app configures no
 * CORS policy. Do not add permissive CORS without replacing this scheme.
 *
 * Failed attempts are rate limited by IP; successful ones are not, so routine
 * moderation is never throttled.
 */
export const requireModerator = (event: H3Event): void => {
  const secret = useRuntimeConfig(event).moderatorSecret as string;

  if (!secret) {
    if (!warnedAboutMissingSecret) {
      console.warn(
        "[moderation] NUXT_MODERATOR_SECRET is not set; every moderator request will be rejected.",
      );
      warnedAboutMissingSecret = true;
    }
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  const token = getHeader(event, MODERATOR_HEADER) ?? "";
  if (secretsMatch(token, secret)) return;

  const ip = getRateLimitIp(event);
  const status = peekRateLimit(ip, MODERATOR_POLICIES);
  if (!status.allowed) throwRateLimited(event, status);

  consumeRateLimit(ip, MODERATOR_POLICIES);
  throw createError({ statusCode: 403, statusMessage: "Forbidden" });
};
