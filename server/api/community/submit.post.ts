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
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: `Rate limit exceeded. Try again later.`,
    });
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

  const servingsJson = body.servings ? JSON.stringify(body.servings) : null;
  const firstServing = body.servings?.[0];

  await db
    .prepare(
      `INSERT INTO community_foods (id, food_name, serving_description, serving_grams, calories, total_fat, cholesterol, sodium, total_carbohydrate, sugars, protein, submitted_by, servings, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      body.foodName.trim(),
      firstServing
        ? firstServing.servingDescription || "serving"
        : body.servingDescription || "100g",
      firstServing ? firstServing.servingGrams : body.servingGrams,
      firstServing ? firstServing.calories : body.calories || 0,
      firstServing ? firstServing.totalFat : body.totalFat || 0,
      firstServing ? firstServing.cholesterol : body.cholesterol || 0,
      firstServing ? firstServing.sodium : body.sodium || 0,
      firstServing
        ? firstServing.totalCarbohydrate
        : body.totalCarbohydrate || 0,
      firstServing ? firstServing.sugars : body.sugars || 0,
      firstServing ? firstServing.protein : body.protein || 0,
      body.nickname || null,
      servingsJson,
      now,
    )
    .run();

  return {
    success: true,
    id,
    remaining: rateCheck.remaining,
    message: "Food submitted successfully",
  };
});
