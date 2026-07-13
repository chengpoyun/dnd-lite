-- 遷移: add decoration slots and sockets to items
-- 創建時間: 2026-07-13 18:12:37
--
-- 魔物獵人風格插槽鑲嵌系統：
-- - decoration_slots：裝備的插槽數（0~5，對應稀有度 常見1/非常見2/稀有3/非常稀有4/傳說5）
-- - weapon_decoration / armor_decoration：MH素材是否可分別鑲入武器/護甲插槽（可同時皆可）
-- - sockets：僅 character_items 有，裝備目前每格插槽鑲嵌的素材快照
--   （鑲嵌時素材本身會被消耗，快照獨立存在，不依賴素材列是否還存在）

ALTER TABLE global_items
  ADD COLUMN IF NOT EXISTS decoration_slots INTEGER,
  ADD COLUMN IF NOT EXISTS weapon_decoration BOOLEAN,
  ADD COLUMN IF NOT EXISTS armor_decoration BOOLEAN;

ALTER TABLE character_items
  ADD COLUMN IF NOT EXISTS decoration_slots INTEGER,
  ADD COLUMN IF NOT EXISTS weapon_decoration BOOLEAN,
  ADD COLUMN IF NOT EXISTS armor_decoration BOOLEAN,
  ADD COLUMN IF NOT EXISTS sockets JSONB DEFAULT '[]'::jsonb;

ALTER TABLE global_items
  ADD CONSTRAINT global_items_decoration_slots_range
  CHECK (decoration_slots IS NULL OR (decoration_slots >= 0 AND decoration_slots <= 5));

ALTER TABLE character_items
  ADD CONSTRAINT character_items_decoration_slots_range
  CHECK (decoration_slots IS NULL OR (decoration_slots >= 0 AND decoration_slots <= 5));
