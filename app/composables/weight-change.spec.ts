import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { useAggregatedNutrients } from "~/composables/aggregated-nutrients";
import { useBmr } from "~/composables/bmr-state";
import { useWeightChange } from "~/composables/weight-change";
import { foodsList } from "~/utils/meals";
import type { IFoodTemplate } from "~/utils/food-types";

// Same stubGlobal approach as day-logs.spec.ts: the composables consume
// Nuxt/Vue APIs as auto-imported globals. `useCookie` is backed by an
// in-memory jar of shared refs so setup and code-under-test stay in sync.
const cookieJar = new Map<string, ReturnType<typeof ref>>();

vi.stubGlobal("ref", ref);
vi.stubGlobal("computed", computed);
vi.stubGlobal("useCookie", (name: string, opts?: { default?: () => unknown }) => {
  if (!cookieJar.has(name)) {
    cookieJar.set(name, ref(opts?.default?.() ?? null));
  }
  return cookieJar.get(name);
});
vi.stubGlobal("useAggregatedNutrients", useAggregatedNutrients);
vi.stubGlobal("useBmr", useBmr);
vi.stubGlobal("foodsList", foodsList);

function food(name: string, calories: number): IFoodTemplate {
  return {
    foodName: name,
    foodId: "1",
    servingId: "s",
    grams: 100,
    calories,
    totalFat: 10,
    cholesterol: 5,
    sodium: 20,
    totalCarbohydrate: 30,
    sugars: 8,
    protein: 12,
  };
}

function setBmr(bmr: number | null) {
  useBmr().value = {
    bmr,
    weight: null,
    height: null,
    age: null,
    gender: "male",
    unitSystem: "metric",
    activity: 1.2,
    target: 0,
  };
}

function setMealFoods(meal: string, foods: IFoodTemplate[]) {
  const cookie = cookieJar.get(`foods-${meal}`) as
    ReturnType<typeof ref<IFoodTemplate[]>> | undefined;
  if (cookie) {
    cookie.value = foods;
  } else {
    cookieJar.set(`foods-${meal}`, ref(foods));
  }
}

beforeEach(() => {
  cookieJar.clear();
  // Start every test from a clean slate: no BMR, no foods.
  setBmr(null);
  foodsList.forEach((meal) => setMealFoods(meal, []));
});

describe("useAggregatedNutrients", () => {
  it("sums nutrients across all meals", () => {
    setMealFoods("Breakfast", [food("Oats", 100), food("Eggs", 200)]);
    setMealFoods("Lunch", [food("Rice", 300)]);

    const { aggregatedNutrients } = useAggregatedNutrients();

    // NOTE: saturatedFat/dietaryFiber stay 0 — IFoodTemplate has no such
    // fields and nothing accumulates them. Pinned implicitly by omission.
    expect(aggregatedNutrients.value).toMatchObject({
      totalCalories: 600,
      totalFat: 30,
      cholesterol: 15,
      sodium: 60,
      totalCarbohydrate: 90,
      sugars: 24,
      protein: 36,
    });
  });

  it("totals zero when no foods are logged", () => {
    const { aggregatedNutrients } = useAggregatedNutrients();
    expect(aggregatedNutrients.value.totalCalories).toBe(0);
  });
});

describe("useWeightChange", () => {
  it("reports a deficit when TDEE exceeds consumption", () => {
    setBmr(2000);
    setMealFoods("Breakfast", [food("Oats", 1500)]);

    const { weightChange } = useWeightChange();

    expect(weightChange.value).toMatchObject({
      deficit: 500,
      consumed: 1500,
      tdee: 2000,
      isDeficit: true,
      display: "Deficit: 500 kcal",
    });
  });

  it("reports a surplus when consumption exceeds TDEE", () => {
    setBmr(2000);
    setMealFoods("Dinner", [food("Pizza", 2500)]);

    const { weightChange } = useWeightChange();

    expect(weightChange.value).toMatchObject({
      deficit: -500,
      consumed: 2500,
      tdee: 2000,
      isDeficit: false,
      display: "Surplus: 500 kcal",
    });
  });

  it("reports maintenance when consumption equals TDEE", () => {
    setBmr(2000);
    setMealFoods("Lunch", [food("Exact", 2000)]);

    const { weightChange } = useWeightChange();

    expect(weightChange.value).toMatchObject({
      deficit: 0,
      isDeficit: false,
      display: "Maintenance",
    });
  });

  it("treats a missing BMR as TDEE 0", () => {
    setBmr(null);
    setMealFoods("Snacks", [food("Chips", 300)]);

    const { weightChange } = useWeightChange();

    expect(weightChange.value).toMatchObject({
      tdee: 0,
      consumed: 300,
      display: "Surplus: 300 kcal",
    });
  });

  it("reports maintenance with no BMR and no foods", () => {
    const { weightChange } = useWeightChange();
    expect(weightChange.value.display).toBe("Maintenance");
  });

  it("rounds fractional calories in the display", () => {
    setBmr(2000);
    setMealFoods("Breakfast", [food("A", 333.33), food("B", 333.33), food("C", 333.33)]);

    const { weightChange } = useWeightChange();

    // 999.99 consumed -> 1000 displayed; deficit 1000.01 -> 1000 displayed.
    expect(weightChange.value.consumed).toBe(1000);
    expect(weightChange.value.deficit).toBe(1000);
    expect(weightChange.value.display).toBe("Deficit: 1000 kcal");
  });

  it("aggregates foods across multiple meals", () => {
    setBmr(2500);
    setMealFoods("Breakfast", [food("Oats", 400)]);
    setMealFoods("Lunch", [food("Rice", 600)]);
    setMealFoods("Dinner", [food("Pasta", 800)]);
    setMealFoods("Snacks", [food("Apple", 100)]);

    const { weightChange } = useWeightChange();

    expect(weightChange.value.consumed).toBe(1900);
    expect(weightChange.value.deficit).toBe(600);
  });

  it("reacts to cookie changes", () => {
    setBmr(2000);
    setMealFoods("Breakfast", [food("Oats", 1500)]);

    const { weightChange } = useWeightChange();
    expect(weightChange.value.display).toBe("Deficit: 500 kcal");

    setBmr(1200);
    expect(weightChange.value.display).toBe("Surplus: 300 kcal");
  });
});
