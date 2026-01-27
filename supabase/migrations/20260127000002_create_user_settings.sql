-- 創建用戶設定表
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  supabase_test_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_last_character_id ON user_settings(last_character_id);

-- 自動更新時間戳記觸發器
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();

-- 啟用行級安全性
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 安全政策：用戶只能存取自己的設定
DROP POLICY IF EXISTS "Users can manage their own settings" ON user_settings;
CREATE POLICY "Users can manage their own settings" ON user_settings 
  FOR ALL USING (auth.uid() = user_id);

-- 設定表格註釋
COMMENT ON TABLE user_settings IS '用戶個人設定表';
COMMENT ON COLUMN user_settings.user_id IS '用戶ID (關聯到 auth.users)';
COMMENT ON COLUMN user_settings.last_character_id IS '最後使用的角色ID';
COMMENT ON COLUMN user_settings.supabase_test_completed IS 'Supabase連線測試是否完成';