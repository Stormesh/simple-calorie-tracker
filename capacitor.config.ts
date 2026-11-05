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
  plugins: {
    // Resize the whole WebView instead of just `body`, so the sticky header and
    // every layout height (dvh) stay correct while the keyboard is open.
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      // Matches `.bg-gaming-gradient`'s darkest stop, so the handover to the
      // first painted frame is not a flash of white.
      backgroundColor: "#080808",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      // Safety net: `app/plugins/native-shell.client.ts` hides the splash on
      // `app:mounted`, which is the normal path. This fires if that never runs.
      launchAutoHide: true,
      launchShowDuration: 3000,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#080808",
    },
  },
};

export default config;
