import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/eslint",
    "@nuxt/ui",
    "@nuxt/image",
    "@nuxt/icon",
    "@nuxtjs/seo",
  ],
  css: ["~/assets/css/app.css"],
  runtimeConfig: {
    public: {
      NUXT_NUTRITIONIX_API_KEY: process.env.NUXT_NUTRITIONIX_API_KEY,
      NUXT_NUTRITIONIX_APP_ID: process.env.NUXT_NUTRITIONIX_APP_ID,
    },
  },
  app: {
    head: {
      title: "MaxHP",
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.png" }],
      htmlAttrs: {
        lang: "en",
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});