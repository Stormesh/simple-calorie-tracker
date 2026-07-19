const FLAG_THRESHOLD = 3;

interface IFlagBody {
  foodId: string;
  reason?: string;
}

// Track per-IP per-food flags to prevent abuse
const flaggedIps = new Map<string, number>();

export default defineEventHandler(async (event) => {
  const body = await readBody<IFlagBody>(event);

  if (!body?.foodId) {
    throw createError({ statusCode: 400, statusMessage: "foodId is required" });
  }

  const ip = getRateLimitIp(event);
  const flagKey = `${ip}:${body.foodId}`;
  const now = Date.now();

  // Cleanup old entries (older than 24h)
  for (const [key, timestamp] of flaggedIps) {
    if (timestamp < now - 86400000) flaggedIps.delete(key);
  }

  if (flaggedIps.has(flagKey)) {
    throw createError({
      statusCode: 429,
      statusMessage: "You have already flagged this food",
    });
  }

  const db = getDb(event);
  if (!db) {
    throw createError({
      statusCode: 503,
      statusMessage: "Database not available",
    });
  }

  const food = await db
    .prepare(`SELECT flags FROM community_foods WHERE id = ?`)
    .bind(body.foodId)
    .first();
  if (!food) {
    throw createError({ statusCode: 404, statusMessage: "Food not found" });
  }

  const currentFlags = Number(food.flags);
  const newFlags = currentFlags + 1;

  if (newFlags >= FLAG_THRESHOLD) {
    await db
      .prepare(`UPDATE community_foods SET flags = ?, hidden = 1 WHERE id = ?`)
      .bind(newFlags, body.foodId)
      .run();
  } else {
    await db
      .prepare(`UPDATE community_foods SET flags = ? WHERE id = ?`)
      .bind(newFlags, body.foodId)
      .run();
  }

  flaggedIps.set(flagKey, now);

  return {
    success: true,
    flags: newFlags,
    hidden: newFlags >= FLAG_THRESHOLD,
  };
});
