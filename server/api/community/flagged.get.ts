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

interface FlagRow {
  food_id: string;
  reason: string;
  created_at: string;
}

export default defineEventHandler(async (event) => {
  requireModerator(event);

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

  // Reporter-supplied reasons are what the moderator is actually triaging, so
  // they travel with the queue rather than behind a second request.
  const flagRows = await db
    .prepare(
      `SELECT food_id, reason, created_at
     FROM community_food_flags
     WHERE food_id IN (SELECT id FROM community_foods WHERE flags > 0)
     ORDER BY created_at ASC`,
    )
    .all();

  const reasonsByFood = new Map<string, Array<{ reason: string; createdAt: string }>>();
  for (const row of flagRows.results as unknown as FlagRow[]) {
    const reasons = reasonsByFood.get(row.food_id) ?? [];
    reasons.push({ reason: row.reason, createdAt: row.created_at });
    reasonsByFood.set(row.food_id, reasons);
  }

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
    reasons: reasonsByFood.get(row.id) ?? [],
  }));

  return { foods };
});
