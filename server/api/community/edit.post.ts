export default defineEventHandler(async (event) => {
  requireModerator(event);

  const body = await readBody<ICommunityEditBody>(event);
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

  const plan = planCommunityEdit(body);
  if (!plan.ok) {
    throw createError({ statusCode: 400, statusMessage: plan.message });
  }

  const { assignments, values } = plan;

  if (body.foodName !== undefined) {
    const foodName = body.foodName.trim();
    if (!foodName) {
      throw createError({ statusCode: 400, statusMessage: "Food name cannot be empty" });
    }
    if (containsBlockedTerm(foodName)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Food name contains inappropriate language",
      });
    }

    const nameKey = normalizeFoodName(foodName);

    // The unique index is the real guard; this lookup only turns a constraint
    // failure into a message naming the entry that already claims the name.
    const clash = await db
      .prepare(`SELECT id FROM community_foods WHERE name_key = ? AND id <> ?`)
      .bind(nameKey, body.foodId)
      .first<{ id: string }>();

    if (clash) {
      throw createError({
        statusCode: 409,
        statusMessage: "Another community food already uses that name",
        data: { foodId: clash.id, foodName },
      });
    }

    assignments.push("food_name = ?", "name_key = ?");
    values.push(foodName, nameKey);
  }

  if (assignments.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No editable fields were provided" });
  }

  // Editing is the moderator's "this entry is now correct" action, so it clears
  // the severity counter and unhides in the same write.
  assignments.push("flags = 0", "hidden = 0");

  const result = await db
    .prepare(`UPDATE community_foods SET ${assignments.join(", ")} WHERE id = ?`)
    .bind(...values, body.foodId)
    .run();

  if (result.meta.changes === 0) {
    throw createError({ statusCode: 404, statusMessage: "Food not found" });
  }

  return { success: true };
});
