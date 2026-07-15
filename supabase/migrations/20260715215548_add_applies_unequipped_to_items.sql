-- 遷移: add applies_unequipped to items
-- 創建時間: 2026-07-15 21:55:48
--
-- 裝備類物品預設「需裝備中才生效」；此欄位為 true 時，即使未裝備、放在背包裡也套用其加值
-- （非裝備類物品本來就不受此限制，此欄位對它們無意義，聚合邏輯只在裝備類時才會檢查）

ALTER TABLE global_items
  ADD COLUMN IF NOT EXISTS applies_unequipped BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE character_items
  ADD COLUMN IF NOT EXISTS applies_unequipped BOOLEAN NOT NULL DEFAULT false;
