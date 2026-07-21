// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintPluginPrettier from "eslint-plugin-prettier";

export default withNuxt({
  plugins: {
    prettier: eslintPluginPrettier,
  },
  rules: {
    "prettier/prettier": "error",
    "vue/html-self-closing": [
      "error",
      {
        html: {
          void: "always",
          normal: "always",
          component: "always",
        },
        svg: "always",
        math: "always",
      },
    ],
  },
});
