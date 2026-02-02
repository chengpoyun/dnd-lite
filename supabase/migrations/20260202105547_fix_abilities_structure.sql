-- 遷移: fix_abilities_structure
-- 創建時間: 2026-02-02 10:55:47
-- 說明: 修正 abilities 表結構，name_en 改為可選

-- 1. 修改 abilities 表：name_en 改為可選（允許 NULL）
ALTER TABLE abilities ALTER COLUMN name_en DROP NOT NULL;

-- 2. 更新已有資料：將空字串的 name_en 改為 NULL
UPDATE abilities SET name_en = NULL WHERE name_en = '';
