-- Enforces one community entry per normalized food name.
--
-- The guard below aborts this migration while any row still lacks a name_key.
-- It exists because SQLite treats NULLs as distinct inside a unique index, so
-- without the check a half-backfilled table would accept duplicates silently
-- instead of failing. Run scripts/backfill-name-key.ts between 0003 and here.
CREATE TABLE _name_key_guard (complete INTEGER NOT NULL CHECK (complete = 1));

INSERT INTO _name_key_guard (complete)
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM community_foods WHERE name_key IS NULL OR name_key = '')
    THEN 0
  ELSE 1
END;

DROP TABLE _name_key_guard;

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_foods_name_key ON community_foods(name_key);
