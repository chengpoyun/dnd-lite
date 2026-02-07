-- 將 category=素材 改為 雜項，並移除「素材」類別

-- 先改資料（避免違反新約束）
UPDATE global_items SET category = '雜項' WHERE category = '素材';
UPDATE character_items SET category_override = '雜項' WHERE category_override = '素材';

-- 再改約束（移除「素材」）
ALTER TABLE global_items DROP CONSTRAINT IF EXISTS global_items_category_check;
ALTER TABLE global_items ADD CONSTRAINT global_items_category_check
  CHECK (category IN ('裝備', '藥水', 'MH素材', '雜項'));

ALTER TABLE character_items DROP CONSTRAINT IF EXISTS character_items_category_override_check;
ALTER TABLE character_items ADD CONSTRAINT character_items_category_override_check
  CHECK (category_override IS NULL OR category_override IN ('裝備', '藥水', 'MH素材', '雜項'));
