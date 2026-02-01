-- 啟用 UUID 擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 創建 items 表
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
  category TEXT NOT NULL CHECK (category IN ('裝備', '魔法物品', '藥水', '素材', '雜項')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 創建索引提升查詢效能
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_anonymous_id ON items(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

-- RLS 政策：用戶只能查看自己的道具
CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (
    (auth.uid() = user_id) OR 
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL AND anonymous_id = current_setting('app.anonymous_id', true))
  );

-- RLS 政策：用戶只能新增自己的道具
CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id) OR 
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
  );

-- RLS 政策：用戶只能更新自己的道具
CREATE POLICY "Users can update own items" ON items
  FOR UPDATE USING (
    (auth.uid() = user_id) OR 
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL AND anonymous_id = current_setting('app.anonymous_id', true))
  );

-- RLS 政策：用戶只能刪除自己的道具
CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (
    (auth.uid() = user_id) OR 
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL AND anonymous_id = current_setting('app.anonymous_id', true))
  );

-- 啟用 RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- 創建更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION update_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at_trigger
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_items_updated_at();
