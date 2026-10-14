import type { IDayLog } from "~/composables/day-logs";

export const STORAGE_PREFIX = "maxhp-day-log:";
export const ALL_KEY = `${STORAGE_PREFIX}all`;

// Non-date keys older builds left behind under our prefix — safe to drop
// once the legacy migration has run.
export const LEGACY_FLAG_KEYS = new Set([
  `${STORAGE_PREFIX}format-v2`,
  `${STORAGE_PREFIX}migrated`,
]);

export function logHasContent(log: IDayLog): boolean {
  if (log.weightLog != null) return true;
  return Object.values(log.foods).some((foods) => foods.some((f) => f.foodName));
}

// `raw` is the raw localStorage value (already read by the caller) so this
// stays free of browser APIs and is trivially unit-testable. Returns null for
// anything that doesn't look like a day log.
export function parseLegacyDayLog(raw: string | null, key: string, date: string): IDayLog | null {
  try {
    const parsed = JSON.parse(raw ?? "null") as Partial<IDayLog> | null;
    if (
      !parsed ||
      typeof parsed.date !== "string" ||
      typeof parsed.foods !== "object" ||
      !parsed.foods
    ) {
      console.error("Skipping unrecognized legacy day log:", key);
      return null;
    }
    // The `date` field must match the key — charts match days on it.
    // `foods` is restated explicitly: a Partial spread would keep it optional.
    return {
      ...parsed,
      foods: parsed.foods,
      date,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch (e) {
    console.error("Failed to migrate day log entry:", e);
    return null;
  }
}

export interface ILegacyEntry {
  key: string;
  raw: string | null;
}

export interface IMergeResult {
  merged: Record<string, IDayLog>;
  changed: boolean;
  staleKeys: string[];
}

// Fold legacy per-date keys (`maxhp-day-log:YYYY-MM-DD`) into the single
// `maxhp-day-log:all` record. Idempotent: it only fills days the current
// record doesn't meaningfully cover yet, then reports the legacy keys as
// stale so the caller can drop them (the original migration never deleted
// them, and skipped them entirely whenever `all` already had data —
// permanently orphaning old history).
export function mergeLegacyDayLogs(
  current: Record<string, IDayLog>,
  legacyEntries: ILegacyEntry[],
): IMergeResult {
  const merged = { ...current };
  const staleKeys: string[] = [];
  let changed = false;

  for (const { key, raw } of legacyEntries) {
    if (!key.startsWith(STORAGE_PREFIX) || key === ALL_KEY) continue;

    const date = key.slice(STORAGE_PREFIX.length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      if (LEGACY_FLAG_KEYS.has(key)) staleKeys.push(key);
      continue;
    }

    const existing = merged[date];
    if (existing && logHasContent(existing)) {
      // The current record has real data for this day — it has been
      // maintained since it was written, so the legacy entry is stale.
      staleKeys.push(key);
      continue;
    }

    const legacy = parseLegacyDayLog(raw, key, date);
    if (!legacy) continue; // unrecognised/corrupt: leave it untouched

    // Current record is missing or an empty stub (older builds created
    // those for days with only a weight entry) — legacy wins.
    if (logHasContent(legacy)) {
      merged[date] = legacy;
      changed = true;
    }
    staleKeys.push(key);
  }

  return { merged, changed, staleKeys };
}
