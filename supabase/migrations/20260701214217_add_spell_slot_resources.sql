-- 遷移: add_spell_slot_resources
-- 創建時間: 2026-07-01 21:42:17
-- 目的：支援全施法者職業依等級自動計算法術位（1~9環），並讓使用者手動調整值
-- （例如裝備/能力額外給予的法術位）在升級後仍以「加值」形式保留。

-- character_combat_actions 新增 basic/bonus 欄位，沿用專案既有的 basic+bonus=final 慣例：
-- max_uses_basic 為依等級查表算出的自動值，max_uses_bonus 為使用者手動加值（升級不會被覆蓋），
-- max_uses（既有欄位）維持等於 basic+bonus，供既有讀取邏輯直接使用不需改動。
ALTER TABLE character_combat_actions ADD COLUMN IF NOT EXISTS max_uses_basic INTEGER;
ALTER TABLE character_combat_actions ADD COLUMN IF NOT EXISTS max_uses_bonus INTEGER NOT NULL DEFAULT 0;

-- default_combat_actions 新增 spell_level，標記「法術位」範本列（1~9），供同步邏輯辨識，
-- 其餘既有的動作/附贈動作/反應範本維持 NULL。
ALTER TABLE default_combat_actions ADD COLUMN IF NOT EXISTS spell_level SMALLINT;

-- 種子 9 個法術位範本（職業資源類別，長休恢復）。max_uses 僅為範本佔位值，
-- 實際每個角色的數值由 max_uses_basic/max_uses_bonus 覆寫版本決定。
INSERT INTO default_combat_actions (category, name, icon, max_uses, recovery_type, spell_level) VALUES
  ('resource', '1環法術位', '🔮', 0, 'long_rest', 1),
  ('resource', '2環法術位', '🔮', 0, 'long_rest', 2),
  ('resource', '3環法術位', '🔮', 0, 'long_rest', 3),
  ('resource', '4環法術位', '🔮', 0, 'long_rest', 4),
  ('resource', '5環法術位', '🔮', 0, 'long_rest', 5),
  ('resource', '6環法術位', '🔮', 0, 'long_rest', 6),
  ('resource', '7環法術位', '🔮', 0, 'long_rest', 7),
  ('resource', '8環法術位', '🔮', 0, 'long_rest', 8),
  ('resource', '9環法術位', '🔮', 0, 'long_rest', 9);
