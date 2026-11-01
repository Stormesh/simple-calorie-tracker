/**
 * CORS for the native app.
 *
 * A Capacitor app is a WebView, and a WebView is a browser: its pages have an
 * origin (`capacitor://localhost` on iOS, `https://localhost` on Android), so
 * every call to the Pages deployment is cross-origin and the WebView enforces
 * CORS on it. The web app is same-origin and needs none of this.
 *
 * Only the endpoints the app actually calls are opened. The moderator routes are
 * deliberately excluded: they still require the `moderator-token` header, and
 * keeping them unreachable from any browser origin preserves the property that a
 * cross-site form post cannot invoke them. The app never calls them.
 *
 * Pure and header-agnostic so it can be unit-tested without h3, following the
 * same split as `community-edit.ts`.
 */

export interface ICorsInput {
  origin: string | null;
  path: string;
  method: string;
  allowedOrigins: readonly string[];
}

export interface ICorsDecision {
  /** Response headers to apply. */
  headers: Record<string, string>;
  /** Set to answer immediately (preflight); null to continue routing. */
  status: number | null;
}

/**
 * Default WebView origins. `server.androidScheme` in `capacitor.config.ts` is
 * "https", which is what makes Android report `https://localhost`; the bare
 * `http://localhost` entry covers older configs and browser dev.
 */
export const DEFAULT_ALLOWED_ORIGINS: readonly string[] = [
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
];

/**
 * Endpoints reachable from the app. Everything else under `/api` keeps the
 * same-origin-only behaviour it had before the mobile build existed.
 */
const PUBLIC_API_PATHS: readonly RegExp[] = [
  /^\/api\/nutrition(?:\/|$)/,
  /^\/api\/community\/(?:search|submit|flag)$/,
];

export const isPublicApiPath = (path: string): boolean =>
  PUBLIC_API_PATHS.some((pattern) => pattern.test(path));

/**
 * Comma-separated allowlist from `NUXT_CORS_ORIGINS`, falling back to the
 * WebView defaults. An empty value means "defaults", not "deny everything", so
 * an unconfigured deployment still serves the app.
 */
export const parseAllowedOrigins = (raw: string | null | undefined): readonly string[] => {
  const configured = (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
};

export const planCorsResponse = ({
  origin,
  path,
  method,
  allowedOrigins,
}: ICorsInput): ICorsDecision | null => {
  if (!isPublicApiPath(path)) return null;

  // Always vary on Origin for the public API, even when the request carries no
  // usable origin: a cache that stores one origin's response must not replay it
  // to another.
  const headers: Record<string, string> = { Vary: "Origin" };

  if (origin !== null && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";
    headers["Access-Control-Allow-Headers"] = "content-type";
    headers["Access-Control-Max-Age"] = "86400";
  }

  // Preflights are answered here, before the route runs, so they never touch the
  // rate limiter or the database. A disallowed origin still gets a 204 — just
  // without the allow headers, which is what makes the browser block the real
  // request.
  if (method === "OPTIONS") return { headers, status: 204 };

  return { headers, status: null };
};
