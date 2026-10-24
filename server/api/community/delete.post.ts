export default defineEventHandler(async (event) => {
  requireModerator(event);

  const body = await readBody<{ foodId: string }>(event);
  if (!body?.foodId) {
    throw createError({ statusCode: 400, statusMessage: "foodId is required" });
  }

  const db = getDb(event);
  if (!db) {
    throw createError({
      statusCode: 503,
      statusMessage: "Database not available",
    });
  }

  // Flag rows follow the food via ON DELETE CASCADE on
  // community_food_flags.food_id, so the ledger cannot outlive its entry.
  await db.prepare(`DELETE FROM community_foods WHERE id = ?`).bind(body.foodId).run();

  return { success: true };
});
