import { describe, it, expect } from "vitest";
import {
  ALL_KEY,
  LEGACY_FLAG_KEYS,
  logHasContent,
  mergeLegacyDayLogs,
  parseLegacyDayLog,
} from "./day-log-migration";
import type { IDayLog } from "~/composables/day-logs";

function dayLog(date: string, opts: Partial<IDayLog> = {}): IDayLog {
  return {
    date,
    foods: {},
    updatedAt: new Date(0).toISOString(),
    ...opts,
  };
}

function withFood(name: string): IDayLog["foods"] {
  return {
    Breakfast: [
      {
        foodName: name,
        foodId: "1",
        servingId: "s",
        grams: 100,
        calories: 100,
        totalFat: 0,
        cholesterol: 0,
        sodium: 0,
        totalCarbohydrate: 0,
        sugars: 0,
        protein: 0,
      },
    ],
  };
}

describe("logHasContent", () => {
  it("is false for an empty log", () => {
    expect(logHasContent(dayLog("2026-01-01"))).toBe(false);
  });

  it("is true when a weight entry is present, even at 0", () => {
    expect(logHasContent(dayLog("2026-01-01", { weightLog: 0 }))).toBe(true);
  });

  it("is true when any meal has a food with a name", () => {
    expect(logHasContent(dayLog("2026-01-01", { foods: withFood("Oats") }))).toBe(true);
  });

  it("is false when foods exist but all have empty names", () => {
    const [template] = withFood("Oats").Breakfast ?? [];
    const foods = { Breakfast: [{ ...template!, foodName: "" }] };
    expect(logHasContent(dayLog("2026-01-01", { foods }))).toBe(false);
  });
});

describe("parseLegacyDayLog", () => {
  it("parses a valid entry and forces the date to match the key", () => {
    const raw = JSON.stringify(dayLog("1999-01-01", { foods: withFood("Legacy") }));
    const result = parseLegacyDayLog(raw, "maxhp-day-log:2026-01-01", "2026-01-01");
    expect(result?.date).toBe("2026-01-01");
    expect(result?.foods.Breakfast?.[0]?.foodName).toBe("Legacy");
  });

  it("defaults a missing updatedAt to the epoch", () => {
    const raw = JSON.stringify({ date: "2026-01-01", foods: {} });
    const result = parseLegacyDayLog(raw, "k", "2026-01-01");
    expect(result?.updatedAt).toBe(new Date(0).toISOString());
  });

  it("returns null for corrupt JSON", () => {
    expect(parseLegacyDayLog("{not json", "k", "2026-01-01")).toBeNull();
  });

  it("returns null for null/empty input", () => {
    expect(parseLegacyDayLog(null, "k", "2026-01-01")).toBeNull();
    expect(parseLegacyDayLog("", "k", "2026-01-01")).toBeNull();
  });

  it("returns null when required fields are missing or mistyped", () => {
    expect(parseLegacyDayLog(JSON.stringify({ foods: {} }), "k", "2026-01-01")).toBeNull(); // no date
    expect(parseLegacyDayLog(JSON.stringify({ date: "2026-01-01" }), "k", "2026-01-01")).toBeNull(); // no foods
    expect(
      parseLegacyDayLog(JSON.stringify({ date: 123, foods: {} }), "k", "2026-01-01"),
    ).toBeNull(); // date not a string
  });
});

describe("mergeLegacyDayLogs", () => {
  it("merges a legacy day into an empty record", () => {
    const legacy = dayLog("2026-01-01", { foods: withFood("Eggs") });
    const { merged, changed, staleKeys } = mergeLegacyDayLogs({}, [
      { key: "maxhp-day-log:2026-01-01", raw: JSON.stringify(legacy) },
    ]);
    expect(changed).toBe(true);
    expect(merged["2026-01-01"]?.foods.Breakfast?.[0]?.foodName).toBe("Eggs");
    expect(staleKeys).toEqual(["maxhp-day-log:2026-01-01"]);
  });

  it("lets legacy win over an empty stub (no foods, no weight)", () => {
    const current = { "2026-01-01": dayLog("2026-01-01") };
    const legacy = dayLog("2026-01-01", { foods: withFood("Eggs") });
    const { merged, changed } = mergeLegacyDayLogs(current, [
      { key: "maxhp-day-log:2026-01-01", raw: JSON.stringify(legacy) },
    ]);
    expect(changed).toBe(true);
    expect(merged["2026-01-01"]?.foods.Breakfast?.[0]?.foodName).toBe("Eggs");
  });

  it("keeps the current record when it already has content (legacy is stale)", () => {
    const current = { "2026-01-01": dayLog("2026-01-01", { foods: withFood("New") }) };
    const legacy = dayLog("2026-01-01", { foods: withFood("Old") });
    const { merged, changed, staleKeys } = mergeLegacyDayLogs(current, [
      { key: "maxhp-day-log:2026-01-01", raw: JSON.stringify(legacy) },
    ]);
    expect(changed).toBe(false);
    expect(merged["2026-01-01"]?.foods.Breakfast?.[0]?.foodName).toBe("New");
    expect(staleKeys).toEqual(["maxhp-day-log:2026-01-01"]);
  });

  it("treats a weight-only current stub as empty, so legacy food wins", () => {
    // Older builds wrote a stub with weightLog but no foods. logHasContent
    // says the stub "has content" because weightLog != null, so the current
    // record must win (preserving the weight). This pins that rule.
    const current = { "2026-01-01": dayLog("2026-01-01", { weightLog: 70 }) };
    const legacy = dayLog("2026-01-01", { foods: withFood("Eggs") });
    const { merged, changed, staleKeys } = mergeLegacyDayLogs(current, [
      { key: "maxhp-day-log:2026-01-01", raw: JSON.stringify(legacy) },
    ]);
    expect(changed).toBe(false);
    expect(merged["2026-01-01"]?.weightLog).toBe(70);
    expect(merged["2026-01-01"]?.foods).toEqual({});
    expect(staleKeys).toEqual(["maxhp-day-log:2026-01-01"]);
  });

  it("leaves corrupt legacy entries untouched and not marked stale", () => {
    const { merged, changed, staleKeys } = mergeLegacyDayLogs({}, [
      { key: "maxhp-day-log:2026-01-01", raw: "{corrupt" },
    ]);
    expect(changed).toBe(false);
    expect(merged["2026-01-01"]).toBeUndefined();
    expect(staleKeys).toEqual([]); // never deleted, so a future run can retry
  });

  it("marks known legacy flag keys stale but ignores unknown non-date keys", () => {
    const flagKeys = [...LEGACY_FLAG_KEYS];
    const { changed, staleKeys } = mergeLegacyDayLogs({}, [
      ...flagKeys.map((key) => ({ key, raw: "irrelevant" })),
      { key: "maxhp-day-log:some-random-thing", raw: "irrelevant" },
    ]);
    expect(changed).toBe(false);
    expect(staleKeys).toEqual(flagKeys);
  });

  it("ignores the ALL_KEY and keys outside our prefix", () => {
    const legacy = dayLog("2026-01-01", { foods: withFood("Eggs") });
    const { merged, changed, staleKeys } = mergeLegacyDayLogs({}, [
      { key: ALL_KEY, raw: JSON.stringify({ "2026-01-01": legacy }) },
      { key: "some-other-app:key", raw: JSON.stringify(legacy) },
    ]);
    expect(changed).toBe(false);
    expect(merged).toEqual({});
    expect(staleKeys).toEqual([]);
  });

  it("marks a legacy key whose JSON is a non-object as untouched", () => {
    // Valid JSON but not a day-log object (e.g. a bare string or array).
    const { merged, changed, staleKeys } = mergeLegacyDayLogs({}, [
      { key: "maxhp-day-log:2026-01-01", raw: JSON.stringify(["not", "a", "log"]) },
    ]);
    expect(changed).toBe(false);
    expect(merged["2026-01-01"]).toBeUndefined();
    expect(staleKeys).toEqual([]);
  });

  it("is idempotent: a second run after merge reports no further change", () => {
    const legacy = dayLog("2026-01-01", { foods: withFood("Eggs") });
    const entry = { key: "maxhp-day-log:2026-01-01", raw: JSON.stringify(legacy) };
    const first = mergeLegacyDayLogs({}, [entry]);
    // Simulate the caller applying the merge but (deliberately) not deleting
    // the key — the next run must not clobber or re-report it as a change.
    const second = mergeLegacyDayLogs(first.merged, [entry]);
    expect(second.changed).toBe(false);
    expect(second.merged["2026-01-01"]?.foods.Breakfast?.[0]?.foodName).toBe("Eggs");
    expect(second.staleKeys).toEqual([entry.key]);
  });

  it("merges multiple days in one pass", () => {
    const a = dayLog("2026-01-01", { foods: withFood("A") });
    const b = dayLog("2026-01-02", { foods: withFood("B") });
    const { merged, changed } = mergeLegacyDayLogs({}, [
      { key: "maxhp-day-log:2026-01-01", raw: JSON.stringify(a) },
      { key: "maxhp-day-log:2026-01-02", raw: JSON.stringify(b) },
    ]);
    expect(changed).toBe(true);
    expect(Object.keys(merged).sort()).toEqual(["2026-01-01", "2026-01-02"]);
  });

  it("does not mutate the input current record", () => {
    const current = { "2026-01-01": dayLog("2026-01-01") };
    const legacy = dayLog("2026-01-01", { foods: withFood("Eggs") });
    mergeLegacyDayLogs(current, [{ key: "maxhp-day-log:2026-01-01", raw: JSON.stringify(legacy) }]);
    expect(current["2026-01-01"]?.foods).toEqual({});
  });
});
