// Single shared cookie refs per browsing session: Nuxt's useCookie does NOT
// share refs between calls (every call creates a separate ref that only
// syncs asynchronously), so a theme switch would be observed late by other
// consumers. Server-side stays per-request: the module-level cache must
// never cross requests, so the SSR branch hands out fresh refs.
let themeCookie: Ref<string> | null = null;
let accentCookie: Ref<string> | null = null;
let syncStarted = false;

function getThemeCookie(): Ref<string> {
  if (!import.meta.client) return useCookie<string>("theme", { default: () => DEFAULT_THEME });
  if (!themeCookie) {
    themeCookie = inSessionScope(() => {
      const cookie = useCookie<string>("theme", { default: () => DEFAULT_THEME });
      // Normalize once on first use — rewrites garbage/legacy values.
      cookie.value = sanitizeTheme(cookie.value);
      return cookie;
    });
  }
  return themeCookie;
}

function getAccentCookie(): Ref<string> {
  if (!import.meta.client) return useCookie<string>("accent", { default: () => DEFAULT_ACCENT });
  if (!accentCookie) {
    accentCookie = inSessionScope(() => {
      const cookie = useCookie<string>("accent", { default: () => DEFAULT_ACCENT });
      cookie.value = sanitizeAccent(cookie.value);
      return cookie;
    });
  }
  return accentCookie;
}

export const useTheme = () => {
  const theme = getThemeCookie();
  const accent = getAccentCookie();

  const setTheme = (id: ThemeId) => {
    theme.value = sanitizeTheme(id);
  };

  const setAccent = (hex: string) => {
    accent.value = sanitizeAccent(hex);
    // Picking a color implies the custom theme.
    theme.value = "custom";
  };

  if (import.meta.client) {
    const apply = () => {
      // Raw cookie values are untrusted (older builds, other tabs) —
      // normalize before they reach the DOM or the picker.
      const id = sanitizeTheme(theme.value);
      const color = sanitizeAccent(accent.value);
      document.documentElement.setAttribute("data-theme", id);
      document.documentElement.style.setProperty("--custom-accent", color);
    };
    apply();
    if (!syncStarted) {
      syncStarted = true;
      // Detached scope: the watcher must outlive the component that
      // happened to call useTheme() first.
      inSessionScope(() => watch([theme, accent], apply));
    }
  }

  return { theme, accent, setTheme, setAccent };
};
