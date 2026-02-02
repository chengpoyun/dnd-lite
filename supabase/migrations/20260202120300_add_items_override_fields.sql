-- 添加 character_items override 欄位（角色專屬客製化）
-- 允許玩家客製化自己的物品，不影響 items 表的全域資料

-- 注意：items 表目前是 per-user 的結構，但為了未來可能的全域物品庫，我們還是添加 override 欄位
-- 這樣可以支援：1) 從全域物品庫學習 2) 客製化自己的物品副本

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS name_override TEXT,
  ADD COLUMN IF NOT EXISTS description_override TEXT,
  ADD COLUMN IF NOT EXISTS category_override TEXT CHECK (category_override IN ('裝備', '魔法物品', '藥水', '素材', '雜項'));

-- 添加註解說明
COMMENT ON COLUMN items.name_override IS '客製化物品名稱（優先顯示）';
COMMENT ON COLUMN items.description_override IS '客製化物品描述（優先顯示）';
COMMENT ON COLUMN items.category_override IS '客製化物品類別（優先顯示）';

-- 注意：quantity 不需要 override，因為它本身就是角色專屬的數值
