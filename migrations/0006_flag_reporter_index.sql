-- Index for the per-reporter flag quota.
--
-- flag.post.ts bounds how many entries one reporter can touch in a window by
-- counting that reporter's rows in community_food_flags. The ledger's primary
-- key is (food_id, ip_hash), which cannot serve a lookup by ip_hash alone, so
-- the quota gets its own index. `created_at` comes second so the window filter
-- is answered from the index as well.
CREATE INDEX IF NOT EXISTS idx_community_food_flags_reporter
  ON community_food_flags(ip_hash, created_at);
