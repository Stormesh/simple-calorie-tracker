import type { IFoodTemplate } from "./food-state";

export interface IDayLog {
  date: string;
  foods: Record<string, IFoodTemplate[]>;
  updatedAt: string;
  weightLog?: number;
}

const STORAGE_PREFIX = "maxhp-day-log:";

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

export function getStorageKey(date: string): string {
  return `${STORAGE_PREFIX}${date}`;
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

  localStorage.setItem(getStorageKey(date), JSON.stringify(log));
}

export function loadDayFromStorage(date: string): IDayLog | null {
  try {
    const raw = localStorage.getItem(getStorageKey(date));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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
  const logs: IDayLog[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          logs.push(JSON.parse(raw));
        }
      } catch {}
    }
  }

  return logs.sort((a, b) => b.date.localeCompare(a.date));
}

export function removeDayFromStorage(date: string) {
  localStorage.removeItem(getStorageKey(date));
}

export function getAvailableDates(): string[] {
  const dates: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      dates.push(key.slice(STORAGE_PREFIX.length));
    }
  }
  return dates.sort();
}

const MIGRATED_FLAG = "maxhp-migrated";

export function migrateCookieData() {
  if (localStorage.getItem(MIGRATED_FLAG)) return;

  const today = getTodayString();
  const key = getStorageKey(today);

  if (!localStorage.getItem(key)) {
    const hasData = foodsList.some((meal) => {
      const cookie = useCookie<IFoodTemplate[]>(`foods-${meal}`);
      return cookie.value?.some((f) => f.foodName && f.calories > 0);
    });

    if (hasData) {
      saveDayToStorage(today);
    }
  }

  localStorage.setItem(MIGRATED_FLAG, "1");
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
  const key = getStorageKey(date);
  const existing = loadDayFromStorage(date);
  const log: IDayLog = existing || {
    date,
    foods: {},
    updatedAt: new Date().toISOString(),
  };
  log.weightLog = weight ?? undefined;
  log.updatedAt = new Date().toISOString();
  localStorage.setItem(key, JSON.stringify(log));
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
