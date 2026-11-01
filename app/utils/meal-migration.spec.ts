import { describe, expect, it } from "vitest";
import {
  cloneFoods,
  hasNamedFood,
  legacyMealCookieKey,
  mealStorageKey,
  planMealMigration,
} from "./meal-migration";
import type { IFoodTemplate } from "./food-types";

const blank = (): IFoodTemplate => ({
  foodName: "",
  foodId: "",
  servingId: "",
  grams: 0,
  calories: 0,
  totalFat: 0,
  cholesterol: 0,
  sodium: 0,
  totalCarbohydrate: 0,
  sugars: 0,
  protein: 0,
});

const food = (name: string, calories = 100): IFoodTemplate => ({
  ...blank(),
  foodName: name,
  calories,
});

describe("keys", () => {
  it("namespaces the new storage key and keeps the old cookie name", () => {
    expect(mealStorageKey("Breakfast")).toBe("maxhp-meal:Breakfast");
    expect(legacyMealCookieKey("Breakfast")).toBe("foods-Breakfast");
  });
});

describe("hasNamedFood", () => {
  it("counts any food with a trimmed name, even at 0 calories", () => {
    expect(hasNamedFood([food("Zero", 0)])).toBe(true);
  });

  it("ignores blank draft rows", () => {
    expect(hasNamedFood([blank(), blank()])).toBe(false);
  });

  it("ignores whitespace-only names", () => {
    expect(hasNamedFood([{ ...blank(), foodName: "   " }])).toBe(false);
  });

  it("handles missing and non-array values", () => {
    expect(hasNamedFood(null)).toBe(false);
    expect(hasNamedFood(undefined)).toBe(false);
    expect(hasNamedFood("oops" as unknown as IFoodTemplate[])).toBe(false);
  });
});

describe("planMealMigration", () => {
  it("adopts the cookie when storage holds only blank rows", () => {
    const plan = planMealMigration({ stored: [blank()], cookie: [food("Oats")] });

    expect(plan.action).toBe("adopt-cookie");
    expect(plan.foods).toEqual([food("Oats")]);
  });

  it("adopts the cookie when storage is empty", () => {
    const plan = planMealMigration({ stored: [], cookie: [food("Oats")] });

    expect(plan.action).toBe("adopt-cookie");
    expect(plan.foods).toEqual([food("Oats")]);
  });

  it("adopts the cookie when storage has never been written", () => {
    const plan = planMealMigration({ stored: null, cookie: [food("Oats")] });

    expect(plan.action).toBe("adopt-cookie");
  });

  it("keeps storage when it already holds real foods", () => {
    const plan = planMealMigration({ stored: [food("Newer")], cookie: [food("Older")] });

    expect(plan.action).toBe("keep-stored");
    expect(plan.foods).toEqual([]);
  });

  it("does nothing when the cookie holds no real food", () => {
    expect(planMealMigration({ stored: [blank()], cookie: [blank()] }).action).toBe("none");
    expect(planMealMigration({ stored: null, cookie: null }).action).toBe("none");
  });

  it("deep-copies, so the migrated array is not aliased to the cookie value", () => {
    const cookie = [food("Oats")];
    const plan = planMealMigration({ stored: null, cookie });

    cookie[0]!.calories = 999;

    expect(plan.foods[0]!.calories).toBe(100);
  });

  it("preserves the row layout, including trailing blank rows", () => {
    const cookie = [food("Oats"), blank(), blank(), blank()];

    expect(planMealMigration({ stored: null, cookie }).foods).toHaveLength(4);
  });
});

describe("cloneFoods", () => {
  it("returns an equal but independent array", () => {
    const source = [food("Oats")];
    const copy = cloneFoods(source);

    expect(copy).toEqual(source);
    expect(copy).not.toBe(source);
    expect(copy[0]).not.toBe(source[0]);
  });
});
