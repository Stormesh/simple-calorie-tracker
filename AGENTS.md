# MaxHP (simple-calorie-tracker) — Agent Guide

## Quick start

```bash
pnpm install       # postinstall runs `nuxt prepare`
pnpm run dev       # dev server on localhost:3000
pnpm run build     # nuxt build (output: .output)
pnpm run generate  # static export (output: dist)
pnpm run preview   # preview production build
```

The Android app is a second artifact from the same source — see [Mobile (Capacitor)](#mobile-capacitor):

```bash
pnpm run cap:sync    # NUXT_MOBILE=1 nuxt generate, then copy into android/
pnpm run cap:android # open the project in Android Studio (SDK/AVD manager)
pnpm run apk:release v1.0.0  # signed release APK → GitHub release (needs a keystore)
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
- **Capacitor** (`^8.6.0`) — packages the SPA into the Android app; `@capacitor/cli` is a dev dependency
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
  plugins/
    api-base.client.ts — sets the absolute API base from runtimeConfig (native only)
    native-shell.client.ts — status bar, splash, keyboard probe, hardware back (native only)
  utils/
    food-types.ts      — IFoodTemplate interface
    meals.ts           — foodsList = ["Breakfast", "Lunch", "Dinner", "Snacks"]
    themes.ts          — theme registry + sanitizers (+ themes.spec.ts)
    day-log-migration.ts — pure legacy-key merge logic (+ day-log-migration.spec.ts)
    meal-migration.ts  — pure cookie→localStorage decision (+ meal-migration.spec.ts)
    backup.ts          — pure backup document build/parse/merge (+ backup.spec.ts)
    native.ts          — `isNativeShell()`, `openExternal()`
  assets/css/app.css   — Tailwind theme, glass/glow/hp-bar utilities, safe-area vars
shared/
  utils/
    food-name.ts       — `normalizeFoodName`, used by app and Nitro
    food.ts            — FatSecret fetch helpers (`searchFood`, `getFood`)
    api.ts             — `apiUrl()` / `setApiBase()` (+ api.spec.ts)
server/
  middleware/
    cors.ts            — h3 adapter for the native app's CORS decision
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
    cors.ts            — pure `planCorsResponse` + allowlist (+ cors.spec.ts)
capacitor.config.ts    — appId, webDir (.output/public), androidScheme
android/               — generated Capacitor Android project (committed)
```

### Moderation and abuse controls

- `requireModerator(event)` is the single guard for `approve`, `delete`, and `flagged`; add new moderator endpoints through it rather than re-reading the header. It compares the `moderator-token` header with `NUXT_MODERATOR_SECRET` via SHA-256 digests in `timingSafeEqual` (no length or content leak), and rate limits _failed_ attempts only, so routine moderation is never throttled.
- The required custom header is also what blocks cross-site form posts — a browser cannot set it without a CORS preflight. Do not add permissive CORS without replacing this scheme: the only CORS in the app is `server/middleware/cors.ts`, and it never covers a moderator route (see "Mobile (Capacitor)").
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
- **Meal foods** — per-meal localStorage `maxhp-meal:{Breakfast|Lunch|Dinner|Snacks}` (arrays of `IFoodTemplate`), read through `useMealFoods(meal)`. Never call `useCookie("foods-…")` again: a 4 KB cookie silently truncates a real meal, and the ref cache in `useMealFoods` is what makes one component's write visible to the others immediately
- **Custom foods** — `custom-foods` localStorage, read through `useCustomFoods()`
- **Current date** — `current-date` cookie
- **BMR form** — `bmr` cookie (object: `IBmrForm`)
- **Theme / accent / player name** — `theme`, `accent`, `player-name` cookies (small scalars, fine as cookies)
- **Cookie lifetime** — every `useCookie` call that stores a preference must spread `PERSISTENT_COOKIE` (`~/utils/cookies.ts`, one year + `sameSite: "lax"`). Nuxt's default is a **session** cookie, i.e. memory-only: in the Android WebView the whole diet profile vanished with the app process, and in Chrome it vanished at exit unless session restore was on. `theme`/`accent` have to stay cookies because the inline head script in `nuxt.config.ts` reads them before first paint; the rest are cookies only because they are tiny. The legacy `foods-*` cookie in `migrateMealFoods` is the one exception — it is deleted on the pass that reads it
- **Save-on-exit** — `app/pages/index.vue` flushes the open day on `beforeunload`, `pagehide` _and_ `visibilitychange → hidden`, deduped by a value snapshot. `beforeunload` alone is not enough: Android kills the WebView process without firing it, which left the day-log snapshot (charts, backup exports) behind the meals that live in localStorage
- **Backup** — `app/utils/backup.ts` (pure) + `useDataBackup()`; one JSON file with day logs, meals, custom foods, profile and theme. Delivery is tiered (share sheet → WebView clipboard → anchor download) because `<a download>` does nothing inside Capacitor. Import merges day logs by `updatedAt` instead of replacing, so an old file cannot delete days logged since
- **Migration** — legacy per-date keys (`maxhp-day-log:YYYY-MM-DD`) are folded into the single `all` key and deleted (idempotent, once per session); the merge decision is pure logic in `~/utils/day-log-migration.ts` (unit-tested). The one-time cookie-data migration is flagged via `maxhp-migrated`, the cookie→localStorage meal move via `maxhp-meals-migrated` (`planMealMigration`, unit-tested). Page load runs `migrateMealFoods()` **before** `migrateUnsavedMeals()`, otherwise an upgrading browser saves four blank rows over its own foods

## Conventions

- **Auto-imports**: composables, components (`~/components/`), and utils (`~/utils/`) are auto-imported; explicit imports used for a few components via `import FoodDetails from "~/components/FoodDetails.vue"`
- **TypeScript**: always use explicit interfaces. All files are `.ts` or `.vue` with `<script setup lang="ts">`
- **Date format**: `YYYY-MM-DD` via `formatLocalDate(date)`
- **Chart.js datasets**: custom `IChartDataset` interface covering bar/line mix. When using per-bar coloring, pass a `string[]` to `backgroundColor`/`borderColor`

### Testing

- **Vitest** (`vitest.config.ts`, single `happy-dom` project, `app/**`, `server/**`, `shared/**` and `scripts/**` `*.{test,spec}.ts`). `pnpm run test` runs once, `pnpm run test:watch` watches. Import `{ describe, it, expect }` from `vitest` explicitly (no globals). `silent: "passed-only"` keeps handled-error logging in passing tests from reading as warnings.
- `server/**`, `shared/**` and `scripts/**` specs must stay free of Nitro auto-imports, and import shared helpers by **relative path** (`../../shared/utils/food-name`), because vitest does not resolve Nuxt's `shared/utils` alias. That is why the limiter is a pure `createRateLimiter(now)` factory with an injectable clock, why the HTTP-shaped `throwRateLimited` lives in a separate module (`rate-limit-http.ts`) that imports `h3` explicitly, and why the backfill's decision logic is a pure `planNameKeyBackfill` export.
- **Pure-logic specs** need no setup: theme/accent sanitizers (`app/utils/themes.spec.ts`), the legacy day-log merge (`app/utils/day-log-migration.spec.ts`), the meal cookie→storage decision (`app/utils/meal-migration.spec.ts`), the backup document (`app/utils/backup.spec.ts`), the custom-foods storage deserializer (`app/composables/custom-foods.spec.ts`, which binds the `getCustomFoodServings` auto-import onto `globalThis` in `beforeAll`/`afterAll`), the API base joiner (`shared/utils/api.spec.ts`) and the CORS decision (`server/utils/cors.spec.ts`).
- **Composable specs** (`app/composables/day-logs.spec.ts`, `app/composables/weight-change.spec.ts`, `app/composables/meal-foods.spec.ts`) test Nuxt-coupled logic without booting Nuxt: bind the real Vue/VueUse implementations and stub `useCookie`/`useLocalStorage` via `vi.stubGlobal` with in-memory `Map<string, Ref>` jars (deterministic and synchronous — real cookie refs only sync asynchronously across separate `useCookie` calls). The `useLocalStorage` stub must honour a **getter** default (`typeof initial === "function" ? initial() : initial`), because meals pass `() => foodArrayDefault()` so every reader gets a fresh array. Seed the jars in `beforeEach`, never import `@nuxt/test-utils/runtime` here. `day-logs.ts` top-level only declares functions, so stubbing after static imports is safe.
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

## Mobile (Capacitor)

One repo, two artifacts: `pnpm build` produces the Pages deployment (`dist/`, SSR + API) and `pnpm run cap:sync` produces a client-only SPA (`.output/public`) that Capacitor copies into `android/`.

- Mobile is a **build flag, not a config fork**: `NUXT_MOBILE=1` sets `ssr: false` and Nitro preset `static`. The web build is untouched.
- `nuxt.config.ts` throws when `NUXT_MOBILE` is set in a `CF_PAGES` environment. Pages publishes whatever `pnpm build` leaves in `dist/`; an SPA there has no `_worker.js`, which would take `/api/*` down for the web app and every installed APK. `.github/workflows/verify.yml` asserts `dist/_worker.js/index.js` exists for the same reason.
- The SPA contains no `server/`, so no runtime secret can reach the binary.
- **Absolute API base.** In the WebView the app is served from `https://localhost` (Android, because `androidScheme: "https"`) or `capacitor://localhost` (iOS). A relative `/api/...` would resolve inside the WebView and 404, so `app/plugins/api-base.client.ts` calls `setApiBase(runtimeConfig.public.apiBase)` and every request goes through `apiUrl()` (`shared/utils/api.ts`). On the web the base is `""`, so URLs stay relative. Set the deployment URL for a device build with `NUXT_PUBLIC_API_BASE=https://maxhp.pages.dev`.
- **CORS is scoped, not opened.** `server/utils/cors.ts` (`planCorsResponse`, unit-tested) allows the WebView origins and the web origin, and only for `/api/nutrition/*` and `/api/community/{search,submit,flag}`. The moderator routes are excluded, which preserves the property that a cross-site form post cannot invoke them. `Vary: Origin` is always set on the public API, and a disallowed origin still gets a 204 preflight — just without the allow headers.
- Override the allowlist with `NUXT_CORS_ORIGINS` (comma-separated); empty means the defaults in `server/utils/cors.ts`.

Building locally needs a JDK Gradle accepts (21) and a known SDK:

```bash
cd android
./gradlew assembleDebug   # APK at app/build/outputs/apk/debug/app-debug.apk
```

- `~/.gradle/gradle.properties` pins `org.gradle.java.home` to JDK 21; the Capacitor 8 template's Gradle 8.14.3 rejects Java 25+ (`Unsupported class file major version 69/71`).
- `android/local.properties` (`sdk.dir=...`, gitignored) or `ANDROID_HOME` tells Gradle where the SDK is. A fresh clone has neither.
- `android/app/src/main/assets/public` is generated by `cap sync` and gitignored — the build copies whatever the last `generate:mobile` produced, so re-sync after any client change.

### Runtime shell

`app/plugins/native-shell.client.ts` and `app/utils/native.ts` hold every piece of native behaviour; all of it is inert on the web (`.client.ts` plus an `isNativeShell()` guard, which reads Capacitor's injected global structurally so `@capacitor/core` never enters the SSR bundle).

- **Hardware back** is decided by the DOM, not a registry of modals: `role="dialog"` present → dispatch `Escape` (every `UModal` and the settings panel already close on it) → else `history.back()` when `canGoBack` → else `App.exitApp()`. Nuxt UI keeps an overlay _instance_ alive after closing, so a component registry would leave stale entries and swallow the back button.
- **External links** go through `openExternal()`: `Browser.open` in the shell, `window.open` on the web. A plain link would navigate the WebView, and there is no address bar to get back with.
- **Safe areas** (`app/assets/css/app.css`): `html` uses `viewport-fit=cover`, the header carries `safe-area-top` and `min-h-16`, and `--app-header-h` (`4rem + env(safe-area-inset-top)`) positions the settings panel and its backdrop. Android 15+ enforces edge-to-edge, so `StatusBar.setBackgroundColor` is a no-op and CSS is the only mechanism — `StatusBar.setStyle` is still called for icon colour.
- **System bar icons** invert the intuition, because Capacitor's `Style` names the _background_, not the icons: `Style.Dark` is "light text for dark backgrounds" (= white clock/battery, what we want) and `Style.Light` paints them dark on `#080808`, i.e. invisible. Android implements it as `setAppearanceLightStatusBars(style !== "DARK")`. It is set twice on purpose — `capacitor.config.ts` `style: "DARK"` covers the window before plugin init, and `native-shell.client.ts` reapplies it. The StatusBar plugin owns the status bar only; the navigation pill's appearance is `MainActivity.java`'s `setAppearanceLightNavigationBars(false)`, which Capacitor has no config for.
- **Rendering is dark-only, and the artifact has no server.** `colorMode` is pinned to `preference: "dark"` — the default `"system"` dropped the `dark` class on a light-mode device and flipped Nuxt UI modals/inputs/toasts to a light palette on top of the dark gradient — and `html { color-scheme: dark }` makes browser-native chrome (scrollbars, autofill, pickers) match. `image.provider` is `"none"`: the IPX default emits `/_ipx/...` URLs answered by Nitro at request time, so every `<NuxtImg>` 404s in the serverless APK while plain `<img>` elements keep working. `none` emits the original `public/` path, so web and WebView render identically.
- **Keyboard** is `resize: "native"` in `capacitor.config.ts`, so the WebView (header included) resizes rather than the keyboard covering the focused input.
- **Splash** hides on `app:mounted`; `launchAutoHide` is the safety net. Colour matches `.bg-gaming-gradient`'s darkest stop so there is no white flash.

### Signing and release

The keystore is machine-local and **never committed**: `android/keystore.properties` and `*.jks` are gitignored, and `android/app/build.gradle` only enables `signingConfigs.release` when that file exists, so a fresh clone still builds `assembleDebug`.

- Losing the keystore makes every future build a _different app_ to Android: it cannot be installed over the old one, and updating means uninstalling first, which wipes the user's localStorage.
- `versionCode` must increase on every release; `versionName` is the human label. Both live in `android/app/build.gradle`.
- `pnpm run apk:release v1.0.0` (`scripts/release-apk.sh`) regenerates the SPA, builds the signed APK, and attaches `MaxHP-<version>.apk` to a GitHub release with `gh`. Release notes come from `--notes "<text>"`, `--notes-file <path>` or `RELEASE_NOTES`, and are kept in `release-notes/<tag>.md`; the sideload instructions are appended, and re-running a tag replaces the asset and refreshes the notes. Distribution is sideload-only — no Play Store, no CI workflow, no signing secret in GitHub.

### Icon and splash

`scripts/android-assets.sh` (`pnpm run apk:assets`) regenerates every launcher icon and splash bitmap from `public/favicon.png` — adaptive foreground (heart inside the 66dp-safe zone of a 108dp canvas), legacy square + round, and 11 splash sizes on `#080808`. Re-run it after changing the artwork; nothing else in `android/app/src/main/res` should be edited by hand. `#080808` appears in three places that must agree: the script, `values/ic_launcher_background.xml` and `capacitor.config.ts`.

## Known gaps

Deliberate, documented debt — not oversights:

1. **Moderator credential is static.** A long-lived shared secret with no expiry, rotation, or identity, and no audit trail on `approve`/`edit`/`delete`. Upgrading means an HMAC-signed token with an expiry claim. Note `timingSafeEqual` + SHA-256 already removes the timing side channel and the length leak.
2. **No Turnstile.** Without a custom domain there is no WAF rule either, so `submit` relies on the application-level limiter alone.
3. **Rate limiting is per-isolate, for submissions and moderator attempts.** Those quotas count in module memory, so distributed abuse and cold starts defeat them. `IRateLimiter` exists so a D1 or Durable Object backend can replace the in-memory one without touching call sites. Flag dedupe _and_ the flag volume quota are already durable (see "Flagging"), because both are derived from the ledger rather than from a counter in memory.
4. **The APK is sideload-only.** No Play Store means no automatic updates: users re-download a release by hand, and Android shows the "install unknown apps" prompt the first time. `versionCode` must increase per release or the install silently fails, and data survives only because an _update_ (not a reinstall) keeps app storage.
5. **Mobile clients share one quota bucket per IP.** Carrier CGNAT puts many users behind one address, so the 10/hour submit limit and the 15/hour flag limit apply to strangers collectively. Combined with gap 3 (per-isolate counters), the limits are a speed bump, not a boundary.
6. **No iOS build.** iPhone users are pointed at the PWA (Safari → _Add to Home Screen_), which has no share-sheet backup, no hardware-back handling and no offline cache beyond what the service worker gives them.
7. **FatSecret data is persisted on the device.** Their terms restrict storing and redistributing nutrition values beyond the id-and-attribution model; day logs, custom foods, the community database and now the backup file all keep numbers fetched from their API. The "powered by" mark is shown, but the storage question is unresolved and should be checked before wider distribution.

Resolved:

- ~~FatSecret secrets inlined into the build~~ — `nuxt.config.ts` now leaves every secret key empty and Nitro overlays `NUXT_*` at runtime.
- ~~No unique constraint on `food_name`~~ and ~~search ranked by `food_name ASC`~~ — see "Duplicate handling" below.
- ~~Flagging was weak: per-isolate dedupe, a threshold of 3, an ignored reason, nothing bounding one reporter's volume, and no way to correct an entry~~ — see "Flagging" and "Moderator edit" above.
