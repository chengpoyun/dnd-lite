-- 遷移: add_stat_bonuses_to_character_abilities_and_character_items
-- 說明:
-- character_abilities 與 character_items 新增 affects_stats、stat_bonuses，
-- 與 abilities / global_items 對齊，可供未來「角色專屬覆寫」使用。
-- 若未覆寫，應用層仍可只讀取 abilities / global_items 的欄位。

-- ===== character_abilities =====
ALTER TABLE character_abilities
  ADD COLUMN IF NOT EXISTS affects_stats BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stat_bonuses JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_character_abilities_affects_stats ON character_abilities(affects_stats);

-- ===== character_items =====
ALTER TABLE character_items
  ADD COLUMN IF NOT EXISTS affects_stats BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stat_bonuses JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_character_items_affects_stats ON character_items(affects_stats);
