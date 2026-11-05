import type { IFoodTemplate } from "~/utils/food-types";
import { foodArrayDefault } from "./food-state";
import { foodsList } from "~/utils/meals";
import {
  MEALS_MIGRATED_FLAG,
  hasNamedFood,
  legacyMealCookieKey,
  mealStorageKey,
  planMealMigration,
} from "~/utils/meal-migration";

/**
 * The foods of one meal, backed by localStorage.
 *
 * Cookies were the original store and are still what `bmr`, `theme`,
 * `current-date` and `player-name` use — small values that are fine as cookies.
 * A meal is not: four blank rows are already ~600 bytes, and the 4 KB cookie
 * ceiling silently truncates a real meal. localStorage is the right home.
 *
 * `useLocalStorage` gives a new ref per call, so refs are cached per meal in a
 * detached session scope — one shared instance per meal, exactly like
 * `useCurrentDateCookie`. Without that, a write through one component's ref
 * would not be seen by another's until a same-tab storage event round trip.
 */

const mealRefs = new Map<string, Ref<IFoodTemplate[]>>();

export function useMealFoods(meal: string): Ref<IFoodTemplate[]> {
  // Never cache on the server: module state is shared across requests, and
  // localStorage does not exist there anyway (the ref stays at its default).
  if (!import.meta.client) {
    return useLocalStorage<IFoodTemplate[]>(mealStorageKey(meal), () => foodArrayDefault());
  }

  if (!mealRefs.has(meal)) {
    mealRefs.set(
      meal,
      inSessionScope(() =>
        useLocalStorage<IFoodTemplate[]>(mealStorageKey(meal), () => foodArrayDefault()),
      ),
    );
  }

  return mealRefs.get(meal)!;
}

/** All four meals, in display order. */
export const useAllMealFoods = (): Ref<IFoodTemplate[]>[] => foodsList.map(useMealFoods);

/**
 * Move the legacy `foods-*` cookies into localStorage, once per browser.
 *
 * Idempotent and cheap after the first run: the flag short-circuits before any
 * cookie is read. The decision itself is `planMealMigration`, unit-tested.
 */
export function migrateMealFoods(): void {
  const migrated = useLocalStorage<boolean>(MEALS_MIGRATED_FLAG, false);
  if (migrated.value) return;

  foodsList.forEach((meal) => {
    // Deliberately not PERSISTENT_COOKIE: a legacy cookie is read once and
    // deleted on this same pass, so its lifetime never matters.
    const cookie = useCookie<IFoodTemplate[] | null>(legacyMealCookieKey(meal), {
      default: () => null,
    });
    const foods = useMealFoods(meal);

    const plan = planMealMigration({ stored: foods.value, cookie: cookie.value });

    if (plan.action === "adopt-cookie") foods.value = plan.foods;

    // Drop the cookie either way: after this run localStorage is the only copy,
    // and leaving a stale one behind would resurrect old foods if storage were
    // ever cleared without clearing cookies.
    if (cookie.value !== null) cookie.value = null;
  });

  migrated.value = true;
}

/**
 * Whether any meal currently holds a food with a name. Used by the one-time
 * "save what the last session left behind" migration and by the backup summary.
 */
export const hasUnsavedMealFoods = (): boolean =>
  foodsList.some((meal) => hasNamedFood(useMealFoods(meal).value));
