import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, effectScope, ref, watch, type Ref } from "vue";
import { useEventListener, useNow } from "@vueuse/core";
import {
  formatLocalDate,
  getAllDayLogs,
  getAvailableDates,
  getTodayString,
  loadDayFromStorage,
  loadWeight,
  migrateCookieData,
  removeDayFromStorage,
  resetCurrentDay,
  restoreDayToCookies,
  saveDayToStorage,
  saveWeight,
  switchDate,
  useDayLogs,
} from "~/composables/day-logs";
import { foodArrayDefault } from "~/composables/food-state";
import { inSessionScope } from "~/composables/session-scope";
import { notifyWeightChange, onWeightChange } from "~/composables/use-weight-notifications";
import { useAggregatedNutrients } from "~/composables/aggregated-nutrients";
import { useBmr } from "~/composables/bmr-state";
import { foodsList } from "~/utils/meals";
import type { IDayLog } from "~/composables/day-logs";
import type { IFoodTemplate } from "~/utils/food-types";

// day-logs.ts (and its chain) consume Nuxt/VueUse APIs as auto-imported
// globals. Outside the Nuxt test environment those don't exist, so bind the
// real implementations explicitly here. `useCookie`/`useLocalStorage` are
// stubbed with in-memory Maps of shared refs: deterministic and synchronous,
// unlike real cookie refs which only sync asynchronously across separate
// useCookie calls. (day-logs.ts top-level only declares functions, so
// stubbing after the static imports above is safe — nothing runs at import.)
const cookieJar = new Map<string, Ref<unknown>>();
const storageJar = new Map<string, Ref<unknown>>();

vi.stubGlobal("ref", ref);
vi.stubGlobal("computed", computed);
vi.stubGlobal("watch", watch);
vi.stubGlobal("effectScope", effectScope);
vi.stubGlobal("inSessionScope", inSessionScope);
vi.stubGlobal("useNow", useNow);
vi.stubGlobal("useEventListener", useEventListener);
vi.stubGlobal("useCookie", (name: string, opts?: { default?: () => unknown }) => {
  if (!cookieJar.has(name)) {
    cookieJar.set(name, ref(opts?.default?.() ?? null));
  }
  return cookieJar.get(name);
});
vi.stubGlobal("useLocalStorage", (key: string, initial: unknown) => {
  if (!storageJar.has(key)) {
    storageJar.set(key, ref(initial));
  }
  return storageJar.get(key);
});
vi.stubGlobal("notifyWeightChange", notifyWeightChange);
vi.stubGlobal("onWeightChange", onWeightChange);
vi.stubGlobal("useAggregatedNutrients", useAggregatedNutrients);
vi.stubGlobal("useBmr", useBmr);
vi.stubGlobal("foodsList", foodsList);
vi.stubGlobal("foodArrayDefault", foodArrayDefault);

beforeEach(() => {
  cookieJar.clear();
  storageJar.clear();
});

function food(name: string, calories = 100): IFoodTemplate {
  return {
    foodName: name,
    foodId: "1",
    servingId: "s",
    grams: 100,
    calories,
    totalFat: 0,
    cholesterol: 0,
    sodium: 0,
    totalCarbohydrate: 0,
    sugars: 0,
    protein: 0,
  };
}

function dayLog(date: string, opts: Partial<IDayLog> = {}): IDayLog {
  return {
    date,
    foods: {},
    updatedAt: new Date(0).toISOString(),
    ...opts,
  };
}

function mealFoods(meal: string): IFoodTemplate[] {
  return (cookieJar.get(`foods-${meal}`)?.value ?? []) as IFoodTemplate[];
}

function seedCurrentDate(date: string) {
  cookieJar.set("current-date", ref(date));
}

function seedMeal(meal: string, foods: IFoodTemplate[]) {
  cookieJar.set(`foods-${meal}`, ref(foods));
}

function seedStorage(record: Record<string, IDayLog>) {
  storageJar.set("maxhp-day-log:all", ref(record));
}

describe("formatLocalDate / getTodayString", () => {
  it("formats a date as YYYY-MM-DD with zero padding", () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatLocalDate(new Date(2026, 11, 25))).toBe("2026-12-25");
  });

  it("returns today in local time", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(getTodayString()).toBe(expected);
  });
});

describe("saveDayToStorage / loadDayFromStorage", () => {
  it("persists only meals with named foods and deep-copies them", () => {
    seedMeal("Breakfast", [food("Oats", 150)]);
    seedMeal("Lunch", [{ ...food("", 0) }]); // unnamed draft — not persisted

    saveDayToStorage("2026-01-05");

    const loaded = loadDayFromStorage("2026-01-05");
    expect(loaded?.foods.Breakfast).toEqual([food("Oats", 150)]);
    expect(loaded?.foods.Lunch).toEqual([]);

    // Mutating the cookie afterwards must not affect the stored copy.
    (cookieJar.get("foods-Breakfast") as Ref<IFoodTemplate[]>).value = [];
    expect(loadDayFromStorage("2026-01-05")?.foods.Breakfast).toEqual([food("Oats", 150)]);
  });

  it("preserves an existing weight entry when saving foods", () => {
    seedStorage({ "2026-01-05": dayLog("2026-01-05", { weightLog: 70 }) });
    seedMeal("Breakfast", [food("Oats")]);

    saveDayToStorage("2026-01-05");

    expect(loadDayFromStorage("2026-01-05")?.weightLog).toBe(70);
  });

  it("returns null for an unknown date", () => {
    expect(loadDayFromStorage("2026-01-05")).toBeNull();
  });
});

describe("switchDate", () => {
  it("saves the old day's foods and restores the target day's", () => {
    seedCurrentDate("2026-01-05");
    seedMeal("Breakfast", [food("Oats")]);
    seedStorage({ "2026-01-06": dayLog("2026-01-06", { foods: { Breakfast: [food("Eggs")] } }) });

    switchDate("2026-01-06");

    // Old day was saved before leaving it.
    expect(loadDayFromStorage("2026-01-05")?.foods.Breakfast).toEqual([food("Oats")]);
    // Target day's stored foods replaced the cookies.
    expect(mealFoods("Breakfast")).toEqual([food("Eggs")]);
    expect((cookieJar.get("current-date") as Ref<string>).value).toBe("2026-01-06");
  });

  it("is a no-op when re-selecting the open date", () => {
    seedCurrentDate("2026-01-05");
    seedMeal("Breakfast", [food("UnsavedDraft")]);

    switchDate("2026-01-05");

    // The typed-but-unsaved draft is untouched, and nothing was persisted.
    expect(mealFoods("Breakfast")).toEqual([food("UnsavedDraft")]);
    expect(loadDayFromStorage("2026-01-05")).toBeNull();
  });

  it("clears the previous day's foods when the target day has none", () => {
    seedCurrentDate("2026-01-05");
    seedMeal("Breakfast", [food("Oats")]);

    switchDate("2026-01-06");

    expect(loadDayFromStorage("2026-01-05")?.foods.Breakfast).toEqual([food("Oats")]);
    expect(mealFoods("Breakfast")).toEqual(foodArrayDefault());
  });
});

describe("restoreDayToCookies", () => {
  it("lets stored foods win over cookie input", () => {
    seedStorage({ "2026-01-05": dayLog("2026-01-05", { foods: { Breakfast: [food("Stored")] } }) });
    seedMeal("Breakfast", [food("Typed")]);

    restoreDayToCookies("2026-01-05");

    expect(mealFoods("Breakfast")).toEqual([food("Stored")]);
  });

  it("preserves unsaved input on initial load when nothing is stored", () => {
    seedMeal("Breakfast", [food("LastSessionDraft")]);

    restoreDayToCookies("2026-01-05", false);

    expect(mealFoods("Breakfast")).toEqual([food("LastSessionDraft")]);
  });
});

describe("resetCurrentDay", () => {
  it("removes a day without a weight entry and clears cookies", () => {
    seedCurrentDate("2026-01-05");
    seedStorage({ "2026-01-05": dayLog("2026-01-05", { foods: { Breakfast: [food("Oats")] } }) });
    seedMeal("Breakfast", [food("Oats")]);

    resetCurrentDay();

    expect(loadDayFromStorage("2026-01-05")).toBeNull();
    expect(mealFoods("Breakfast")).toEqual(foodArrayDefault());
  });

  it("keeps the weight entry but clears foods", () => {
    seedCurrentDate("2026-01-05");
    seedStorage({
      "2026-01-05": dayLog("2026-01-05", {
        weightLog: 70,
        foods: { Breakfast: [food("Oats")] },
      }),
    });
    seedMeal("Breakfast", [food("Oats")]);

    resetCurrentDay();

    const kept = loadDayFromStorage("2026-01-05");
    expect(kept?.weightLog).toBe(70);
    expect(kept?.foods).toEqual({});
    expect(mealFoods("Breakfast")).toEqual(foodArrayDefault());
  });
});

describe("saveWeight / loadWeight", () => {
  it("creates a log and notifies watchers", () => {
    let notifications = 0;
    const unsub = onWeightChange(() => notifications++);

    saveWeight("2026-01-05", 70);

    expect(loadWeight("2026-01-05")).toBe(70);
    expect(notifications).toBe(1);
    unsub();
  });

  it("does not materialize a log just to store nothing", () => {
    let notifications = 0;
    const unsub = onWeightChange(() => notifications++);

    saveWeight("2026-01-05", null);

    expect(loadDayFromStorage("2026-01-05")).toBeNull();
    expect(notifications).toBe(0);
    unsub();
  });

  it("skips no-op writes without bumping updatedAt or notifying", () => {
    seedStorage({ "2026-01-05": dayLog("2026-01-05", { weightLog: 70 }) });
    let notifications = 0;
    const unsub = onWeightChange(() => notifications++);

    const before = loadDayFromStorage("2026-01-05")?.updatedAt;
    saveWeight("2026-01-05", 70);

    expect(loadDayFromStorage("2026-01-05")?.updatedAt).toBe(before);
    expect(notifications).toBe(0);
    unsub();
  });

  it("clearing a weight keeps the day's foods", () => {
    seedStorage({
      "2026-01-05": dayLog("2026-01-05", {
        weightLog: 70,
        foods: { Breakfast: [food("Oats")] },
      }),
    });

    saveWeight("2026-01-05", null);

    expect(loadWeight("2026-01-05")).toBeNull();
    expect(loadDayFromStorage("2026-01-05")?.foods.Breakfast).toEqual([food("Oats")]);
  });
});

describe("log listing helpers", () => {
  it("lists logs newest-first and dates oldest-first", () => {
    seedStorage({
      "2026-01-05": dayLog("2026-01-05"),
      "2026-01-03": dayLog("2026-01-03"),
      "2026-01-04": dayLog("2026-01-04"),
    });

    expect(getAllDayLogs().map((l) => l.date)).toEqual(["2026-01-05", "2026-01-04", "2026-01-03"]);
    expect(getAvailableDates()).toEqual(["2026-01-03", "2026-01-04", "2026-01-05"]);
  });

  it("removes a single day", () => {
    seedStorage({
      "2026-01-05": dayLog("2026-01-05"),
      "2026-01-04": dayLog("2026-01-04"),
    });

    removeDayFromStorage("2026-01-05");

    expect(getAvailableDates()).toEqual(["2026-01-04"]);
  });
});

describe("migrateCookieData", () => {
  it("saves unsaved cookie foods to today exactly once", () => {
    seedMeal("Breakfast", [food("Oats")]);

    migrateCookieData();

    const today = getTodayString();
    expect(loadDayFromStorage(today)?.foods.Breakfast).toEqual([food("Oats")]);

    // Second run is a no-op (flag set) — even if cookies change.
    seedMeal("Breakfast", [food("Changed")]);
    migrateCookieData();
    expect(loadDayFromStorage(today)?.foods.Breakfast).toEqual([food("Oats")]);
  });

  it("does nothing when today already has a log", () => {
    const today = getTodayString();
    seedStorage({ [today]: dayLog(today, { foods: { Breakfast: [food("Stored")] } }) });
    seedMeal("Breakfast", [food("Typed")]);

    migrateCookieData();

    expect(loadDayFromStorage(today)?.foods.Breakfast).toEqual([food("Stored")]);
  });

  it("does nothing when the cookies hold no data", () => {
    migrateCookieData();
    expect(loadDayFromStorage(getTodayString())).toBeNull();
  });
});

describe("useDayLogs navigation", () => {
  it("moves between days and clamps next at today", () => {
    seedCurrentDate("2026-01-05");
    const { currentDate, todayString, goNext, goPrev, goToday, goToDate, isToday } = useDayLogs();

    goPrev();
    expect(currentDate.value).toBe("2026-01-04");
    expect(isToday.value).toBe(false);

    goNext();
    expect(currentDate.value).toBe("2026-01-05");

    goToDate("2026-01-02");
    expect(currentDate.value).toBe("2026-01-02");

    goToday();
    expect(currentDate.value).toBe(todayString.value);
    expect(isToday.value).toBe(true);

    // Already on today — goNext must not advance into the future.
    goNext();
    expect(currentDate.value).toBe(todayString.value);
  });

  it("labels today, yesterday, and older dates", () => {
    seedCurrentDate("2026-01-05");
    const { currentDate, todayString, dateLabel } = useDayLogs();

    const today = new Date(todayString.value + "T12:00:00");
    today.setDate(today.getDate() - 1);
    const yesterday = formatLocalDate(today);

    currentDate.value = todayString.value;
    expect(dateLabel.value).toBe("Today");

    currentDate.value = yesterday;
    expect(dateLabel.value).toBe("Yesterday");

    currentDate.value = "2020-05-04"; // a Monday
    expect(dateLabel.value).toBe("Mon, May 4");
  });

  it("saveCurrentDay persists and resetDay delegates to resetCurrentDay", () => {
    seedCurrentDate("2026-01-05");
    seedMeal("Breakfast", [food("Oats")]);
    const { saveCurrentDay, resetDay } = useDayLogs();

    saveCurrentDay();
    expect(loadDayFromStorage("2026-01-05")?.foods.Breakfast).toEqual([food("Oats")]);

    resetDay();
    expect(loadDayFromStorage("2026-01-05")).toBeNull();
  });
});
