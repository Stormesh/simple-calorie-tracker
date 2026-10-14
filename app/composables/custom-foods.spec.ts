import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { getCustomFoodServings } from "../../shared/utils/food";
import { deserializeCustomFoods } from "./custom-foods";
import type { ICustomFood } from "../../shared/utils/food";

// custom-foods.ts uses `getCustomFoodServings` as a Nuxt auto-import (a bare
// global resolved at call time). Bind it for the pure deserializer so these
// tests run without booting Nuxt.
const g = globalThis as Record<string, unknown>;
beforeAll(() => {
  g.getCustomFoodServings = getCustomFoodServings;
});
afterAll(() => {
  delete g.getCustomFoodServings;
});

const legacyFlatFood = {
  id: "custom-1",
  foodName: "Porridge",
  createdAt: "2026-01-01T00:00:00.000Z",
  servingDescription: "1 bowl",
  servingGrams: 250,
  calories: 150,
  protein: 5,
};

describe("deserializeCustomFoods", () => {
  it("returns [] for null/empty storage", () => {
    expect(deserializeCustomFoods(null)).toEqual([]);
    expect(deserializeCustomFoods("")).toEqual([]);
  });

  it("returns [] for corrupt JSON instead of throwing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(deserializeCustomFoods("{not json")).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("returns [] when the stored value is valid JSON but not an array", () => {
    expect(deserializeCustomFoods("{}")).toEqual([]);
    expect(deserializeCustomFoods('"a string"')).toEqual([]);
    expect(deserializeCustomFoods("42")).toEqual([]);
    expect(deserializeCustomFoods("null")).toEqual([]);
  });

  it("drops non-object and null entries but keeps valid ones", () => {
    const result = deserializeCustomFoods(JSON.stringify([null, "string", 42, [], legacyFlatFood]));
    expect(result).toHaveLength(1);
    expect(result[0]?.foodName).toBe("Porridge");
  });

  it("migrates a flat legacy food into a servings array", () => {
    const [food] = deserializeCustomFoods(JSON.stringify([legacyFlatFood]));
    expect(food?.servings).toHaveLength(1);
    expect(food?.servings[0]).toMatchObject({
      servingDescription: "1 bowl",
      servingGrams: 250,
      calories: 150,
      protein: 5,
    });
  });

  it("preserves an existing servings array as-is", () => {
    const withServings: ICustomFood = {
      ...legacyFlatFood,
      servings: [
        {
          servingDescription: "100g",
          servingGrams: 100,
          calories: 100,
          totalFat: 1,
          cholesterol: 2,
          sodium: 3,
          totalCarbohydrate: 4,
          sugars: 5,
          protein: 6,
        },
      ],
    };
    const [food] = deserializeCustomFoods(JSON.stringify([withServings]));
    expect(food?.servings).toHaveLength(1);
    expect(food?.servings[0]?.servingDescription).toBe("100g");
  });

  it("defaults missing nutrition fields in the migrated serving", () => {
    const [food] = deserializeCustomFoods(
      JSON.stringify([{ id: "custom-2", foodName: "Bare", createdAt: "x" }]),
    );
    expect(food?.servings[0]).toMatchObject({
      servingDescription: "100g",
      servingGrams: 100,
      calories: 0,
      totalFat: 0,
      protein: 0,
    });
  });
});
