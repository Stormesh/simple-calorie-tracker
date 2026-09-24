/**
 * Theme registry. Every preset redefines the `gaming-*` color scale from
 * `app/assets/css/app.css` via an unlayered `[data-theme="…"]` block, so
 * switching the attribute re-skins the whole app without touching components.
 * `custom` derives its scale from `--custom-accent` instead (color-mix).
 */
export type ThemeId =
  "crimson" | "emerald" | "ocean" | "violet" | "gold" | "rose" | "mono" | "custom";

export interface ITheme {
  id: ThemeId;
  label: string;
  /** Gradient stops shown in the picker swatch (light → dark of the scale). */
  swatches: [string, string, string];
}

export const DEFAULT_THEME: ThemeId = "crimson";
export const DEFAULT_ACCENT = "#ef4444";

/** Raw cookie values arrive as strings — validate before trusting them. */
export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const THEME_IDS: readonly string[] = [
  "crimson",
  "emerald",
  "ocean",
  "violet",
  "gold",
  "rose",
  "mono",
  "custom",
];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_IDS.includes(value);
}

export function sanitizeTheme(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

export function sanitizeAccent(value: unknown): string {
  return typeof value === "string" && HEX_COLOR_RE.test(value) ? value : DEFAULT_ACCENT;
}

export const themes: ITheme[] = [
  { id: "crimson", label: "Crimson", swatches: ["#fca5a5", "#ef4444", "#b91c1c"] },
  { id: "emerald", label: "Emerald", swatches: ["#6ee7b7", "#10b981", "#047857"] },
  { id: "ocean", label: "Ocean", swatches: ["#7dd3fc", "#0ea5e9", "#0369a1"] },
  { id: "violet", label: "Violet", swatches: ["#c4b5fd", "#8b5cf6", "#6d28d9"] },
  { id: "gold", label: "Gold", swatches: ["#fcd34d", "#f59e0b", "#b45309"] },
  { id: "rose", label: "Rose", swatches: ["#f9a8d4", "#ec4899", "#be185d"] },
  { id: "mono", label: "Mono", swatches: ["#d4d4d8", "#71717a", "#3f3f46"] },
];
