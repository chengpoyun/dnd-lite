-- 添加缺失的 experience 欄位
-- 確保 characters 表包含所有必要的欄位

-- 添加 experience 欄位如果它不存在
ALTER TABLE characters ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0;

-- 確保 experience 欄位有預設值和非空約束
UPDATE characters SET experience = 0 WHERE experience IS NULL;
ALTER TABLE characters ALTER COLUMN experience SET DEFAULT 0;
ALTER TABLE characters ALTER COLUMN experience SET NOT NULL;

-- 添加其他可能缺失的欄位
ALTER TABLE characters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 創建更新時間觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為 characters 表添加自動更新時間戳觸發器
DROP TRIGGER IF EXISTS update_characters_updated_at ON characters;
CREATE TRIGGER update_characters_updated_at
    BEFORE UPDATE ON characters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();