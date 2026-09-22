export interface IDayLog {
  date: string;
  foods: Record<string, IFoodTemplate[]>;
  updatedAt: string;
  weightLog?: number;
}

const STORAGE_PREFIX = "maxhp-day-log:";
const ALL_KEY = `${STORAGE_PREFIX}all`;
const MIGRATED_FLAG = "maxhp-migrated";

// Non-date keys older builds left behind under our prefix — safe to drop
// once the legacy migration has run.
const LEGACY_FLAG_KEYS = new Set([`${STORAGE_PREFIX}format-v2`, `${STORAGE_PREFIX}migrated`]);

export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getTodayString(): string {
  return formatLocalDate(new Date());
}

function formatDateLabel(dateStr: string, todayStr?: string): string {
  const today = todayStr ?? getTodayString();
  if (dateStr === today) return "Today";

  const todayDate = new Date(today + "T12:00:00");
  todayDate.setDate(todayDate.getDate() - 1);
  const yStr = formatLocalDate(todayDate);
  if (dateStr === yStr) return "Yesterday";

  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Reactivity that must survive individual components (cookie refs, timers,
// listeners) is created in a detached effect scope instead of whatever
// component setup happens to run first — otherwise it dies when that
// component unmounts, silently breaking cookie persistence.
function inSessionScope<T>(factory: () => T): T {
  return effectScope(true).run(factory)!;
}

const mealCookieCache = new Map<string, Ref<IFoodTemplate[]>>();

function useMealCookie(meal: string): Ref<IFoodTemplate[]> {
  if (!import.meta.client) {
    // Never cache on the server: module state is shared across requests.
    return useCookie<IFoodTemplate[]>(`foods-${meal}`);
  }
  if (!mealCookieCache.has(meal)) {
    mealCookieCache.set(
      meal,
      inSessionScope(() => useCookie<IFoodTemplate[]>(`foods-${meal}`)),
    );
  }
  return mealCookieCache.get(meal)!;
}

let currentDateRef: Ref<string> | null = null;

// Single shared `current-date` cookie ref. Nuxt's useCookie does NOT share
// refs between calls — every call creates a separate ref that only syncs
// asynchronously via BroadcastChannel/CookieStore (and leaks a channel), so
// a date switch would be observed by watchers late. Server-side stays
// per-request: the module-level cache must never cross requests.
export function useCurrentDateCookie(): Ref<string> {
  if (!import.meta.client) {
    return useCookie<string>("current-date", { default: () => getTodayString() });
  }
  if (!currentDateRef) {
    currentDateRef = inSessionScope(() =>
      useCookie<string>("current-date", { default: () => getTodayString() }),
    );
  }
  return currentDateRef;
}

let allRef: ReturnType<typeof useLocalStorage<Record<string, IDayLog>>> | null = null;
let oldMigrated = false;

function getAllRef() {
  if (import.meta.client) {
    if (!allRef) {
      allRef = useLocalStorage<Record<string, IDayLog>>(ALL_KEY, {});
    }
    if (!oldMigrated) {
      oldMigrated = true;
      migrateOldIndividualKeys();
    }
    return allRef;
  }
  // SSR: localStorage doesn't exist, so this is just the default value —
  // hand out a fresh ref per call so no server state leaks across requests.
  return useLocalStorage<Record<string, IDayLog>>(ALL_KEY, {});
}

function logHasContent(log: IDayLog): boolean {
  if (log.weightLog != null) return true;
  return Object.values(log.foods).some((foods) => foods.some((f) => f.foodName));
}

function parseLegacyDayLog(key: string, date: string): IDayLog | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "null") as Partial<IDayLog> | null;
    if (
      !parsed ||
      typeof parsed.date !== "string" ||
      typeof parsed.foods !== "object" ||
      !parsed.foods
    ) {
      console.error("Skipping unrecognized legacy day log:", key);
      return null;
    }
    // The `date` field must match the key — charts match days on it.
    // `foods` is restated explicitly: a Partial spread would keep it optional.
    return {
      ...parsed,
      foods: parsed.foods,
      date,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch (e) {
    console.error("Failed to migrate day log entry:", e);
    return null;
  }
}

// Fold legacy per-date keys (`maxhp-day-log:YYYY-MM-DD`) into the single
// `maxhp-day-log:all` record. Runs once per session and is idempotent: it
// only fills days the current record doesn't meaningfully cover yet, then
// drops the legacy keys so they don't linger forever (the original
// migration never deleted them, and skipped them entirely whenever `all`
// already had data — permanently orphaning old history).
function migrateOldIndividualKeys() {
  if (!import.meta.client) return;

  const ref = allRef;
  if (!ref) return;

  const merged = { ...ref.value };
  const staleKeys: string[] = [];
  let changed = false;

  // Collect keys first and delete only after the loop: removing entries
  // while indexing with localStorage.key(i) shifts them and skips some.
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(STORAGE_PREFIX) || key === ALL_KEY) continue;

    const date = key.slice(STORAGE_PREFIX.length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      if (LEGACY_FLAG_KEYS.has(key)) staleKeys.push(key);
      continue;
    }

    const current = merged[date];
    if (current && logHasContent(current)) {
      // The current record has real data for this day — it has been
      // maintained since it was written, so the legacy entry is stale.
      staleKeys.push(key);
      continue;
    }

    const legacy = parseLegacyDayLog(key, date);
    if (!legacy) continue; // unrecognised/corrupt: leave it untouched

    // Current record is missing or an empty stub (older builds created
    // those for days with only a weight entry) — legacy wins.
    if (logHasContent(legacy)) {
      merged[date] = legacy;
      changed = true;
    }
    staleKeys.push(key);
  }

  if (changed) {
    ref.value = merged;
  }

  staleKeys.forEach((key) => localStorage.removeItem(key));
}

export function saveDayToStorage(date: string) {
  const dayData: Record<string, IFoodTemplate[]> = {};

  foodsList.forEach((meal) => {
    const val = useMealCookie(meal).value;
    dayData[meal] = val && val.some((f) => f.foodName) ? JSON.parse(JSON.stringify(val)) : [];
  });

  const existing = loadDayFromStorage(date);

  const log: IDayLog = {
    date,
    foods: dayData,
    weightLog: existing?.weightLog,
    updatedAt: new Date().toISOString(),
  };

  const all = getAllRef();
  all.value = { ...all.value, [date]: log };
}

export function loadDayFromStorage(date: string): IDayLog | null {
  return getAllRef().value[date] ?? null;
}

// Load a day's stored foods into the meal cookies. Stored foods always win.
// `clearWhenEmpty` decides what happens when the stored day has no foods for
// a meal (log missing or empty):
//  - true (switching dates): the cookies still hold the previous day's foods.
//    They were already saved to that day, so clear them — otherwise they
//    would leak into (and be re-saved under) the day being opened.
//  - false (initial page load): the cookies may be the only copy of last
//    session's unsaved input, so never discard them here.
export function restoreDayToCookies(date: string, clearWhenEmpty = true) {
  const dayLog = loadDayFromStorage(date);

  foodsList.forEach((meal) => {
    const cookie = useMealCookie(meal);
    const stored = dayLog?.foods?.[meal];
    if (stored?.some((f) => f.foodName)) {
      cookie.value = JSON.parse(JSON.stringify(stored));
    } else if (clearWhenEmpty) {
      cookie.value = foodArrayDefault();
    }
  });
}

export function getAllDayLogs(): IDayLog[] {
  return Object.values(getAllRef().value).sort((a, b) => b.date.localeCompare(a.date));
}

export function removeDayFromStorage(date: string) {
  const all = getAllRef();
  const { [date]: _, ...rest } = all.value;
  all.value = rest;
}

export function getAvailableDates(): string[] {
  return Object.keys(getAllRef().value).sort();
}

export function migrateCookieData() {
  const migrated = useLocalStorage<boolean>(MIGRATED_FLAG, false);
  if (migrated.value) return;

  const today = getTodayString();
  const existing = loadDayFromStorage(today);

  if (!existing) {
    // Same criterion saveDayToStorage uses when deciding what to persist:
    // any food with a name counts, even one with 0 calories.
    const hasData = foodsList.some((meal) => {
      return useMealCookie(meal).value?.some((f) => f.foodName);
    });

    if (hasData) {
      saveDayToStorage(today);
    }
  }

  migrated.value = true;
}

export function switchDate(date: string) {
  const currentDateCookie = useCurrentDateCookie();

  const oldDate = currentDateCookie.value;
  // Re-selecting the date that's already open must be a no-op: restoring
  // again would overwrite foods the user typed since the last save.
  if (oldDate === date) return;

  if (oldDate) {
    saveDayToStorage(oldDate);
  }

  currentDateCookie.value = date;
  restoreDayToCookies(date, true); // clear the previous day's foods
}

export function resetCurrentDay() {
  const date = useCurrentDateCookie().value;

  const all = getAllRef();
  const existing = all.value[date];
  if (existing?.weightLog != null) {
    // The modal only promises to reset foods — keep the day's weight entry.
    all.value = {
      ...all.value,
      [date]: { ...existing, foods: {}, updatedAt: new Date().toISOString() },
    };
  } else {
    removeDayFromStorage(date);
  }

  foodsList.forEach((meal) => {
    useMealCookie(meal).value = foodArrayDefault();
  });
}

export function saveWeight(date: string, weight: number | null) {
  const all = getAllRef();
  const existing = all.value[date];

  // Don't materialize an empty log just to store nothing, and skip no-op
  // writes — they'd only bump updatedAt and fire weight notifications.
  if (!existing && weight == null) return;
  if (existing && (existing.weightLog ?? null) === (weight ?? null)) return;

  const log: IDayLog = existing || {
    date,
    foods: {},
    updatedAt: new Date().toISOString(),
  };
  log.weightLog = weight ?? undefined;
  log.updatedAt = new Date().toISOString();
  all.value = { ...all.value, [date]: log };
  notifyWeightChange();
}

export function loadWeight(date: string): number | null {
  const dayLog = loadDayFromStorage(date);
  return dayLog?.weightLog ?? null;
}

interface IDayClock {
  todayString: ComputedRef<string>;
}

let dayClock: IDayClock | null = null;

// Shared reactive clock + midnight rollover, created once per browsing
// session (detached scope) so exactly one set of timers, listeners and
// watchers exists no matter how many components call useDayLogs() — with
// per-instance side effects the rollover used to fire once per consumer.
// The server gets a plain per-request date; rollover is a client concern.
function useDayClock(): IDayClock {
  if (!import.meta.client) {
    const today = getTodayString();
    return { todayString: computed(() => today) };
  }
  if (dayClock) return dayClock;

  dayClock = inSessionScope(() => {
    // Reactive clock via VueUse: cheap interval (30s) + immediate
    // catch-up on tab visibility/focus, so a missed midnight (sleep,
    // throttled background tab) still rolls over without a 24h setTimeout.
    const now = useNow({ interval: 30_000 });
    const todayString = computed(() => formatLocalDate(now.value));
    const currentDate = useCurrentDateCookie();

    // Normal rollover: only auto-advance if the user was on the old
    // "today". Viewing history is left alone.
    watch(todayString, (newToday, oldToday) => {
      if (newToday !== oldToday && currentDate.value === oldToday) {
        switchDate(newToday);
      }
    });

    // Catch-up for throttled intervals (background tab / sleep):
    // if the reactive clock is stale but the system date moved on,
    // advance immediately when the tab becomes visible/focused.
    const catchUpAfterSleep = () => {
      const freshToday = getTodayString();
      if (currentDate.value !== freshToday && currentDate.value === todayString.value) {
        switchDate(freshToday);
      }
    };
    useEventListener(document, "visibilitychange", () => {
      if (document.visibilityState === "visible") catchUpAfterSleep();
    });
    useEventListener(window, "focus", catchUpAfterSleep);

    return { todayString };
  });

  return dayClock;
}

export const useDayLogs = () => {
  const currentDate = useCurrentDateCookie();
  const { todayString } = useDayClock();

  const isToday = computed(() => currentDate.value === todayString.value);

  const dateLabel = computed(() => formatDateLabel(currentDate.value, todayString.value));

  function goNext() {
    const d = new Date(currentDate.value + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const next = formatLocalDate(d);
    if (next <= todayString.value) {
      switchDate(next);
    }
  }

  function goPrev() {
    const d = new Date(currentDate.value + "T12:00:00");
    d.setDate(d.getDate() - 1);
    switchDate(formatLocalDate(d));
  }

  function goToday() {
    switchDate(todayString.value);
  }

  function goToDate(date: string) {
    switchDate(date);
  }

  function resetDay() {
    resetCurrentDay();
  }

  return {
    currentDate,
    todayString,
    isToday,
    dateLabel,
    goNext,
    goPrev,
    goToday,
    goToDate,
    resetDay,
    saveCurrentDay: () => saveDayToStorage(currentDate.value),
  };
};
