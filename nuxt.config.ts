import tailwindcss from "@tailwindcss/vite";

// Mobile builds are a separate artifact: a client-only SPA that Capacitor
// packages into the APK. The web deployment keeps SSR, so this is a build flag
// rather than a fork of the config. Reading `process.env` here is safe because
// the value is not a secret.
const isMobile = process.env.NUXT_MOBILE === "1";

// Cloudflare Pages publishes `dist/`, including `_worker.js` — the API. A mobile
// build there would publish an SPA with no backend at the same origin, taking
// `/api/*` down for the web app and every installed APK. Fail loudly instead.
if (isMobile && process.env.CF_PAGES) {
  throw new Error("NUXT_MOBILE must not be set in the Cloudflare Pages build environment");
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: !isMobile,
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/eslint",
    "@nuxt/ui",
    "@nuxt/image",
    "@nuxt/icon",
    "@vueuse/nuxt",
    "@nuxt/test-utils/module",
  ],
  css: ["~/assets/css/app.css"],
  typescript: {
    strict: true,
  },
  runtimeConfig: {
    // Left empty on purpose: reading process.env here would inline the values
    // into the deployed build output. Nitro overlays NUXT_API_KEY,
    // NUXT_API_SECRET, NUXT_API_CLIENT_SECRET and NUXT_MODERATOR_SECRET from
    // the runtime environment instead.
    apiKey: "",
    apiSecret: "",
    apiClientSecret: "",
    moderatorSecret: "",
    // Comma-separated allowlist for the native app's WebView origins, read by
    // server/middleware/cors.ts. Empty means the defaults in
    // server/utils/cors.ts. Deliberately private: only the middleware needs it.
    corsOrigins: "",
    public: {
      // Absolute API origin for the native build; empty on the web so every
      // request stays same-origin and relative.
      //
      // The native bundle is static, so this is resolved at build time: Pages
      // always serves the project in wrangler.toml at `<name>.pages.dev`, which
      // is why that can be the default instead of an empty string that would
      // silently 404 inside the WebView. Override with
      // `NUXT_PUBLIC_API_BASE=https://staging.example pnpm run generate:mobile`.
      apiBase: isMobile ? "https://maxhp.pages.dev" : "",
    },
  },
  // Bundle icons at build time. The default ("auto") can resolve icons through
  // the Iconify API at runtime, which would leave the native app without icons
  // on a cold, offline launch.
  icon: {
    serverBundle: "local",
  },
  // The app is dark by design: `bg-gaming-gradient`, glass surfaces, the HP bar.
  // Nuxt UI's color mode defaults to `preference: "system"`, which in a light-mode
  // browser or Android system theme drops the `dark` class and flips every Nuxt UI
  // component (modals, inputs, toasts) to its light palette on top of that
  // gradient — washed-out surfaces and unreadable borders. Pin it to dark.
  colorMode: {
    preference: "dark",
    fallback: "dark",
  },
  // No image transforms. `@nuxt/image` defaults to the IPX provider, which builds
  // `/_ipx/...` URLs answered by Nitro at request time — the APK is a static SPA
  // with no server, so every `<NuxtImg>` (header logo, HP heart) 404s there while
  // plain `<img>` elements keep working. `none` emits the original path, which is
  // what both the web and the WebView can serve from `public/`.
  image: {
    provider: "none",
  },
  nitro: isMobile
    ? {
        // Static SPA: there is no server inside the binary, which is also why no
        // runtime secret can leak into it.
        preset: "static",
      }
    : {
        preset: "cloudflare-pages",
        cloudflare: {
          deployConfig: true,
          nodeCompat: true,
        },
      },
  app: {
    head: {
      title: "MaxHP - Level Up Your Health",
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.png" }],
      htmlAttrs: {
        lang: "en",
      },
      // No-flash theme bootstrap: static export has no per-request SSR
      // context, so data-theme must be applied before first paint.
      // Mirrors useCookie's encodeURIComponent encoding and the
      // sanitize* guards in ~/utils/themes.ts.
      script: [
        {
          key: "theme-init",
          tagPosition: "head",
          innerHTML: `(function(){try{var VALID=["crimson","emerald","ocean","violet","gold","rose","mono","custom"];var m=document.cookie.match(/(?:^|;\\s*)theme=([^;]*)/);var t=m?decodeURIComponent(m[1]):"crimson";if(VALID.indexOf(t)<0)t="crimson";document.documentElement.setAttribute("data-theme",t);var a=document.cookie.match(/(?:^|;\\s*)accent=([^;]*)/);var c=a?decodeURIComponent(a[1]):"#ef4444";if(!/^#[0-9a-fA-F]{6}$/.test(c))c="#ef4444";document.documentElement.style.setProperty("--custom-accent",c);}catch(e){}})();`,
        },
      ],
      meta: [
        {
          // viewport-fit=cover lets the layout pad against the notch and home
          // indicator with env(safe-area-inset-*) instead of sitting under them.
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
        {
          name: "description",
          content:
            "MaxHP is a simple but effective calorie tracker to level up your health. Track your food and see how many calories you have consumed.",
        },
        {
          name: "og:title",
          content: "MaxHP - Level Up Your Health",
        },
        {
          name: "og:description",
          content:
            "MaxHP is a simple but effective calorie tracker to level up your health. Track your food and see how many calories you have consumed.",
        },
        {
          name: "og:image",
          content: "/maxhp_banner.png",
        },
        {
          name: "twitter:card",
          content: "summary_large_image",
        },
        {
          name: "twitter:title",
          content: "MaxHP - Level Up Your Health",
        },
        {
          name: "twitter:description",
          content:
            "MaxHP is a simple but effective calorie tracker to level up your health. Track your food and see how many calories you have consumed.",
        },
        {
          name: "twitter:image",
          content: "/maxhp_banner.png",
        },
        {
          name: "twitter:image:alt",
          content: "MaxHP Banner",
        },
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["chart.js", "vue-chartjs"],
    },
  },
});
