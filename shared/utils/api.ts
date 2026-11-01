/**
 * Base URL for API calls.
 *
 * On the web the app is served from the same origin as `/api`, so the base stays
 * empty and every URL stays relative — the Pages deployment is unchanged.
 *
 * In a Capacitor build the app is served from `capacitor://localhost` (iOS) or
 * `https://localhost` (Android), so a relative `/api/...` resolves inside the
 * WebView and 404s. `app/plugins/api-base.client.ts` sets the absolute
 * deployment URL from `runtimeConfig.public.apiBase` instead.
 *
 * Module state, not a composable: callers include plain helpers (`shared/utils/food.ts`)
 * invoked from event handlers, where Nuxt context is no longer available.
 */

let apiBase = "";

/** Set the base once at startup. Empty means "same origin". */
export const setApiBase = (base: string): void => {
  apiBase = base.trim().replace(/\/+$/, "");
};

export const getApiBase = (): string => apiBase;

/** Join the configured base with an `/api/...` path. */
export const apiUrl = (path: string): string => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${apiBase}${normalized}`;
};
