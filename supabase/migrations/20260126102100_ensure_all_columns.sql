-- 確保 characters 表包含所有必要的欄位
-- 這個遷移將添加所有缺失的欄位

-- 添加所有可能缺失的欄位
ALTER TABLE characters ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS character_class TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS anonymous_id TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE characters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 設置非空約束和預設值
UPDATE characters SET level = 1 WHERE level IS NULL;
ALTER TABLE characters ALTER COLUMN level SET DEFAULT 1;
ALTER TABLE characters ALTER COLUMN level SET NOT NULL;

UPDATE characters SET experience = 0 WHERE experience IS NULL;
ALTER TABLE characters ALTER COLUMN experience SET DEFAULT 0;
ALTER TABLE characters ALTER COLUMN experience SET NOT NULL;

UPDATE characters SET character_class = 'fighter' WHERE character_class IS NULL;
ALTER TABLE characters ALTER COLUMN character_class SET NOT NULL;

UPDATE characters SET is_anonymous = false WHERE is_anonymous IS NULL;
ALTER TABLE characters ALTER COLUMN is_anonymous SET DEFAULT false;
ALTER TABLE characters ALTER COLUMN is_anonymous SET NOT NULL;

-- 確保索引存在
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_characters_anonymous_id ON characters(anonymous_id) WHERE anonymous_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_characters_is_anonymous ON characters(is_anonymous) WHERE is_anonymous = true;

-- 確保 RLS 政策正確
DROP POLICY IF EXISTS "Users can access their characters" ON characters;
CREATE POLICY "Users can access their characters" ON characters FOR ALL USING (
  -- 登入用戶存取自己的角色
  (auth.uid() = user_id AND is_anonymous = false) OR
  -- 匿名用戶存取自己的角色 (檢查 anonymous_id 與設定匹配)
  (is_anonymous = true AND anonymous_id IS NOT NULL)
);

-- 啟用 RLS
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;