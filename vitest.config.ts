import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
      "@": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  test: {
    // Pure unit tests in happy-dom. Composable specs (day-logs, weight-change)
    // run here too: they bind the real Vue/VueUse implementations and stub
    // useCookie/useLocalStorage via vi.stubGlobal — see AGENTS.md "Testing".
    // (A full Nuxt-environment project via @nuxt/test-utils was tried but its
    // app-entry stub cannot boot under this pnpm layout; parked, not removed.)
    environment: "happy-dom",
    include: [
      "app/**/*.{test,spec}.ts",
      "server/**/*.{test,spec}.ts",
      "shared/**/*.{test,spec}.ts",
      "scripts/**/*.{test,spec}.ts",
    ],
    // Several tests feed deliberately corrupt input, and the code under test
    // (correctly) console.errors when it rejects bad data. Silence console
    // output from passing tests so that handled-error logging doesn't read as
    // warnings — output still surfaces if a test fails.
    silent: "passed-only",
  },
});
