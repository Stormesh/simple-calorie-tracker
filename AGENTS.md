# MaxHP (simple-calorie-tracker) — Agent Guide

## Quick start

```bash
pnpm install       # postinstall runs `nuxt prepare`
pnpm run dev       # dev server on localhost:3000
pnpm run build     # nuxt build (output: .output)
pnpm run generate  # static export (output: dist)
pnpm run preview   # preview production build
```

Before committing or deploying, run format + lint and fix any errors:

```bash
pnpm run format    # auto-format with Prettier
pnpm run lint      # check Prettier + ESLint
```

No typecheck or test commands are configured.

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
  composables/         — auto-imported
  utils/
    food-types.ts      — IFoodTemplate interface
    meals.ts           — foodsList = ["Breakfast", "Lunch", "Dinner", "Snacks"]
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

| Composable                                    | Purpose                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `useDayLogs()`                                | Day navigation, date switching, weight save/load, midnight auto-switch |
| `useBmr()`                                    | BMR form state (stored in `bmr` cookie)                                |
| `useAggregatedNutrients()`                    | Computed totals from meal cookies                                      |
| `useWeightChange()`                           | Computed deficit/surplus display                                       |
| `onWeightChange(fn)` / `notifyWeightChange()` | Event system for weight updates                                        |

### State storage

- **Day logs** — `useLocalStorage<Record<string, IDayLog>>` under key `maxhp-day-log:all`
- **Meal foods** — per-meal cookies `foods-{Breakfast|Lunch|Dinner|Snacks}` (arrays of `IFoodTemplate`)
- **Current date** — `current-date` cookie
- **BMR form** — `bmr` cookie (object: `IBmrForm`)
- **Migration** — old per-date keys (`maxhp-day-log:YYYY-MM-DD`) migrated to single `all` key; flagged via `maxhp-migrated` and `maxhp-format-v2`

## Conventions

- **Auto-imports**: composables, components (`~/components/`), and utils (`~/utils/`) are auto-imported; explicit imports used for a few components via `import FoodDetails from "~/components/FoodDetails.vue"`
- **TypeScript**: always use explicit interfaces. All files are `.ts` or `.vue` with `<script setup lang="ts">`
- **Date format**: `YYYY-MM-DD` via `formatLocalDate(date)`
- **Chart.js datasets**: custom `IChartDataset` interface covering bar/line mix. When using per-bar coloring, pass a `string[]` to `backgroundColor`/`borderColor`

## Deployment

```bash
pnpm run build          # produces .output for Cloudflare Pages
npx wrangler deploy    # deploy to Cloudflare (requires wrangler.toml + D1 binding)
```

- Nitro preset: `cloudflare-pages` with `nodeCompat: true`
- Requires `.env` with `FATSECRET_API_KEY`, `FATSECRET_API_SECRET`, `FATSECRET_API_CLIENT_SECRET` (OAuth2)
- Community features use D1 database `maxhp-community` (ID in `wrangler.toml`)
- `wrangler pages_build_output_dir = "dist"` — use `nuxt generate` for static export
