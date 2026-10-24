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

  // Clears the severity counter. The flag ledger is deliberately left in place:
  // the reporters who already voted stay on record, so approving an entry does
  // not hand them a fresh vote to hide it again.
  await db
    .prepare(`UPDATE community_foods SET flags = 0, hidden = 0 WHERE id = ?`)
    .bind(body.foodId)
    .run();

  return { success: true };
});
