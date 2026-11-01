import type { IFoodTemplate } from "./food-types";

/**
 * One-time move of the meal arrays from cookies to localStorage.
 *
 * Cookies cap at ~4 KB per cookie, so a meal with a handful of foods could be
 * silently truncated — or the write would fail and the meal would come back
 * empty. localStorage has 5 MB and is not sent on every request, which is what
 * the meal arrays needed all along.
 *
 * This module holds the decision only: it takes what was read from each side and
 * says what to do, so it can be unit-tested without a browser. The caller
 * (`app/composables/meal-foods.ts`) owns the reads, the writes and the flag.
 */

export const MEAL_STORAGE_PREFIX = "maxhp-meal:";
export const MEALS_MIGRATED_FLAG = "maxhp-meals-migrated";

/** Where a meal's foods live now. */
export const mealStorageKey = (meal: string): string => `${MEAL_STORAGE_PREFIX}${meal}`;

/** Where a meal's foods lived before (cookie name, kept for the migration). */
export const legacyMealCookieKey = (meal: string): string => `foods-${meal}`;

/**
 * The app's criterion for "a meal with something in it", everywhere: a food with
 * a trimmed name counts, even one with 0 calories. Blank draft rows do not.
 */
export const hasNamedFood = (foods: readonly IFoodTemplate[] | null | undefined): boolean =>
  Array.isArray(foods) &&
  foods.some((food) => typeof food?.foodName === "string" && food.foodName.trim() !== "");

/** Deep copy, so a migrated cookie array is not aliased by the cookie ref. */
export const cloneFoods = (foods: readonly IFoodTemplate[]): IFoodTemplate[] =>
  JSON.parse(JSON.stringify(foods)) as IFoodTemplate[];

export interface IMealMigrationInput {
  stored: IFoodTemplate[] | null | undefined;
  cookie: IFoodTemplate[] | null | undefined;
}

export type MealMigrationAction =
  /** Nothing worth moving (no named food in the cookie). */
  | "none"
  /** localStorage already holds this meal — the cookie is the stale copy. */
  | "keep-stored"
  /** localStorage is empty, the cookie is the only copy. */
  | "adopt-cookie";

export interface IMealMigrationPlan {
  action: MealMigrationAction;
  /** Foods to write into localStorage; empty unless the action is `adopt-cookie`. */
  foods: IFoodTemplate[];
}

/**
 * Stored foods win. The migration only runs once, but a user can clear site data
 * and reload between deploys, so a half-migrated state must never overwrite
 * newer storage with an older cookie.
 */
export const planMealMigration = ({ stored, cookie }: IMealMigrationInput): IMealMigrationPlan => {
  if (!hasNamedFood(cookie)) return { action: "none", foods: [] };
  if (hasNamedFood(stored)) return { action: "keep-stored", foods: [] };
  return { action: "adopt-cookie", foods: cloneFoods(cookie!) };
};
