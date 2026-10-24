-- Durable per-reporter flag dedupe.
--
-- Replaces the per-isolate in-memory Map in flag.post.ts, which let one actor
-- flag the same food over and over across isolates and cold starts. The primary
-- key is the dedupe rule: one row per (food, reporter), so a repeat flag is a
-- no-op instead of another vote.
--
-- The ledger is deliberately never pruned. `community_foods.flags` is the
-- moderator-facing severity counter and is what `approve`/`edit` reset; keeping
-- the ledger means reporters who already voted cannot vote again after a reset,
-- which closes the "hide it, get approved, hide it again" loop.
CREATE TABLE IF NOT EXISTS community_food_flags (
  food_id TEXT NOT NULL REFERENCES community_foods(id) ON DELETE CASCADE,
  -- SHA-256 of the reporter's address: equality is all this needs, and hashing
  -- keeps raw IPs out of the database. See server/utils/ip-hash.ts.
  ip_hash TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (food_id, ip_hash)
);
