import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard } from "@capacitor/keyboard";
import { isNativeShell } from "~/utils/native";

/**
 * The native shell: status bar, splash screen, keyboard and the hardware back
 * button. Everything here is a no-op on the web (the plugin is `.client.ts`, and
 * each call is behind `isNativeShell`), so the web build keeps behaving exactly
 * as it did.
 *
 * The keyboard and splash behaviour is configured in `capacitor.config.ts`; this
 * only does the parts that need code.
 */

/**
 * Does anything own the screen right now?
 *
 * Deliberately DOM-based rather than a registry of modal components. Nuxt UI
 * keeps an overlay *instance* alive after closing (the portal is removed from
 * the DOM but the component is not unmounted), so a mounted-component registry
 * would leave stale entries and swallow the back button. `role="dialog"` in the
 * DOM means something is actually visible: a `UModal`, or the settings panel.
 */
const hasOpenOverlay = (): boolean =>
  document.querySelector('[role="dialog"]:not([aria-hidden="true"])') !== null;

/**
 * Close whatever is on top instead of leaving the app.
 *
 * Escape is the existing close gesture: Nuxt UI's dialogs handle it, and
 * `SettingsPanel` has its own document-level listener. Reusing it means the back
 * button needs no knowledge of which component is open.
 */
const closeTopOverlay = (): boolean => {
  if (!hasOpenOverlay()) return false;

  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );

  return true;
};

export default defineNuxtPlugin((nuxtApp) => {
  if (!isNativeShell()) return;

  // Light icons on the app's dark background. Note the inversion: Capacitor
  // names `Style` after the *background*, so `Style.Dark` means "light text for
  // dark backgrounds" and `Style.Light` would paint the clock and battery dark
  // — invisible on our #080808. Android implements it as
  // `setAppearanceLightStatusBars(style !== "DARK")`.
  //
  // Android 15+ draws the status bar itself (edge-to-edge is enforced), so this
  // is the appearance call only — `setBackgroundColor` is a no-op there and is
  // deliberately not called.
  void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

  // Hide the splash once the app has actually painted. The config's
  // `launchAutoHide` is the safety net if this never runs.
  nuxtApp.hook("app:mounted", () => {
    void SplashScreen.hide().catch(() => {});
  });

  // Log the resize mode so a keyboard that covers an input is diagnosable
  // instead of mysterious; the mode itself comes from capacitor.config.ts.
  nuxtApp.hook("app:mounted", () => {
    void Keyboard.getResizeMode()
      .then(({ mode }) => {
        if (import.meta.dev) console.info("[native] keyboard resize mode:", mode);
      })
      .catch(() => {});
  });

  void App.addListener("backButton", ({ canGoBack }) => {
    if (closeTopOverlay()) return;

    // No overlay open: let the WebView go back if it has history, otherwise
    // leave. Without the canGoBack branch a back press inside a scrollable page
    // would exit the app and lose the user's place.
    if (canGoBack) {
      window.history.back();
      return;
    }

    void App.exitApp();
  });

  // Android pauses the WebView when the app is backgrounded, which fires
  // `visibilitychange` and lets `useDayClock` catch up on a midnight rollover.
  // No extra listener is needed for that — this is the note that says so.
  if (import.meta.dev) {
    console.info("[native] shell ready on", Capacitor.getPlatform());
  }
});
