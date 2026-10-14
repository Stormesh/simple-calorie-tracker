# MaxHP (simple-calorie-tracker) — Agent Guide

## Quick start

```bash
pnpm install       # postinstall runs `nuxt prepare`
pnpm run dev       # dev server on localhost:3000
pnpm run build     # nuxt build (output: .output)
pnpm run generate  # static export (output: dist)
pnpm run preview   # preview production build
```

Before committing or deploying, run format + lint + typecheck + tests and fix any errors:

```bash
pnpm run format    # auto-format with Prettier
pnpm run lint      # check Prettier + ESLint
pnpm run typecheck # vue-tsc via `nuxt typecheck`
pnpm run test      # vitest run (unit tests)
```

`pnpm run test:watch` runs vitest in watch mode.

## Stack

- **Nuxt 4** (`^4.4.8`) — Nitro preset `cloudflare-pages`
- **Nuxt UI v4** (`@nuxt/ui ^4.9.0`) — primary color set to `gaming` in `app.config.ts`
- **Tailwind CSS v4** — `@tailwindcss/vite` plugin, custom theme colors (`gaming-*`, `cyber-*`, `hp-*`) in `app/assets/css/app.css`
- **TypeScript** — `strict: true` in `nuxt.config.ts`
- **Chart.js** (`^4.5.1`) via `vue-chartjs`
- **Cloudflare D1** — community features, bound as `DB` (see `wrangler.toml`)
- **FatSecret API** — food search/nutrition, supports OAuth1 and OAuth2

## Architecture

### App structure

```
app/
  app.vue              — UApp > NuxtLayout > NuxtPage
  app.config.ts        — Nuxt UI color config
  layouts/default.vue  — bg-gaming-gradient + MyHeader + slot
  pages/index.vue      — single-page app
  components/          — auto-imported (21 components)
  composables/         — auto-imported (day-logs.spec.ts + weight-change.spec.ts live here)
  utils/
    food-types.ts      — IFoodTemplate interface
    meals.ts           — foodsList = ["Breakfast", "Lunch", "Dinner", "Snacks"]
    themes.ts          — theme registry + sanitizers (+ themes.spec.ts)
    day-log-migration.ts — pure legacy-key merge logic (+ day-log-migration.spec.ts)
  assets/css/app.css   — Tailwind theme, glass/glow/hp-bar utilities
server/
  api/
    nutrition/search/[name].ts  — FatSecret food search
    nutrition/[id].ts           — FatSecret food detail
    community/                  — D1-backed community food CRUD
  utils/
    db.ts              — D1 database access (event.context.cloudflare.env.DB)
    fatsecret-*.ts     — OAuth helpers
    food-cache.ts      — in-memory cache (per-request)
    rate-limit.ts
    blocklist.ts
```

### Key composables

| Composable                                    | Purpose                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `useDayLogs()`                                | Day navigation, date switching, date label, shared midnight rollover clock                          |
| `useCurrentDateCookie()`                      | Session-wide shared `current-date` cookie ref (never call `useCookie` for it directly)              |
| `useBmr()`                                    | BMR form state (stored in `bmr` cookie)                                                             |
| `useAggregatedNutrients()`                    | Computed totals from meal cookies                                                                   |
| `useWeightChange()`                           | Computed deficit/surplus display                                                                    |
| `onWeightChange(fn)` / `notifyWeightChange()` | Event system for weight updates                                                                     |
| `useTheme()`                                  | Theme id + custom accent (cookie-backed); sets `data-theme` on `<html>` — see `app/utils/themes.ts` |

### Theming

- Presets (`crimson` default, `emerald`, `ocean`, `violet`, `gold`, `rose`, `mono`) each redefine `--color-gaming-*` in an **unlayered** `[data-theme="…"]` block in `app/assets/css/app.css` (unlayered beats Tailwind's `@layer theme`); `custom` derives the scale from `--custom-accent` via `color-mix`
- `gaming-*` utilities, glass/glow classes, and Nuxt UI `primary: "gaming"` all follow the active theme automatically
- **Semantic colors stay fixed across themes**: `hp-*`, danger reds (`hp-red`, over-target `red-*`), heart glow — don't theme them
- Cookies: `theme` (preset id) + `accent` (`#rrggbb`); an inline head script in `nuxt.config.ts` applies them before first paint (static export has no per-request SSR)

### State storage

- **Day logs** — `useLocalStorage<Record<string, IDayLog>>` under key `maxhp-day-log:all`
- **Meal foods** — per-meal cookies `foods-{Breakfast|Lunch|Dinner|Snacks}` (arrays of `IFoodTemplate`)
- **Current date** — `current-date` cookie
- **BMR form** — `bmr` cookie (object: `IBmrForm`)
- **Migration** — legacy per-date keys (`maxhp-day-log:YYYY-MM-DD`) are folded into the single `all` key and deleted (idempotent, once per session); the merge decision is pure logic in `~/utils/day-log-migration.ts` (unit-tested). The one-time cookie-data migration is flagged via `maxhp-migrated`

## Conventions

- **Auto-imports**: composables, components (`~/components/`), and utils (`~/utils/`) are auto-imported; explicit imports used for a few components via `import FoodDetails from "~/components/FoodDetails.vue"`
- **TypeScript**: always use explicit interfaces. All files are `.ts` or `.vue` with `<script setup lang="ts">`
- **Date format**: `YYYY-MM-DD` via `formatLocalDate(date)`
- **Chart.js datasets**: custom `IChartDataset` interface covering bar/line mix. When using per-bar coloring, pass a `string[]` to `backgroundColor`/`borderColor`

### Testing

- **Vitest** (`vitest.config.ts`, single `happy-dom` project, `app/**/*.{test,spec}.ts`). `pnpm run test` runs once, `pnpm run test:watch` watches. Import `{ describe, it, expect }` from `vitest` explicitly (no globals). `silent: "passed-only"` keeps handled-error logging in passing tests from reading as warnings.
- **Pure-logic specs** need no setup: theme/accent sanitizers (`app/utils/themes.spec.ts`), the legacy day-log merge (`app/utils/day-log-migration.spec.ts`), and the custom-foods storage deserializer (`app/composables/custom-foods.spec.ts`, which binds the `getCustomFoodServings` auto-import onto `globalThis` in `beforeAll`/`afterAll`).
- **Composable specs** (`app/composables/day-logs.spec.ts`, `app/composables/weight-change.spec.ts`) test Nuxt-coupled logic without booting Nuxt: bind the real Vue/VueUse implementations and stub `useCookie`/`useLocalStorage` via `vi.stubGlobal` with in-memory `Map<string, Ref>` jars (deterministic and synchronous — real cookie refs only sync asynchronously across separate `useCookie` calls). Seed the jars in `beforeEach`, never import `@nuxt/test-utils/runtime` here. `day-logs.ts` top-level only declares functions, so stubbing after static imports is safe.
- Caveat: without the Nuxt runtime `import.meta.client` is falsy, so these specs exercise the server branches (no session-singleton caching, no midnight clock, no one-time-migration trigger). All user-facing branching is identical across branches; the client-only wiring is covered by the pure migration specs and review, not tests.
- Parked, do not retry without checking upstream: a full Nuxt-environment project via `@nuxt/test-utils` (`defineVitestProject`) cannot boot in this repo — its virtual app-entry module id loses the absolute project prefix under this pnpm layout, so Nuxt's own relative imports (`./diagnostics/core.js`, …) fail to resolve (`@nuxt/test-utils@4.3.3` + `nuxt@4.6.1`). `@nuxt/test-utils`, `@vue/test-utils`, and the `@nuxt/test-utils/module` entry in `nuxt.config.ts` are kept installed for a future retry; `.nuxtrc` (nuxi wizard state) is gitignored.
- Nuxt auto-imported values are bare globals at call time; any spec needing one must bind it explicitly (`vi.stubGlobal` or `globalThis`).

## Deployment

```bash
pnpm run build          # produces .output for Cloudflare Pages
npx wrangler deploy    # deploy to Cloudflare (requires wrangler.toml + D1 binding)
```

- Nitro preset: `cloudflare-pages` with `nodeCompat: true`
- Requires `.env` with `FATSECRET_API_KEY`, `FATSECRET_API_SECRET`, `FATSECRET_API_CLIENT_SECRET` (OAuth2)
- Community features use D1 database `maxhp-community` (ID in `wrangler.toml`)
- `wrangler pages_build_output_dir = "dist"` — use `nuxt generate` for static export
