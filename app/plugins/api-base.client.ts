import { setApiBase } from "#shared/utils/api";

/**
 * Resolve the API base once, before any request can be made.
 *
 * Client-only: on the server `apiBase` stays empty, so SSR and prerendering keep
 * using relative URLs. Runs in the Nuxt context, which is why `useRuntimeConfig`
 * is called here rather than inside the request helpers.
 */
export default defineNuxtPlugin(() => {
  const { public: publicConfig } = useRuntimeConfig();

  setApiBase(publicConfig.apiBase);
});
