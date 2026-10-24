/**
 * Request shape and validation for the moderator edit endpoint.
 *
 * Kept out of the route handler so it can be unit tested, which also means this
 * module must not import `h3`: the specs run without the Nuxt/Nitro runtime, and
 * `h3` is not resolvable as a bare specifier here. Validation failures are
 * returned as data and the route handler turns them into an HTTP error.
 */

export interface ICommunityFoodServing {
  servingDescription: string;
  servingGrams: number;
  calories: number;
  totalFat: number;
  cholesterol: number;
  sodium: number;
  totalCarbohydrate: number;
  sugars: number;
  protein: number;
}

export interface ICommunityEditBody {
  foodId: string;
  foodName?: string;
  servings?: ICommunityFoodServing[];
  servingDescription?: string;
  servingGrams?: number;
  calories?: number;
  totalFat?: number;
  cholesterol?: number;
  sodium?: number;
  totalCarbohydrate?: number;
  sugars?: number;
  protein?: number;
}

/** Numeric nutrient columns, mapped from request field to database column. */
const NUMERIC_COLUMNS: Record<string, string> = {
  servingGrams: "serving_grams",
  calories: "calories",
  totalFat: "total_fat",
  cholesterol: "cholesterol",
  sodium: "sodium",
  totalCarbohydrate: "total_carbohydrate",
  sugars: "sugars",
  protein: "protein",
};

/** Free-text columns, mapped from request field to database column. */
const TEXT_COLUMNS: Record<string, string> = {
  servingDescription: "serving_description",
};

export type CommunityEditPlan =
  | {
      ok: true;
      /** `column = ?` fragments for the SET clause. */
      assignments: string[];
      /** Bound values, positionally matching `assignments`. */
      values: unknown[];
    }
  | { ok: false; message: string };

/**
 * Turn the fields a moderator actually sent into `SET` fragments, so correcting
 * one number does not require restating the whole entry.
 *
 * Only whitelisted fields are considered, so an unexpected key is ignored rather
 * than interpolated into the statement.
 */
export const planCommunityEdit = (body: ICommunityEditBody): CommunityEditPlan => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [field, column] of Object.entries(NUMERIC_COLUMNS)) {
    const value = body[field as keyof ICommunityEditBody];
    if (value === undefined) continue;

    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { ok: false, message: `${field} must be a number` };
    }

    assignments.push(`${column} = ?`);
    values.push(value);
  }

  for (const [field, column] of Object.entries(TEXT_COLUMNS)) {
    const value = body[field as keyof ICommunityEditBody];
    if (value === undefined) continue;

    if (typeof value !== "string" || !value.trim()) {
      return { ok: false, message: `${field} must be a non-empty string` };
    }

    assignments.push(`${column} = ?`);
    values.push(value.trim());
  }

  if (body.servings !== undefined) {
    if (!Array.isArray(body.servings) || body.servings.length === 0) {
      return { ok: false, message: "servings must be a non-empty array" };
    }

    assignments.push("servings = ?");
    values.push(JSON.stringify(body.servings));
  }

  return { ok: true, assignments, values };
};
