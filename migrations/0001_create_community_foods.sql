CREATE TABLE IF NOT EXISTS community_foods (
  id TEXT PRIMARY KEY,
  food_name TEXT NOT NULL,
  serving_description TEXT NOT NULL DEFAULT '100g',
  serving_grams REAL NOT NULL DEFAULT 100,
  calories REAL NOT NULL DEFAULT 0,
  total_fat REAL NOT NULL DEFAULT 0,
  cholesterol REAL NOT NULL DEFAULT 0,
  sodium REAL NOT NULL DEFAULT 0,
  total_carbohydrate REAL NOT NULL DEFAULT 0,
  sugars REAL NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  submitted_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  flags INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_community_foods_name ON community_foods(food_name);
CREATE INDEX IF NOT EXISTS idx_community_foods_hidden ON community_foods(hidden);
