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
  components/          — auto-imported Vue SFCs
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
    rate-limit.ts      — swappable sliding-window limiter + caller IP resolution
    rate-limit-http.ts — 429 helper: `Retry-After` + `retryAt` payload
    auth.ts            — `requireModerator(event)` guard for moderator endpoints
    blocklist.ts       — leo-profanity check for submitted food names
    ip-hash.ts         — SHA-256 reporter identity for durable flag dedupe
    community-edit.ts  — pure, whitelisted field validation for the edit endpoint (`planCommunityEdit`)
```

### Moderation and abuse controls

- `requireModerator(event)` is the single guard for `approve`, `delete`, and `flagged`; add new moderator endpoints through it rather than re-reading the header. It compares the `moderator-token` header with `NUXT_MODERATOR_SECRET` via SHA-256 digests in `timingSafeEqual` (no length or content leak), and rate limits _failed_ attempts only, so routine moderation is never throttled.
- The required custom header is also what blocks cross-site form posts — a browser cannot set it without a CORS preflight, and no CORS is configured. Do not add permissive CORS without replacing this scheme.
- Every secret key is deliberately `""` in `nuxt.config.ts`: reading `process.env` there would inline the value into the deployed build output. Nitro overlays `NUXT_API_KEY`, `NUXT_API_SECRET`, `NUXT_API_CLIENT_SECRET` and `NUXT_MODERATOR_SECRET` from the runtime environment instead.
- Rate limiting is `peek` → work → `consume`, so only _accepted_ submissions spend quota and a database outage never costs a user a slot. Submission policy is two-tier (10/hour, 30/day). The default limiter is per-isolate memory, i.e. best-effort; `IRateLimiter` exists so a D1 or Durable Object backend can replace it without touching call sites.

### Flagging

- Reporters flag through `flag.post.ts`, which requires a **reason** (≤500 characters) — a bare click carries no signal for the moderator who has to act on it.
- Dedupe is durable. `community_food_flags` has primary key `(food_id, ip_hash)`, so one report per reporter per food is enforced in D1 instead of in per-isolate memory. A repeat report is **409** and adds no vote.
- Volume is bounded per reporter, and just as durably: `flag.post.ts` counts that reporter's rows in the ledger (**15/hour**, 30/day) before writing anything and rejects with **429** + `Retry-After`/`retryAt`. Reading the ledger rather than module memory is what makes this bound survive isolates and cold starts. Because one report per food caps _depth_, the quota is what caps _breadth_ — how many entries a single actor can touch.
- `ip_hash` is `SHA-256(ip)` from `server/utils/ip-hash.ts`. That is pseudonymisation, not anonymisation — an IPv4 address can be brute forced back out of the digest — and it exists only to keep raw reporter IPs out of the database. Do not reuse it as a general privacy control.
- `community_foods.flags` is the severity counter, incremented once per accepted report; the food is hidden at `FLAG_THRESHOLD` (**5** distinct reporters). Flagging only ever _sets_ `hidden`; clearing it is a moderator decision.
- The ledger is **never pruned or reset**. `approve` and `edit` reset `flags`/`hidden` but deliberately leave the ledger alone, so the reporters who already voted cannot vote again — this closes the "hide it, get approved, hide it again" loop that the old counter allowed. `delete` removes the rows through `ON DELETE CASCADE`.
- `flagged.get.ts` returns each reporter's reason with the queue, so triage needs no second request.

### Moderator edit

- `edit.post.ts` writes only the fields the caller sends, then resets `flags`/`hidden` in the same statement, so saving a correction is also the "this is now correct" action.
- Validation lives in `server/utils/community-edit.ts` (`planCommunityEdit`) — a pure, whitelisted field-to-column map that returns validation failures as data, unit-tested. It deliberately does not import `h3`, so the spec can load it; the route handler turns a failure into the HTTP error. Unknown keys are ignored rather than interpolated into the statement.
- Renaming recomputes `name_key` and returns **409** when another entry already owns the name. The unique index stays the real guard; the lookup only turns a constraint failure into a message that names the conflict.
- There is **no moderation UI**. `flagged`, `approve`, `edit` and `delete` are API-only and exercised through the Bruno collection; adding a screen is separate work.

### Duplicate handling

- `community_foods.name_key` holds `normalizeFoodName(food_name)` and backs a **unique index**, so one community entry exists per normalized name. The app is the only writer of that key, which is why `submit.post.ts` can rely on `ON CONFLICT(name_key) DO NOTHING` and treat `meta.changes === 0` as a duplicate (HTTP 409).
- `normalizeFoodName` lives in `shared/utils/food-name.ts` — auto-imported by both the app and Nitro — so the app and the backfill script cannot drift apart. It is **never** computed in SQL: SQLite's `lower()` is ASCII-only, which would key `CAFÉ` and `café` differently and let duplicates through.
- A 409 does **not** consume rate-limit quota, because nothing was stored.
- `search.get.ts` matches on `name_key` (case- and whitespace-insensitive) and escapes `%`/`_` via `escapeLikePattern`. Ordering is relevance-first (`exact → prefix → contains`), never `food_name ASC`, which let a `AAA` prefix control visibility.

### Data migrations

Order matters, and the steps are deliberately separate files:

1. `migrations/0003_add_name_key.sql` — adds the nullable column.
2. `scripts/backfill-name-key.ts` — dry-run by default; prints duplicate groups and proposed survivors, `--apply` writes them. Survivors are the earliest `created_at` (ties by id), with `flags`/`hidden` merged upward so moderation state is never dropped.
3. `migrations/0004_name_key_unique.sql` — creates the unique index, and aborts if any row still lacks a key.
4. `migrations/0005_community_food_flags.sql` — creates the durable flag ledger. Independent of the steps above; it only adds a table.
5. `migrations/0006_flag_reporter_index.sql` — index on `(ip_hash, created_at)` backing the per-reporter flag quota. Also independent; it only adds an index.
6. `migrations/0007_name_key_required.sql` — `BEFORE INSERT` / `BEFORE UPDATE OF name_key` triggers that abort on a `NULL` or empty key. Independent; it only adds triggers.

Step 3's guard is load-bearing: SQLite treats `NULL`s as distinct in a unique index, so without it a half-backfilled table would accept duplicates silently. Take a D1 export before applying any of this against production.

Step 6 closes the gap the guard leaves open: the guard protects the _migration_, not the _invariant_. After 0004 a row inserted without a key is still legal, never collides, and is invisible to search (which matches on `name_key`, not `food_name`). The triggers make that an error instead. Both app paths that write a name always compute the key, and the backfill only `UPDATE`s it to a real value, so they never fire in normal operation.

Run the backfill with `pnpm exec tsx scripts/backfill-name-key.ts [--remote] [--apply]`.

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

- **Vitest** (`vitest.config.ts`, single `happy-dom` project, `app/**`, `server/**`, `shared/**` and `scripts/**` `*.{test,spec}.ts`). `pnpm run test` runs once, `pnpm run test:watch` watches. Import `{ describe, it, expect }` from `vitest` explicitly (no globals). `silent: "passed-only"` keeps handled-error logging in passing tests from reading as warnings.
- `server/**`, `shared/**` and `scripts/**` specs must stay free of Nitro auto-imports, and import shared helpers by **relative path** (`../../shared/utils/food-name`), because vitest does not resolve Nuxt's `shared/utils` alias. That is why the limiter is a pure `createRateLimiter(now)` factory with an injectable clock, why the HTTP-shaped `throwRateLimited` lives in a separate module (`rate-limit-http.ts`) that imports `h3` explicitly, and why the backfill's decision logic is a pure `planNameKeyBackfill` export.
- **Pure-logic specs** need no setup: theme/accent sanitizers (`app/utils/themes.spec.ts`), the legacy day-log merge (`app/utils/day-log-migration.spec.ts`), and the custom-foods storage deserializer (`app/composables/custom-foods.spec.ts`, which binds the `getCustomFoodServings` auto-import onto `globalThis` in `beforeAll`/`afterAll`).
- **Composable specs** (`app/composables/day-logs.spec.ts`, `app/composables/weight-change.spec.ts`) test Nuxt-coupled logic without booting Nuxt: bind the real Vue/VueUse implementations and stub `useCookie`/`useLocalStorage` via `vi.stubGlobal` with in-memory `Map<string, Ref>` jars (deterministic and synchronous — real cookie refs only sync asynchronously across separate `useCookie` calls). Seed the jars in `beforeEach`, never import `@nuxt/test-utils/runtime` here. `day-logs.ts` top-level only declares functions, so stubbing after static imports is safe.
- Caveat: without the Nuxt runtime `import.meta.client` is falsy, so these specs exercise the server branches (no session-singleton caching, no midnight clock, no one-time-migration trigger). All user-facing branching is identical across branches; the client-only wiring is covered by the pure migration specs and review, not tests.
- Parked, do not retry without checking upstream: a full Nuxt-environment project via `@nuxt/test-utils` (`defineVitestProject`) cannot boot in this repo — its virtual app-entry module id loses the absolute project prefix under this pnpm layout, so Nuxt's own relative imports (`./diagnostics/core.js`, …) fail to resolve (`@nuxt/test-utils@4.3.3` + `nuxt@4.6.1`). `@nuxt/test-utils`, `@vue/test-utils`, and the `@nuxt/test-utils/module` entry in `nuxt.config.ts` are kept installed for a future retry; `.nuxtrc` (nuxi wizard state) is gitignored.
- Nuxt auto-imported values are bare globals at call time; any spec needing one must bind it explicitly (`vi.stubGlobal` or `globalThis`).

## Deployment

**Cloudflare Pages is wired to this repo and deploys on every push**: `master` to production, any other branch to a preview. GitHub Actions does not deploy — `.github/workflows/verify.yml` runs lint, typecheck, tests and build as a check only, so a red run does **not** stop production from moving. Treat a push as a deploy.

```bash
pnpm run build   # local smoke test; output is dist/, per wrangler.toml
```

- Nitro preset: `cloudflare-pages` with `nodeCompat: true`
- `wrangler.toml` sets the Pages project (`maxhp`) and `pages_build_output_dir = "dist"`
- Community features use D1 database `maxhp-community` (ID in `wrangler.toml`)
- Secrets live on the **Pages project**, not in the build: `NUXT_API_KEY`, `NUXT_API_SECRET`, `NUXT_MODERATOR_SECRET`, and `NUXT_API_CLIENT_SECRET` to switch FatSecret to OAuth2 (without it the app falls back to OAuth1). Set them with `npx wrangler pages secret put <NAME> --project-name maxhp`
- Local `.env` uses the same `NUXT_*` names

### Applying migrations

Schema is **never** applied by the push, so ordering is the operator's job: apply the migration first, then push the code that depends on it.

```bash
npx wrangler d1 migrations apply maxhp-community --remote
```

Or run the `Migrate` workflow (`workflow_dispatch`) if the API token is not available locally. It is deliberately not triggered by a push: a push already deploys, and one migration (`0003 → backfill → 0004`) needs a data step in the middle that a single `apply` cannot express. Applying `0003` and the backfill before the code is pushed is what keeps that step from shipping against an unkeyed table.

Because Pages deploys on push, a code release that _requires_ a new schema must still survive the window between the push and the migration. Prefer landing the schema first and the dependent code in a later release when the change is not backward compatible — the unique index and the `ON CONFLICT` that depends on it are exactly that case.

## Known gaps

Deliberate, documented debt — not oversights:

1. **Moderator credential is static.** A long-lived shared secret with no expiry, rotation, or identity, and no audit trail on `approve`/`edit`/`delete`. Upgrading means an HMAC-signed token with an expiry claim. Note `timingSafeEqual` + SHA-256 already removes the timing side channel and the length leak.
2. **No Turnstile.** Without a custom domain there is no WAF rule either, so `submit` relies on the application-level limiter alone.
3. **Rate limiting is per-isolate, for submissions and moderator attempts.** Those quotas count in module memory, so distributed abuse and cold starts defeat them. `IRateLimiter` exists so a D1 or Durable Object backend can replace the in-memory one without touching call sites. Flag dedupe _and_ the flag volume quota are already durable (see "Flagging"), because both are derived from the ledger rather than from a counter in memory.

Resolved:

- ~~FatSecret secrets inlined into the build~~ — `nuxt.config.ts` now leaves every secret key empty and Nitro overlays `NUXT_*` at runtime.
- ~~No unique constraint on `food_name`~~ and ~~search ranked by `food_name ASC`~~ — see "Duplicate handling" below.
- ~~Flagging was weak: per-isolate dedupe, a threshold of 3, an ignored reason, nothing bounding one reporter's volume, and no way to correct an entry~~ — see "Flagging" and "Moderator edit" above.
