#!/usr/bin/env node
/**
 * One-off backfill of `community_foods.name_key`.
 *
 * Run between migration 0003 (adds the nullable column) and 0004 (adds the
 * unique index). Duplicates and gaps must be resolved here, because 0004 aborts
 * while any row still lacks a key and would otherwise fail on duplicate keys.
 *
 * The key is computed by `shared/utils/food-name.ts`, never in SQL, so the
 * backfilled values are byte-identical to what new submissions produce.
 *
 *   pnpm exec tsx scripts/backfill-name-key.ts                 # inspect local D1
 *   pnpm exec tsx scripts/backfill-name-key.ts --remote        # inspect production
 *   pnpm exec tsx scripts/backfill-name-key.ts --remote --apply
 *
 * Dry-run is the default: nothing is written without `--apply`. Take a D1
 * export before applying against production.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeFoodName } from "../shared/utils/food-name";

const DATABASE = "maxhp-community";
/** Resolved from the script's own location so it works from any directory. */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export interface INameKeyRow {
  id: string;
  food_name: string;
  name_key: string | null;
  flags: number;
  hidden: number;
  created_at: string;
}

export interface IBackfillPlan {
  /** Surviving rows whose stored key is missing or wrong. */
  updates: Array<{ id: string; nameKey: string }>;
  /** Surviving row per duplicated name, plus the rows that must go. */
  duplicates: Array<{ nameKey: string; survivorId: string; removedIds: string[] }>;
  /** Moderation state merged upward onto each survivor. */
  merges: Array<{ id: string; flags: number; hidden: number }>;
}

/**
 * Decide what the backfill should do, without touching the database.
 *
 * Survivors are chosen by earliest `created_at` (ties broken by id) so repeated
 * runs agree on the same row. Flags and hidden state from the rows being
 * removed are merged upward, so no moderation work is silently discarded.
 */
export const planNameKeyBackfill = (rows: readonly INameKeyRow[]): IBackfillPlan => {
  const groups = new Map<string, INameKeyRow[]>();

  for (const row of rows) {
    const nameKey = normalizeFoodName(row.food_name);
    const group = groups.get(nameKey);
    if (group) group.push(row);
    else groups.set(nameKey, [row]);
  }

  const updates: IBackfillPlan["updates"] = [];
  const duplicates: IBackfillPlan["duplicates"] = [];
  const merges: IBackfillPlan["merges"] = [];

  for (const [nameKey, group] of groups) {
    const ordered = [...group].sort(
      (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
    );
    const [survivor, ...removed] = ordered;

    if (removed.length > 0) {
      duplicates.push({
        nameKey,
        survivorId: survivor!.id,
        removedIds: removed.map((row) => row.id),
      });

      const flags = Math.max(...ordered.map((row) => row.flags));
      const hidden = ordered.some((row) => row.hidden === 1) ? 1 : 0;
      if (flags !== survivor!.flags || hidden !== survivor!.hidden) {
        merges.push({ id: survivor!.id, flags, hidden });
      }
    }

    // Only survivors get a key written; the rest are deleted instead.
    if (survivor!.name_key !== nameKey) {
      updates.push({ id: survivor!.id, nameKey });
    }
  }

  return { updates, duplicates, merges };
};

const sqlLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/**
 * Statements are ordered merges → deletes → updates so the script is safe to
 * re-run, including after the unique index exists: duplicates are gone before
 * any key is written.
 */
export const planToStatements = (plan: IBackfillPlan): string[] => [
  ...plan.merges.map(
    (merge) =>
      `UPDATE community_foods SET flags = ${merge.flags}, hidden = ${merge.hidden} WHERE id = ${sqlLiteral(merge.id)};`,
  ),
  ...plan.duplicates.map(
    (group) =>
      `DELETE FROM community_foods WHERE id IN (${group.removedIds.map(sqlLiteral).join(", ")});`,
  ),
  ...plan.updates.map(
    (update) =>
      `UPDATE community_foods SET name_key = ${sqlLiteral(update.nameKey)} WHERE id = ${sqlLiteral(update.id)};`,
  ),
];

const wrangler = (args: string[]): string =>
  execFileSync(
    join(REPO_ROOT, "node_modules", ".bin", "wrangler"),
    ["d1", "execute", DATABASE, ...args],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );

const fetchRows = (target: string): INameKeyRow[] => {
  const stdout = wrangler([
    target,
    "--json",
    "--command",
    "SELECT id, food_name, name_key, flags, hidden, created_at FROM community_foods",
  ]);

  const parsed = JSON.parse(stdout) as unknown;
  const entries = Array.isArray(parsed) ? parsed : [];

  // wrangler --json returns [{ results: [...], success: true, meta: {...} }].
  return entries.flatMap((entry) =>
    Array.isArray((entry as { results?: unknown }).results)
      ? ((entry as { results: INameKeyRow[] }).results ?? [])
      : [],
  );
};

const applyStatements = (target: string, statements: string[]): void => {
  const file = join(tmpdir(), `name-key-backfill-${Date.now()}.sql`);
  writeFileSync(file, `${statements.join("\n")}\n`);
  wrangler([target, `--file=${file}`]);
};

const main = (): void => {
  const args = process.argv.slice(2);
  const target = args.includes("--remote") ? "--remote" : "--local";
  const apply = args.includes("--apply");

  const rows = fetchRows(target);
  const plan = planNameKeyBackfill(rows);
  const statements = planToStatements(plan);

  console.log(`Target: ${target}`);
  console.log(`Rows scanned: ${rows.length}`);
  console.log(`Keys to write: ${plan.updates.length}`);
  console.log(`Duplicate groups: ${plan.duplicates.length}`);

  for (const group of plan.duplicates) {
    console.log(
      `  "${group.nameKey}" — keeping ${group.survivorId}, removing ${group.removedIds.length} duplicate(s)`,
    );
  }

  if (statements.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  if (!apply) {
    console.log(`\nDry run. ${statements.length} statement(s) would run:\n`);
    console.log(statements.join("\n"));
    console.log("\nRe-run with --apply to write.");
    return;
  }

  if (target === "--remote") {
    console.warn(`\nApplying ${statements.length} statement(s) to PRODUCTION.`);
  }
  applyStatements(target, statements);
  console.log(`Applied ${statements.length} statement(s).`);
};

// Only run when invoked as a script, never when the pure helpers are imported
// by the spec file.
const invokedAsScript = /backfill-name-key\.ts$/.test(process.argv[1] ?? "");
if (invokedAsScript) {
  main();
}
