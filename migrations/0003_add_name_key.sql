-- Adds the normalized duplicate key for community food names.
--
-- Nullable on purpose: existing rows are backfilled by
-- scripts/backfill-name-key.ts before 0004 adds the unique index. The key is
-- computed in JavaScript by shared/utils/food-name.ts, not in SQL, because
-- SQLite's lower() is ASCII-only.
ALTER TABLE community_foods ADD COLUMN name_key TEXT;
