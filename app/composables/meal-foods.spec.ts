import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref, type Ref } from "vue";
import { migrateMealFoods, useMealFoods } from "~/composables/meal-foods";
import { MEALS_MIGRATED_FLAG, mealStorageKey } from "~/utils/meal-migration";
import { foodsList } from "~/utils/meals";
import type { IFoodTemplate } from "~/utils/food-types";

// Same stubGlobal approach as day-logs.spec.ts: `useMealFoods` consumes
// `useLocalStorage` and `useCookie` as Nuxt auto-imports, so both are backed by
// in-memory jars of shared refs. `import.meta.client` is falsy here, which means
// the ref cache is bypassed and each call reads the jar — exactly what the
// migration needs to be observable.
const cookieJar = new Map<string, Ref<unknown>>();
const storageJar = new Map<string, Ref<unknown>>();

vi.stubGlobal("useCookie", (name: string, opts?: { default?: () => unknown }) => {
  if (!cookieJar.has(name)) {
    cookieJar.set(name, ref(opts?.default?.() ?? null));
  }
  return cookieJar.get(name);
});

vi.stubGlobal("useLocalStorage", (key: string, initial: unknown) => {
  if (!storageJar.has(key)) {
    storageJar.set(key, ref(typeof initial === "function" ? initial() : initial));
  }
  return storageJar.get(key);
});

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

const blank = (): IFoodTemplate => ({ ...food("", 0) });

function seedCookie(meal: string, foods: IFoodTemplate[] | null) {
  cookieJar.set(`foods-${meal}`, ref(foods));
}

function storedFoods(meal: string): IFoodTemplate[] {
  return (storageJar.get(mealStorageKey(meal))?.value ?? []) as IFoodTemplate[];
}

/** Only the rows a user actually filled in — blank draft rows are always there. */
function namedFoods(meal: string): IFoodTemplate[] {
  return storedFoods(meal).filter((food) => food.foodName !== "");
}

const migratedFlag = () => storageJar.get(MEALS_MIGRATED_FLAG)?.value;

describe("migrateMealFoods", () => {
  it("moves a cookie's foods into localStorage and expires the cookie", () => {
    seedCookie("Breakfast", [food("Oats", 150)]);

    migrateMealFoods();

    expect(storedFoods("Breakfast")).toEqual([food("Oats", 150)]);
    expect(cookieJar.get("foods-Breakfast")?.value).toBeNull();
    expect(migratedFlag()).toBe(true);
  });

  it("migrates every meal, not just the first", () => {
    foodsList.forEach((meal) => seedCookie(meal, [food(`${meal} food`)]));

    migrateMealFoods();

    foodsList.forEach((meal) => {
      expect(storedFoods(meal)).toEqual([food(`${meal} food`)]);
    });
  });

  it("keeps storage when it already holds foods and still drops the cookie", () => {
    storageJar.set(mealStorageKey("Lunch"), ref([food("Newer")]));
    seedCookie("Lunch", [food("Older")]);

    migrateMealFoods();

    expect(storedFoods("Lunch")).toEqual([food("Newer")]);
    expect(cookieJar.get("foods-Lunch")?.value).toBeNull();
  });

  it("leaves blank-only cookies as blank storage, without inventing data", () => {
    seedCookie("Dinner", [blank(), blank()]);

    migrateMealFoods();

    // Nothing worth moving: storage keeps only the default draft rows.
    expect(namedFoods("Dinner")).toEqual([]);
    expect(cookieJar.get("foods-Dinner")?.value).toBeNull();
  });

  it("is a one-time migration: a later cookie is ignored once the flag is set", () => {
    migrateMealFoods();
    seedCookie("Snacks", [food("Late")]);

    migrateMealFoods();

    expect(namedFoods("Snacks")).toEqual([]);
  });

  it("does nothing when there is no cookie for a meal", () => {
    migrateMealFoods();

    expect(namedFoods("Breakfast")).toEqual([]);
    expect(migratedFlag()).toBe(true);
  });
});

describe("useMealFoods", () => {
  it("defaults to four blank rows so the UI always has a slot to type in", () => {
    expect(useMealFoods("Breakfast").value).toHaveLength(4);
    expect(useMealFoods("Breakfast").value.every((f) => f.foodName === "")).toBe(true);
  });

  it("hands out independent default arrays per meal", () => {
    const breakfast = useMealFoods("Breakfast");
    // Creating the Lunch ref is the point: it must not share Breakfast's array.
    useMealFoods("Lunch");

    breakfast.value[0] = food("Oats");

    expect(storedFoods("Lunch")[0]?.foodName).toBe("");
  });

  it("reads back what was written", () => {
    useMealFoods("Snacks").value = [food("Chips", 250)];

    expect(storedFoods("Snacks")).toEqual([food("Chips", 250)]);
  });
});
