import { describe, expect, it } from "vitest";
import { BACKUP_VERSION, buildBackup, mergeDayLogs, parseBackup, summarizeBackup } from "./backup";
import type { IBackupInput } from "./backup";
import type { IDayLog } from "~/composables/day-logs";
import type { IBmrForm } from "~/composables/bmr-state";
import type { IFoodTemplate } from "./food-types";

const bmr: IBmrForm = {
  bmr: 2200,
  weight: 72,
  height: 180,
  age: 30,
  gender: "male",
  unitSystem: "metric",
  activity: 1.55,
  target: -550,
};

const food = (name: string, calories = 100): IFoodTemplate => ({
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
});

const dayLog = (date: string, updatedAt = "2026-01-05T10:00:00.000Z"): IDayLog => ({
  date,
  foods: { Breakfast: [food("Oats")] },
  updatedAt,
});

const input = (): IBackupInput => ({
  dayLogs: { "2026-01-05": dayLog("2026-01-05") },
  meals: { Breakfast: [food("Oats")], Lunch: [food("")] },
  customFoods: [],
  profile: { bmr, playerName: "Storm" },
  theme: { theme: "emerald", accent: "#ff0000" },
  exportedAt: "2026-02-01T00:00:00.000Z",
});

/** Round-trip helper: build a document, serialize it, parse it back. */
const roundTrip = (overrides: Partial<IBackupInput> = {}) =>
  parseBackup(JSON.stringify(buildBackup({ ...input(), ...overrides })));

describe("buildBackup", () => {
  it("stamps the app marker, version and export time", () => {
    const doc = buildBackup(input());

    expect(doc.app).toBe("maxhp");
    expect(doc.version).toBe(BACKUP_VERSION);
    expect(doc.exportedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("defaults the timestamp to now when the caller omits it", () => {
    const doc = buildBackup({ ...input(), exportedAt: undefined });

    expect(Number.isNaN(Date.parse(doc.exportedAt))).toBe(false);
  });
});

describe("parseBackup", () => {
  it("round-trips every section", () => {
    const result = roundTrip();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.keys(result.sections.dayLogs)).toEqual(["2026-01-05"]);
    expect(result.sections.meals.Breakfast).toEqual([food("Oats")]);
    expect(result.sections.profile.playerName).toBe("Storm");
    expect(result.sections.profile.bmr).toEqual(bmr);
    expect(result.sections.theme.theme).toBe("emerald");
  });

  it("rejects a file that is not JSON", () => {
    expect(parseBackup("not json {")).toEqual({
      ok: false,
      error: "That file is not valid JSON.",
    });
  });

  it("rejects JSON from another app", () => {
    const result = parseBackup(JSON.stringify({ app: "other", version: 1 }));

    expect(result).toEqual({ ok: false, error: "That file is not a MaxHP backup." });
  });

  it("rejects a plain array, which JSON.parse happily returns", () => {
    expect(parseBackup("[]").ok).toBe(false);
  });

  it("refuses a backup from a newer version instead of silently dropping fields", () => {
    const result = parseBackup(
      JSON.stringify({ app: "maxhp", version: BACKUP_VERSION + 1, dayLogs: {} }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("newer version");
  });

  it("accepts a document with no optional sections", () => {
    const result = parseBackup(JSON.stringify({ app: "maxhp", version: 1 }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sections).toEqual({
      dayLogs: {},
      meals: {},
      customFoods: [],
      profile: {},
      theme: {},
    });
  });

  it("drops malformed days, foods and custom foods instead of failing the import", () => {
    const result = parseBackup(
      JSON.stringify({
        app: "maxhp",
        version: 1,
        dayLogs: {
          "2026-01-05": { date: "2026-01-05", foods: { Breakfast: [food("Oats"), { nope: 1 }] } },
          "2026-01-06": { date: "2026-01-06" }, // no foods object
          "2026-01-07": { date: "2026-09-09", foods: {} }, // date does not match its key
          "2026-01-08": "junk",
        },
        meals: { Breakfast: [food("Oats"), "junk"], Dinner: "junk" },
        customFoods: [{ foodName: "Good", calories: 50 }, { foodName: "NoCalories" }],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.keys(result.sections.dayLogs)).toEqual(["2026-01-05"]);
    expect(result.sections.dayLogs["2026-01-05"]?.foods.Breakfast).toEqual([food("Oats")]);
    expect(result.sections.meals).toEqual({ Breakfast: [food("Oats")] });
    expect(result.sections.customFoods).toHaveLength(1);
  });

  it("gives a day without updatedAt the oldest possible timestamp", () => {
    const result = parseBackup(
      JSON.stringify({
        app: "maxhp",
        version: 1,
        dayLogs: { "2026-01-05": { date: "2026-01-05", foods: {} } },
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sections.dayLogs["2026-01-05"]?.updatedAt).toBe(new Date(0).toISOString());
  });
});

describe("mergeDayLogs", () => {
  it("keeps days that only exist locally", () => {
    const merged = mergeDayLogs({ "2026-03-01": dayLog("2026-03-01") }, {});

    expect(Object.keys(merged)).toEqual(["2026-03-01"]);
  });

  it("adds days that only exist in the backup", () => {
    const merged = mergeDayLogs({}, { "2026-01-05": dayLog("2026-01-05") });

    expect(Object.keys(merged)).toEqual(["2026-01-05"]);
  });

  it("lets the newer copy of a shared date win", () => {
    const local = dayLog("2026-01-05", "2026-05-01T00:00:00.000Z");
    const old = dayLog("2026-01-05", "2026-01-01T00:00:00.000Z");

    expect(mergeDayLogs({ "2026-01-05": local }, { "2026-01-05": old })["2026-01-05"]).toBe(local);
    expect(mergeDayLogs({ "2026-01-05": old }, { "2026-01-05": local })["2026-01-05"]).toBe(local);
  });

  it("breaks a tie in favour of the backup", () => {
    const same = "2026-01-05T00:00:00.000Z";
    const local = dayLog("2026-01-05", same);
    const fromBackup = dayLog("2026-01-05", same);

    expect(mergeDayLogs({ "2026-01-05": local }, { "2026-01-05": fromBackup })["2026-01-05"]).toBe(
      fromBackup,
    );
  });
});

describe("summarizeBackup", () => {
  it("counts days, named foods and custom foods", () => {
    const result = roundTrip({
      meals: { Breakfast: [food("Oats"), food("")], Lunch: [food("Rice")] },
      customFoods: [
        {
          id: "c1",
          foodName: "Protein shake",
          servings: [],
          calories: 120,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(summarizeBackup(result.sections)).toEqual({ days: 1, foods: 2, customFoods: 1 });
  });
});
