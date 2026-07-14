-- 遷移: add favorite and sort order to items, widen abilities sort order
-- 創建時間: 2026-07-14 01:33:59
--
-- 道具收藏（★列表）與拖曳排序：
-- - is_favorite：是否已加入★列表
-- - sort_order：跨所有分類篩選畫面共用同一份順序（浮點數，供插入排序切半使用，見 utils/fractionalOrder.ts）
--
-- character_abilities.sort_order 原本是 INTEGER（依索引依序寫入 0,1,2...），
-- 拖曳排序改為共用的插入排序（切半）演算法後需要能存小數，故一併放寬為 DOUBLE PRECISION。

ALTER TABLE character_items
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order DOUBLE PRECISION DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_character_items_sort_order
  ON character_items(character_id, sort_order);

ALTER TABLE character_abilities
  ALTER COLUMN sort_order TYPE DOUBLE PRECISION;
