import type { IFoodTemplate } from "./food-state";

export interface IDayLog {
  date: string;
  foods: Record<string, IFoodTemplate[]>;
  updatedAt: string;
  weightLog?: number;
}

const STORAGE_PREFIX = "maxhp-day-log:";
const ALL_KEY = `${STORAGE_PREFIX}all`;
const MIGRATED_FLAG = "maxhp-migrated";

const STORAGE_FORMAT_FLAG = `${STORAGE_PREFIX}format-v2`;

export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getTodayString(): string {
  return formatLocalDate(new Date());
}

function formatDateLabel(dateStr: string): string {
  const today = getTodayString();
  if (dateStr === today) return "Today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = formatLocalDate(yesterday);
  if (dateStr === yStr) return "Yesterday";

  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

let allRef: ReturnType<typeof useLocalStorage<Record<string, IDayLog>>> | null =
  null;
let oldMigrated = false;

function getAllRef() {
  if (!allRef) {
    allRef = useLocalStorage<Record<string, IDayLog>>(ALL_KEY, {});
  }
  if (!oldMigrated) {
    oldMigrated = true;
    migrateOldIndividualKeys();
  }
  return allRef;
}

function migrateOldIndividualKeys() {
  if (!import.meta.client) return;

  const ref = allRef;
  if (!ref) return;

  const formatFlag = useLocalStorage<boolean>(STORAGE_FORMAT_FLAG, false);
  if (formatFlag.value) return;

  const all = ref.value;
  if (Object.keys(all).length > 0) {
    formatFlag.value = true;
    return;
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    if (
      key === ALL_KEY ||
      key === STORAGE_FORMAT_FLAG ||
      key === `${STORAGE_PREFIX}migrated`
    )
      continue;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const date = key.slice(STORAGE_PREFIX.length);
        all[date] = JSON.parse(raw);
      }
    } catch {}
  }

  if (Object.keys(all).length > 0) {
    ref.value = { ...all };
  }

  formatFlag.value = true;
}

export function saveDayToStorage(date: string) {
  const dayData: Record<string, IFoodTemplate[]> = {};

  foodsList.forEach((meal) => {
    const cookie = useCookie<IFoodTemplate[]>(`foods-${meal}`);
    const val = cookie.value;
    dayData[meal] =
      val && val.some((f) => f.foodName) ? JSON.parse(JSON.stringify(val)) : [];
  });

  const existing = loadDayFromStorage(date);

  const log: IDayLog = {
    date,
    foods: dayData,
    weightLog: existing?.weightLog,
    updatedAt: new Date().toISOString(),
  };

  const all = getAllRef().value;
  getAllRef().value = { ...all, [date]: log };
}

export function loadDayFromStorage(date: string): IDayLog | null {
  return getAllRef().value[date] ?? null;
}

export function restoreDayToCookies(date: string) {
  const dayLog = loadDayFromStorage(date);

  foodsList.forEach((meal) => {
    const cookie = useCookie<IFoodTemplate[]>(`foods-${meal}`);
    if (dayLog?.foods?.[meal] && dayLog.foods[meal].length > 0) {
      cookie.value = dayLog.foods[meal];
    } else {
      cookie.value = foodArrayDefault();
    }
  });
}

export function getAllDayLogs(): IDayLog[] {
  return Object.values(getAllRef().value).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

export function removeDayFromStorage(date: string) {
  const all = getAllRef().value;
  const { [date]: _, ...rest } = all;
  getAllRef().value = rest;
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
    const hasData = foodsList.some((meal) => {
      const cookie = useCookie<IFoodTemplate[]>(`foods-${meal}`);
      return cookie.value?.some((f) => f.foodName && f.calories > 0);
    });

    if (hasData) {
      saveDayToStorage(today);
    }
  }

  migrated.value = true;
}

export function switchDate(date: string) {
  const currentDateCookie = useCookie<string>("current-date", {
    default: () => getTodayString(),
  });

  const oldDate = currentDateCookie.value;
  if (oldDate && oldDate !== date) {
    saveDayToStorage(oldDate);
  }

  currentDateCookie.value = date;
  restoreDayToCookies(date);
}

export function resetCurrentDay() {
  const currentDateCookie = useCookie<string>("current-date", {
    default: () => getTodayString(),
  });
  const date = currentDateCookie.value;

  removeDayFromStorage(date);
  foodsList.forEach((meal) => {
    const cookie = useCookie<IFoodTemplate[]>(`foods-${meal}`);
    cookie.value = foodArrayDefault();
  });
}

export function saveWeight(date: string, weight: number | null) {
  const all = getAllRef().value;
  const existing = all[date];
  const log: IDayLog = existing || {
    date,
    foods: {},
    updatedAt: new Date().toISOString(),
  };
  log.weightLog = weight ?? undefined;
  log.updatedAt = new Date().toISOString();
  getAllRef().value = { ...all, [date]: log };
  notifyWeightChange();
}

export function loadWeight(date: string): number | null {
  const dayLog = loadDayFromStorage(date);
  return dayLog?.weightLog ?? null;
}

let weightVersion = 0;
const weightWatchers = new Set<() => void>();

export function notifyWeightChange() {
  weightVersion++;
  weightWatchers.forEach((fn) => fn());
}

export function onWeightChange(fn: () => void) {
  weightWatchers.add(fn);
  return () => weightWatchers.delete(fn);
}

export const useDayLogs = () => {
  const currentDate = useCookie<string>("current-date", {
    default: () => getTodayString(),
  });

  const isToday = computed(() => currentDate.value === getTodayString());

  const dateLabel = computed(() => formatDateLabel(currentDate.value));

  const availableDates = computed(() => getAvailableDates());

  const currentWeight = ref<number | null>(loadWeight(currentDate.value));

  watch(currentDate, (newDate) => {
    currentWeight.value = loadWeight(newDate);
  });

  watch(currentWeight, (val) => {
    saveWeight(currentDate.value, val);
  });

  function goNext() {
    const d = new Date(currentDate.value + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const next = formatLocalDate(d);
    if (next <= getTodayString()) {
      switchDate(next);
    }
  }

  function goPrev() {
    const d = new Date(currentDate.value + "T12:00:00");
    d.setDate(d.getDate() - 1);
    switchDate(formatLocalDate(d));
  }

  function goToday() {
    switchDate(getTodayString());
  }

  function goToDate(date: string) {
    switchDate(date);
  }

  function resetDay() {
    resetCurrentDay();
  }

  return {
    currentDate,
    isToday,
    dateLabel,
    availableDates,
    currentWeight,
    goNext,
    goPrev,
    goToday,
    goToDate,
    resetDay,
    saveCurrentDay: () => saveDayToStorage(currentDate.value),
  };
};
