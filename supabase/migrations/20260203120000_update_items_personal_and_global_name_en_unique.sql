-- 遷移: update_items_personal_and_global_name_en_unique
-- 目的：
-- 1. 允許 character_items.item_id 為 NULL，好讓角色可以擁有純個人物品
-- 2. 對 global_items.name_en 建立不分大小寫的唯一約束，避免重複英文名稱
--
-- 注意：
-- - 既有資料的 name_en 可能為 NULL，本索引會自動忽略 NULL 值，不會造成衝突
-- - 應用程式在上傳物品到 DB 時，必須保證 name_en 已填寫且邏輯上唯一

-- 1. 調整 character_items.item_id 允許為 NULL
ALTER TABLE character_items
  ALTER COLUMN item_id DROP NOT NULL;

-- UNIQUE(character_id, item_id) 在 PostgreSQL 中對 NULL 不會產生衝突
-- 因此不需要調整既有唯一約束

-- 2. 為 global_items.name_en 建立「不分大小寫」唯一索引
--    Fireball / fireball / FIREBALL 都會視為相同
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_items_name_en_unique
ON global_items (LOWER(name_en));

