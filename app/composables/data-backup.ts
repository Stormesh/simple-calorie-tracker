import { loadAllDayLogs, replaceAllDayLogs } from "./day-logs";
import { useMealFoods } from "./meal-foods";
import { useBmr } from "./bmr-state";
import { useCustomFoods } from "./custom-foods";
import { usePlayerProfile } from "./settings-panel";
import { useTheme } from "./use-theme";
import { foodsList } from "~/utils/meals";
import { cloneFoods } from "~/utils/meal-migration";
import {
  buildBackup,
  mergeDayLogs,
  parseBackup,
  summarizeBackup,
  type IBackupSummary,
} from "~/utils/backup";

/**
 * Whole-app backup and restore.
 *
 * This is also the web→APK transfer path: the phone's WebView has its own
 * storage, so "export here, import there" is how a browser user keeps their
 * history when they install the app.
 *
 * Delivery is tiered because the three environments differ:
 *  - a share sheet when the browser exposes one (Android Chrome, iOS Safari),
 *  - an anchor download on desktop,
 *  - the clipboard inside a Capacitor WebView, where `navigator.canShare` does
 *    not exist and `<a download>` silently does nothing.
 * Import is one path: `<input type="file">`, which Capacitor's WebView already
 * routes to the Android document picker.
 */

export const BACKUP_MIME = "application/json";

const timestampedName = (): string => `maxhp-backup-${new Date().toISOString().slice(0, 10)}.json`;

export type BackupDelivery = "shared" | "downloaded" | "copied";

/**
 * Capacitor injects a global into the WebView. Checked structurally so this
 * module never has to import `@capacitor/core` (which would then be pulled into
 * the SSR bundle just to ask a browser question).
 */
const isNativeShell = (): boolean => {
  const shell = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return shell?.isNativePlatform?.() === true;
};

/**
 * Hand the file to the platform. Returns how it left, so the caller can say so
 * instead of claiming success for a download a WebView never performed.
 */
const deliver = async (json: string, filename: string): Promise<BackupDelivery> => {
  const file = new File([json], filename, { type: BACKUP_MIME });

  // Android Chrome and iOS Safari expose a share sheet (Save to Files, Drive,
  // mail…); Capacitor's WebView does not.
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return "shared";
  }

  // WebView: no share sheet and no download manager, so `<a download>` would
  // silently do nothing. The clipboard is the one channel that reaches the user
  // intact — paste it into a note or into the app on the other device.
  if (isNativeShell()) {
    await navigator.clipboard.writeText(json);
    return "copied";
  }

  const url = URL.createObjectURL(new Blob([json], { type: BACKUP_MIME }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return "downloaded";
};

export interface IBackupExportResult {
  ok: boolean;
  delivery?: BackupDelivery;
  summary?: IBackupSummary;
  message?: string;
}

export interface IBackupImportResult {
  ok: boolean;
  summary?: IBackupSummary;
  message?: string;
}

export const useDataBackup = () => {
  const exportBackup = async (): Promise<IBackupExportResult> => {
    const meals: Record<string, IFoodTemplate[]> = {};
    foodsList.forEach((meal) => {
      meals[meal] = cloneFoods(useMealFoods(meal).value);
    });

    const { theme, accent } = useTheme();
    const doc = buildBackup({
      dayLogs: loadAllDayLogs(),
      meals,
      customFoods: useCustomFoods().foods.value,
      profile: { bmr: { ...useBmr().value }, playerName: usePlayerProfile().name.value },
      theme: { theme: theme.value, accent: accent.value },
    });

    const json = JSON.stringify(doc, null, 2);

    try {
      const delivery = await deliver(json, timestampedName());
      return { ok: true, delivery, summary: summarizeBackup(doc) };
    } catch (e) {
      // A dismissed share sheet throws AbortError — not worth an error toast.
      const aborted = e instanceof Error && e.name === "AbortError";
      return { ok: false, message: aborted ? "Export cancelled." : "Could not save the backup." };
    }
  };

  const importBackup = (raw: string): IBackupImportResult => {
    const parsed = parseBackup(raw);
    if (!parsed.ok) return { ok: false, message: parsed.error };

    const { sections } = parsed;

    // Days merge by date (never a replace: re-importing an old file must not
    // delete days logged since). Everything else is a restore of the file.
    replaceAllDayLogs(mergeDayLogs(loadAllDayLogs(), sections.dayLogs));

    foodsList.forEach((meal) => {
      const foods = sections.meals[meal];
      if (foods) useMealFoods(meal).value = cloneFoods(foods);
    });

    if (sections.customFoods.length > 0) {
      // Reuses the library's own dedupe (by name) and id regeneration.
      useCustomFoods().importFromJson(
        JSON.stringify({
          version: 1,
          exportedAt: new Date().toISOString(),
          foods: sections.customFoods,
        }),
      );
    }

    if (sections.profile.bmr) {
      useBmr().value = { ...useBmr().value, ...sections.profile.bmr };
    }
    if (sections.profile.playerName !== undefined) {
      usePlayerProfile().name.value = sections.profile.playerName;
    }
    const { setTheme, setAccent } = useTheme();
    if (sections.theme.theme) setTheme(sections.theme.theme as ThemeId);
    if (sections.theme.accent) setAccent(sections.theme.accent);

    return { ok: true, summary: summarizeBackup(sections) };
  };

  return { exportBackup, importBackup };
};
