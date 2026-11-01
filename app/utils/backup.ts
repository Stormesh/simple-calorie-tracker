import type { ICustomFood } from "#shared/utils/food";
import type { IDayLog } from "~/composables/day-logs";
import type { IBmrForm } from "~/composables/bmr-state";
import type { IFoodTemplate } from "./food-types";

/**
 * Backup file format.
 *
 * Everything the app stores is on this device — cookies for small settings,
 * localStorage for days, meals and custom foods — so clearing site data (or
 * moving from the browser to the APK) loses it. This is the portable copy: one
 * JSON file with every user-visible piece of state.
 *
 * The writing and the validation live here, pure and unit-tested; the caller
 * (`app/composables/data-backup.ts`) owns localStorage, cookies and the
 * download/share sheet.
 */

export const BACKUP_APP = "maxhp";
export const BACKUP_VERSION = 1;

export interface IBackupProfile {
  bmr: IBmrForm;
  playerName: string;
}

export interface IBackupTheme {
  theme: string;
  accent: string;
}

export interface IBackupDoc {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  dayLogs: Record<string, IDayLog>;
  meals: Record<string, IFoodTemplate[]>;
  customFoods: ICustomFood[];
  profile: IBackupProfile;
  theme: IBackupTheme;
}

export interface IBackupInput {
  dayLogs: Record<string, IDayLog>;
  meals: Record<string, IFoodTemplate[]>;
  customFoods: ICustomFood[];
  profile: IBackupProfile;
  theme: IBackupTheme;
  exportedAt?: string;
}

/** A parsed backup, with everything optional except the days. */
export interface IBackupSections {
  dayLogs: Record<string, IDayLog>;
  meals: Record<string, IFoodTemplate[]>;
  customFoods: ICustomFood[];
  profile: Partial<IBackupProfile>;
  theme: Partial<IBackupTheme>;
}

export type IBackupParseResult =
  { ok: true; sections: IBackupSections } | { ok: false; error: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFood = (value: unknown): value is IFoodTemplate =>
  isObject(value) && typeof value.foodName === "string";

const isCustomFood = (value: unknown): value is ICustomFood =>
  isObject(value) && typeof value.foodName === "string" && typeof value.calories === "number";

const isDayLog = (value: unknown): value is IDayLog =>
  isObject(value) && typeof value.date === "string" && isObject(value.foods);

export const buildBackup = ({
  dayLogs,
  meals,
  customFoods,
  profile,
  theme,
  exportedAt,
}: IBackupInput): IBackupDoc => ({
  app: BACKUP_APP,
  version: BACKUP_VERSION,
  exportedAt: exportedAt ?? new Date().toISOString(),
  dayLogs,
  meals,
  customFoods,
  profile,
  theme,
});

/**
 * Accept a file only if it is one of ours and not from a future version: a
 * newer backup can carry fields this build would drop, and importing it would
 * look like data loss rather than an incompatibility.
 */
export const parseBackup = (raw: string): IBackupParseResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }

  if (!isObject(parsed)) return { ok: false, error: "That file is not a MaxHP backup." };
  if (parsed.app !== BACKUP_APP) return { ok: false, error: "That file is not a MaxHP backup." };

  const version = typeof parsed.version === "number" ? parsed.version : 0;
  if (version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `That backup was made by a newer version (v${version}); this app reads up to v${BACKUP_VERSION}.`,
    };
  }

  const sections: IBackupSections = {
    dayLogs: {},
    meals: {},
    customFoods: [],
    profile: {},
    theme: {},
  };

  if (isObject(parsed.dayLogs)) {
    for (const [date, log] of Object.entries(parsed.dayLogs)) {
      if (!isDayLog(log) || log.date !== date) continue;
      const foods: Record<string, IFoodTemplate[]> = {};
      for (const [meal, list] of Object.entries(log.foods)) {
        if (Array.isArray(list)) foods[meal] = list.filter(isFood);
      }
      sections.dayLogs[date] = {
        ...log,
        foods,
        // A missing timestamp must still compare as "older than anything".
        updatedAt: typeof log.updatedAt === "string" ? log.updatedAt : new Date(0).toISOString(),
      };
    }
  }

  if (isObject(parsed.meals)) {
    for (const [meal, list] of Object.entries(parsed.meals)) {
      if (Array.isArray(list)) sections.meals[meal] = list.filter(isFood);
    }
  }

  if (Array.isArray(parsed.customFoods)) {
    sections.customFoods = parsed.customFoods.filter(isCustomFood);
  }

  if (isObject(parsed.profile)) {
    // Field-level validation would duplicate `useBmr`'s defaults; the form is
    // merged over the current values on import, so unknown keys are inert and
    // missing keys keep what the device already has.
    if (isObject(parsed.profile.bmr))
      sections.profile.bmr = parsed.profile.bmr as unknown as IBmrForm;
    if (typeof parsed.profile.playerName === "string") {
      sections.profile.playerName = parsed.profile.playerName;
    }
  }

  if (isObject(parsed.theme)) {
    if (typeof parsed.theme.theme === "string") sections.theme.theme = parsed.theme.theme;
    if (typeof parsed.theme.accent === "string") sections.theme.accent = parsed.theme.accent;
  }

  return { ok: true, sections };
};

/**
 * Per-date merge, never a replace: re-importing an old backup must not delete
 * days logged since. A date is won by whichever side has the newer `updatedAt`,
 * so the backup restores missing history without overwriting newer edits.
 */
export const mergeDayLogs = (
  existing: Record<string, IDayLog>,
  incoming: Record<string, IDayLog>,
): Record<string, IDayLog> => {
  const merged: Record<string, IDayLog> = { ...existing };

  for (const [date, log] of Object.entries(incoming)) {
    const current = merged[date];
    if (!current || log.updatedAt >= current.updatedAt) {
      merged[date] = log;
    }
  }

  return merged;
};

export interface IBackupSummary {
  days: number;
  foods: number;
  customFoods: number;
}

/** Human-readable size of what was exported or imported, for the toast. */
export const summarizeBackup = (
  sections: Pick<IBackupSections, "dayLogs" | "meals" | "customFoods">,
): IBackupSummary => ({
  days: Object.keys(sections.dayLogs).length,
  foods: Object.values(sections.meals).reduce(
    (total, list) => total + list.filter((food) => food.foodName.trim() !== "").length,
    0,
  ),
  customFoods: sections.customFoods.length,
});
