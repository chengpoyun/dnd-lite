-- 遷移: add_character_abilities_sort_order
-- 說明: 為 character_abilities 新增 sort_order，供角色自訂能力卡顯示順序

ALTER TABLE character_abilities
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_character_abilities_sort_order
  ON character_abilities(character_id, sort_order);
