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

interface ICommunitySubmitBody {
  foodName: string;
  servings?: ICustomFoodServing[];
  servingDescription?: string;
  servingGrams?: number;
  calories?: number;
  totalFat?: number;
  cholesterol?: number;
  sodium?: number;
  totalCarbohydrate?: number;
  sugars?: number;
  protein?: number;
  nickname?: string;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ICommunitySubmitBody>(event);

  if (!body || !body.foodName?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Food name is required",
    });
  }

  if (body.servings) {
    if (!Array.isArray(body.servings) || body.servings.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "At least one serving is required",
      });
    }
    for (const s of body.servings) {
      if (s.servingGrams <= 0) {
        throw createError({
          statusCode: 400,
          statusMessage: "Serving grams must be greater than 0",
        });
      }
    }
  } else if (!body.servingGrams || body.servingGrams <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Serving grams must be greater than 0",
    });
  }

  if (containsBlockedTerm(body.foodName)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Food name contains inappropriate language",
    });
  }

  const ip = getRateLimitIp(event);
  const limit = peekRateLimit(ip, SUBMISSION_POLICIES);
  if (!limit.allowed) {
    throwRateLimited(event, limit);
  }

  const db = getDb(event);
  if (!db) {
    throw createError({
      statusCode: 503,
      statusMessage: "Database not available",
    });
  }

  const id = `community-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const nameKey = normalizeFoodName(body.foodName);

  const servingsJson = body.servings ? JSON.stringify(body.servings) : null;
  const firstServing = body.servings?.[0];

  const insert = await db
    .prepare(
      `INSERT INTO community_foods (id, food_name, name_key, serving_description, serving_grams, calories, total_fat, cholesterol, sodium, total_carbohydrate, sugars, protein, submitted_by, servings, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name_key) DO NOTHING`,
    )
    .bind(
      id,
      body.foodName.trim(),
      nameKey,
      firstServing
        ? firstServing.servingDescription || "serving"
        : body.servingDescription || "100g",
      firstServing ? firstServing.servingGrams : body.servingGrams,
      firstServing ? firstServing.calories : body.calories || 0,
      firstServing ? firstServing.totalFat : body.totalFat || 0,
      firstServing ? firstServing.cholesterol : body.cholesterol || 0,
      firstServing ? firstServing.sodium : body.sodium || 0,
      firstServing ? firstServing.totalCarbohydrate : body.totalCarbohydrate || 0,
      firstServing ? firstServing.sugars : body.sugars || 0,
      firstServing ? firstServing.protein : body.protein || 0,
      body.nickname || null,
      servingsJson,
      now,
    )
    .run();

  // The unique index is what actually blocks duplicates; this branch only
  // reports it. A rejection spends no quota, since nothing was stored.
  if (insert.meta.changes === 0) {
    const existing = await db
      .prepare(`SELECT id FROM community_foods WHERE name_key = ?`)
      .bind(nameKey)
      .first<{ id: string }>();

    throw createError({
      statusCode: 409,
      statusMessage: "Food already exists in the community database",
      data: { foodId: existing?.id ?? null, foodName: body.foodName.trim() },
    });
  }

  // Only accepted submissions spend quota, so a database outage or a failed
  // insert does not cost the submitter a slot.
  consumeRateLimit(ip, SUBMISSION_POLICIES);

  return {
    success: true,
    id,
    remaining: Math.max(0, limit.remaining - 1),
    message: "Food submitted successfully",
  };
});
