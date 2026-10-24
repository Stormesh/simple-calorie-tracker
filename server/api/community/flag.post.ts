import type { D1Database } from "@cloudflare/workers-types";

/** A food is hidden once this many distinct reporters have flagged it. */
const FLAG_THRESHOLD = 5;

/** Room for a sentence of context, while keeping a single row bounded. */
const MAX_REASON_LENGTH = 500;

/**
 * Per-reporter flag quota.
 *
 * Enforced from the flag ledger itself rather than the in-memory limiter: the
 * rows a reporter has already created are the record of what they have spent,
 * so the quota holds across isolates and cold starts. A report only counts once
 * per food, so what this bounds is breadth — how many entries one actor can
 * touch — which is exactly the "walk every entry once" case.
 */
const FLAG_POLICIES: readonly IRateLimitPolicy[] = [
  { name: "flag-hourly", max: 15, windowMs: HOUR_MS },
  { name: "flag-daily", max: 30, windowMs: DAY_MS },
];

interface IFlagBody {
  foodId: string;
  reason?: string;
}

interface IFlagQuotaRow {
  count: number;
  oldestMs: number | null;
}

/**
 * Compare the reporter's recent reports against every window.
 *
 * Windows are matched in SQLite's `datetime('now')` text form, which sorts
 * correctly, and the oldest row inside an exhausted window gives the exact
 * moment a slot frees rather than a worst-case guess.
 */
const checkFlagQuota = async (db: D1Database, ipHash: string): Promise<IRateLimitStatus> => {
  let remaining = Number.POSITIVE_INFINITY;

  for (const policy of FLAG_POLICIES) {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS count,
                CAST(strftime('%s', MIN(created_at)) AS INTEGER) * 1000 AS oldestMs
         FROM community_food_flags
         WHERE ip_hash = ? AND created_at >= datetime('now', ?)`,
      )
      .bind(ipHash, `-${policy.windowMs / 1000} seconds`)
      .first<IFlagQuotaRow>();

    const spent = Number(row?.count ?? 0);
    remaining = Math.min(remaining, Math.max(0, policy.max - spent));

    if (spent >= policy.max) {
      return {
        allowed: false,
        remaining: 0,
        retryAt: Number(row?.oldestMs ?? Date.now()) + policy.windowMs,
      };
    }
  }

  return { allowed: true, remaining, retryAt: Date.now() };
};

export default defineEventHandler(async (event) => {
  const body = await readBody<IFlagBody>(event);

  if (!body?.foodId) {
    throw createError({ statusCode: 400, statusMessage: "foodId is required" });
  }

  // A reason is required: it is the only signal a moderator gets before acting,
  // so a bare click carries no information.
  const reason = body.reason?.trim() ?? "";
  if (!reason) {
    throw createError({ statusCode: 400, statusMessage: "A reason is required" });
  }
  if (reason.length > MAX_REASON_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Reason must be ${MAX_REASON_LENGTH} characters or fewer`,
    });
  }

  const db = getDb(event);
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: "Database not available" });
  }

  const food = await db
    .prepare(`SELECT id FROM community_foods WHERE id = ?`)
    .bind(body.foodId)
    .first();

  if (!food) {
    throw createError({ statusCode: 404, statusMessage: "Food not found" });
  }

  const ipHash = await hashIp(getRateLimitIp(event));

  // Checked before anything is written, so a rejected report stores nothing and
  // spends nothing — the same peek → work → consume shape as submissions.
  const quota = await checkFlagQuota(db, ipHash);
  if (!quota.allowed) {
    throwRateLimited(event, quota);
  }

  // The unique key on (food_id, ip_hash) is what stops repeat voting, and unlike
  // the previous in-memory Map it holds across isolates and cold starts: a second
  // flag from the same reporter inserts nothing.
  const insert = await db
    .prepare(
      `INSERT INTO community_food_flags (food_id, ip_hash, reason)
       VALUES (?, ?, ?)
       ON CONFLICT(food_id, ip_hash) DO NOTHING`,
    )
    .bind(body.foodId, ipHash, reason)
    .run();

  if (insert.meta.changes === 0) {
    throw createError({
      statusCode: 409,
      statusMessage: "You have already flagged this food",
    });
  }

  // One statement, so `flags` and `hidden` cannot disagree when two reporters
  // arrive at once. `hidden` is only ever set here — clearing it is a moderator
  // decision, via approve or edit.
  const flagged = await db
    .prepare(
      `UPDATE community_foods
       SET flags = flags + 1,
           hidden = CASE WHEN flags + 1 >= ? THEN 1 ELSE hidden END
       WHERE id = ?
       RETURNING flags, hidden`,
    )
    .bind(FLAG_THRESHOLD, body.foodId)
    .first<{ flags: number; hidden: number }>();

  const flags = Number(flagged?.flags ?? 1);

  return { success: true, flags, hidden: flags >= FLAG_THRESHOLD };
});
