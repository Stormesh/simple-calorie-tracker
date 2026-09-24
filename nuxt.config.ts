import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/eslint", "@nuxt/ui", "@nuxt/image", "@nuxt/icon", "@vueuse/nuxt"],
  css: ["~/assets/css/app.css"],
  typescript: {
    strict: true,
  },
  runtimeConfig: {
    apiKey: process.env.FATSECRET_API_KEY,
    apiSecret: process.env.FATSECRET_API_SECRET,
    apiClientSecret: process.env.FATSECRET_API_CLIENT_SECRET,
    moderatorSecret: process.env.NUXT_MODERATOR_SECRET || "",
  },
  nitro: {
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
  },
});
