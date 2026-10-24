import { describe, it, expect } from "vitest";
import { planCommunityEdit } from "./community-edit";
import type { ICommunityEditBody } from "./community-edit";

/** Narrow a plan to its success branch, failing the test on a validation error. */
const planOk = (body: ICommunityEditBody) => {
  const plan = planCommunityEdit(body);
  if (!plan.ok) throw new Error(`expected a valid plan, got: ${plan.message}`);
  return plan;
};

/** Narrow a plan to its failure branch, failing the test on success. */
const planError = (body: ICommunityEditBody) => {
  const plan = planCommunityEdit(body);
  if (plan.ok) throw new Error("expected a validation error, got a valid plan");
  return plan.message;
};

describe("planCommunityEdit", () => {
  it("writes only the fields that were sent", () => {
    const { assignments, values } = planOk({ foodId: "x", calories: 250 });

    expect(assignments).toEqual(["calories = ?"]);
    expect(values).toEqual([250]);
  });

  it("accepts zero, which a truthiness check would drop", () => {
    const { assignments, values } = planOk({ foodId: "x", totalFat: 0 });

    expect(assignments).toEqual(["total_fat = ?"]);
    expect(values).toEqual([0]);
  });

  it("maps several fields in a stable order", () => {
    const { assignments, values } = planOk({
      foodId: "x",
      servingGrams: 100,
      calories: 200,
      protein: 10,
    });

    expect(assignments).toEqual(["serving_grams = ?", "calories = ?", "protein = ?"]);
    expect(values).toEqual([100, 200, 10]);
  });

  it("ignores unknown keys instead of interpolating them", () => {
    const { assignments } = planOk({
      foodId: "x",
      calories: 100,
      "hidden = 1, flags = 0 --": 1,
      id: "other",
    } as never);

    expect(assignments).toEqual(["calories = ?"]);
  });

  it("returns nothing for an untouched body", () => {
    expect(planOk({ foodId: "x" })).toMatchObject({ assignments: [], values: [] });
  });

  it("rejects non finite numbers", () => {
    expect(planError({ foodId: "x", calories: Number.NaN })).toMatch(/calories must be a number/);
    expect(planError({ foodId: "x", calories: Number.POSITIVE_INFINITY })).toMatch(
      /calories must be a number/,
    );
    expect(planError({ foodId: "x", calories: "200" as never })).toMatch(
      /calories must be a number/,
    );
  });

  it("rejects a blank serving description but trims a valid one", () => {
    expect(planError({ foodId: "x", servingDescription: "   " })).toMatch(
      /servingDescription must be a non-empty string/,
    );

    expect(planOk({ foodId: "x", servingDescription: " 1 cup " }).values).toEqual(["1 cup"]);
  });

  it("serialises servings", () => {
    const servings = [
      {
        servingDescription: "1 cup",
        servingGrams: 240,
        calories: 100,
        totalFat: 1,
        cholesterol: 0,
        sodium: 5,
        totalCarbohydrate: 20,
        sugars: 10,
        protein: 2,
      },
    ];

    const { assignments, values } = planOk({ foodId: "x", servings });

    expect(assignments).toEqual(["servings = ?"]);
    expect(values).toEqual([JSON.stringify(servings)]);
  });

  it("rejects an empty servings array", () => {
    expect(planError({ foodId: "x", servings: [] })).toMatch(/servings must be a non-empty array/);
  });
});
