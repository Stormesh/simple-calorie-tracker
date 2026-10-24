-- Enforces "every community food has a normalized key" at the schema level.
--
-- The unique index on name_key is not enough on its own: SQLite treats NULLs as
-- distinct, so an insert that omits the key is legal, never collides with a
-- duplicate, and is invisible to search — which matches on name_key rather than
-- food_name. A row like that is indistinguishable from a deleted entry to every
-- reader, and nothing short of a manual query would find it.
--
-- Both app paths that write a name (submit and moderator edit) always compute
-- the key, so these triggers only ever fire when a caller bypasses the app.
-- Backfilling is unaffected: it only ever UPDATEs name_key to a real value.
--
-- The UPDATE trigger is scoped to the name_key column so flag updates (which
-- touch only flags/hidden) do not pay for the check.
CREATE TRIGGER IF NOT EXISTS community_foods_name_key_required_insert
BEFORE INSERT ON community_foods
FOR EACH ROW
WHEN NEW.name_key IS NULL OR NEW.name_key = ''
BEGIN
  SELECT RAISE(ABORT, 'community_foods.name_key is required');
END;

CREATE TRIGGER IF NOT EXISTS community_foods_name_key_required_update
BEFORE UPDATE OF name_key ON community_foods
FOR EACH ROW
WHEN NEW.name_key IS NULL OR NEW.name_key = ''
BEGIN
  SELECT RAISE(ABORT, 'community_foods.name_key is required');
END;
