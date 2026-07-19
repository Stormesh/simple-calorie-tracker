interface FlaggedFoodRow {
  id: string;
  food_name: string;
  serving_description: string;
  serving_grams: number;
  calories: number;
  total_fat: number;
  cholesterol: number;
  sodium: number;
  total_carbohydrate: number;
  sugars: number;
  protein: number;
  submitted_by: string | null;
  created_at: string;
  flags: number;
  hidden: number;
}

export default defineEventHandler(async (event) => {
  const token =
    getHeader(event, "moderator-token") || getHeader(event, "Moderator-Token");
  const config = useRuntimeConfig(event);
  const moderatorSecret = config.moderatorSecret as string;

  if (!moderatorSecret || token !== moderatorSecret) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  const db = getDb(event);
  if (!db) {
    throw createError({
      statusCode: 503,
      statusMessage: "Database not available",
    });
  }

  const results = await db
    .prepare(
      `SELECT id, food_name, serving_description, serving_grams, calories, total_fat, cholesterol, sodium, total_carbohydrate, sugars, protein, submitted_by, created_at, flags, hidden
     FROM community_foods
     WHERE flags > 0
     ORDER BY flags DESC, created_at ASC`,
    )
    .all();

  const foods = (results.results as unknown as FlaggedFoodRow[]).map((row) => ({
    id: row.id,
    foodName: row.food_name,
    servingDescription: row.serving_description,
    servingGrams: row.serving_grams,
    calories: row.calories,
    totalFat: row.total_fat,
    cholesterol: row.cholesterol,
    sodium: row.sodium,
    totalCarbohydrate: row.total_carbohydrate,
    sugars: row.sugars,
    protein: row.protein,
    submittedBy: row.submitted_by,
    createdAt: row.created_at,
    flags: row.flags,
    hidden: row.hidden === 1,
  }));

  return { foods };
});
