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
  ],
  css: ["~/assets/css/app.css"],
  runtimeConfig: {
    apiKey: process.env.FATSECRET_API_KEY,
    apiSecret: process.env.FATSECRET_API_SECRET,
  },
  app: {
    head: {
      title: "MaxHP - Level Up Your Health",
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.png" }],
      htmlAttrs: {
        lang: "en",
      },
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
        }
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
