/**
 * Identity helpers for community food names.
 *
 * `normalizeFoodName` is the single source of truth for the `community_foods.name_key`
 * column. Both the app and `scripts/backfill-name-key.ts` must import it rather
 * than reimplement it — and the key is never computed in SQL, because SQLite's
 * `lower()` is ASCII-only and would key `CAFÉ` and `café` differently, letting
 * duplicates slip past the unique index.
 */

/** Reduce a display name to a comparable key: `"Café  Latte"` gives `"café latte"`. */
export const normalizeFoodName = (name: string): string =>
  name
    // Fold composed and decomposed accents together, e.g. é vs e + U+0301.
    .normalize("NFC")
    .toLowerCase()
    // Zero-width characters let a name look identical while hashing differently.
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Escape SQL LIKE wildcards so a search term matches literally. Pair with
 * `ESCAPE '\'`; otherwise a bare `%` matches every row and `_` matches any
 * single character.
 */
export const escapeLikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, (character) => `\\${character}`);
