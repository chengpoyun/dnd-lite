-- 添加 name_en 欄位到 spells 表
ALTER TABLE spells ADD COLUMN IF NOT EXISTS name_en TEXT;

-- 創建索引以加速搜尋
CREATE INDEX IF NOT EXISTS idx_spells_name_en ON spells(name_en);

COMMENT ON COLUMN spells.name_en IS '法術英文名稱';
