/**
 * Native-only helpers, safe to call from the web build.
 *
 * Capacitor injects a `Capacitor` global into the WebView before our JS runs, so
 * asking "am I in the app?" can be done structurally — no plugin import, which
 * would otherwise be pulled into the SSR bundle just to answer a browser
 * question. The plugins themselves are imported dynamically at the point of use,
 * keeping them in a client-only chunk.
 */

interface ICapacitorGlobal {
  isNativePlatform?: () => boolean;
}

const capacitorGlobal = (globalThis as { Capacitor?: ICapacitorGlobal } & typeof globalThis)
  .Capacitor;

/** True inside the Android/iOS shell, false in a browser. */
export const isNativeShell = (): boolean => capacitorGlobal?.isNativePlatform?.() === true;

/**
 * Open a link in the system browser (or the app that handles the scheme).
 *
 * In the APK a normal link would navigate the WebView itself, replacing the app
 * with a web page and leaving no way back — there are no browser chrome
 * controls. Handing the URL to the OS keeps the app mounted.
 */
export const openExternal = async (url: string): Promise<void> => {
  if (!isNativeShell()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
};
