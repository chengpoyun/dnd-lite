-- 為法術表添加儀式欄位
ALTER TABLE spells ADD COLUMN IF NOT EXISTS ritual BOOLEAN NOT NULL DEFAULT false;

-- 為現有資料設定預設值（如果有的話）
UPDATE spells SET ritual = false WHERE ritual IS NULL;
