/**
 * Options for the few values that live in cookies instead of localStorage.
 *
 * Nuxt's `useCookie` sets no expiry by default, which makes every cookie a
 * *session* cookie: held in memory, discarded when the process ends. That is
 * fatal for the two things we deliberately keep out of localStorage —
 *
 *  - the diet profile (`bmr`), which drives the calorie target and the HP bar,
 *  - `theme` / `accent`, which the inline head script in `nuxt.config.ts` reads
 *    before first paint (localStorage is not available there).
 *
 * In the Android WebView a session cookie dies with the app process, so the
 * profile reset on every close; in Chrome it dies at browser exit unless
 * session restore is enabled. A year is the practical "forever" for
 * preferences that are also covered by the backup file.
 *
 * `sameSite: "lax"` is stated explicitly rather than inherited so a future
 * cookie cannot silently become cross-site-strict and break the WebView.
 */
export const PERSISTENT_COOKIE = {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
} as const;
