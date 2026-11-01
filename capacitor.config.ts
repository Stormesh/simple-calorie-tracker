import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor shell for the native builds.
 *
 * `webDir` points at the SPA produced by `NUXT_MOBILE=1 nuxt generate`; the web
 * deployment is unaffected because Cloudflare Pages publishes `dist/` from
 * `pnpm build`. Because the mobile bundle is static, none of `server/` — and so
 * none of the runtime secrets — can end up in the binary.
 *
 * `androidScheme: "https"` makes the Android WebView origin `https://localhost`,
 * which is one of the origins `server/utils/cors.ts` allows. iOS keeps the
 * default `capacitor://localhost`.
 *
 * `appId` is permanent once an APK is installed: Android treats a different
 * application id as a different app, and the WebView's local storage (all of the
 * user's data) is keyed by the app identity.
 */
const config: CapacitorConfig = {
  appId: "app.maxhp.tracker",
  appName: "MaxHP",
  webDir: ".output/public",
  server: {
    androidScheme: "https",
  },
};

export default config;
