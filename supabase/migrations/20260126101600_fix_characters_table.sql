-- 確保 characters 表有正確的結構
-- 修復缺少的欄位問題

-- 如果表不存在就創建
CREATE TABLE IF NOT EXISTS characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  character_class TEXT NOT NULL, -- 使用 character_class 避免 class 關鍵字衝突
  level INTEGER NOT NULL DEFAULT 1,
  experience INTEGER NOT NULL DEFAULT 0,
  anonymous_id TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 如果 class 欄位不存在，添加它（使用 character_class）
ALTER TABLE characters ADD COLUMN IF NOT EXISTS character_class TEXT;

-- 如果之前有 class 欄位，將其重命名為 character_class
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'characters' AND column_name = 'class'
  ) THEN
    ALTER TABLE characters RENAME COLUMN class TO character_class;
  END IF;
END $$;

-- 確保 character_class 不能為空
ALTER TABLE characters ALTER COLUMN character_class SET NOT NULL;

-- 更新索引
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_characters_anonymous_id ON characters(anonymous_id) WHERE anonymous_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_characters_is_anonymous ON characters(is_anonymous) WHERE is_anonymous = true;

-- 更新 RLS 政策
DROP POLICY IF EXISTS "Users can access their characters" ON characters;
CREATE POLICY "Users can access their characters" ON characters FOR ALL USING (
  -- 登入用戶存取自己的角色
  (auth.uid() = user_id AND is_anonymous = false) OR
  -- 匿名用戶存取自己的角色 (檢查 anonymous_id 與設定匹配)
  (is_anonymous = true AND anonymous_id IS NOT NULL)
);

-- 啟用 RLS
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;