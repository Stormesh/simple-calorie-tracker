export default defineEventHandler(async (event) => {
  const token = getHeader(event, "moderator-token") || getHeader(event, "Moderator-Token");
  const config = useRuntimeConfig(event);
  const moderatorSecret = config.moderatorSecret as string;

  if (!moderatorSecret || token !== moderatorSecret) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

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

  await db
    .prepare(`UPDATE community_foods SET flags = 0, hidden = 0 WHERE id = ?`)
    .bind(body.foodId)
    .run();

  return { success: true };
});
