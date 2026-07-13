interface ICustomFoodServing {
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

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const q = ((query.q as string) || "").trim();
  const limit = Math.min(
    Math.max(parseInt(query.limit as string) || 20, 1),
    50,
  );
  const offset = Math.max(parseInt(query.offset as string) || 0, 0);

  const db = getDb(event);
  if (!db) {
    throw createError({
      statusCode: 503,
      statusMessage: "Database not available",
    });
  }

  let results;
  let total;

  if (q) {
    const searchTerm = `%${q}%`;
    results = await db
      .prepare(
        `SELECT id, food_name, serving_description, serving_grams, calories, total_fat, cholesterol, sodium, total_carbohydrate, sugars, protein, submitted_by, servings, created_at
       FROM community_foods
       WHERE hidden = 0 AND food_name LIKE ?
       ORDER BY food_name ASC
       LIMIT ? OFFSET ?`,
      )
      .bind(searchTerm, limit, offset)
      .all();

    const countResult = await db
      .prepare(
        `SELECT COUNT(*) as count FROM community_foods WHERE hidden = 0 AND food_name LIKE ?`,
      )
      .bind(searchTerm)
      .first();
    total = (countResult as any)?.count || 0;
  } else {
    results = await db
      .prepare(
        `SELECT id, food_name, serving_description, serving_grams, calories, total_fat, cholesterol, sodium, total_carbohydrate, sugars, protein, submitted_by, servings, created_at
       FROM community_foods
       WHERE hidden = 0
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      )
      .bind(limit, offset)
      .all();

    const countResult = await db
      .prepare(`SELECT COUNT(*) as count FROM community_foods WHERE hidden = 0`)
      .first();
    total = (countResult as any)?.count || 0;
  }

  const parseServings = (row: any): ICustomFoodServing[] | undefined => {
    if (row.servings) {
      try {
        const parsed = JSON.parse(row.servings);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return undefined;
  };

  const foods = (results.results || []).map((row: any) => ({
    id: row.id,
    foodName: row.food_name,
    servings: parseServings(row),
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
  }));

  return {
    foods,
    total,
    limit,
    offset,
  };
});
