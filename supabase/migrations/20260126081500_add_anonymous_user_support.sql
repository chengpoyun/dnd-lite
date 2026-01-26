-- 遷移: add_anonymous_user_support
-- 創建時間: 2026-01-26 08:15:00

-- 在這裡添加你的 SQL 指令
-- 例如:
-- CREATE TABLE IF NOT EXISTS new_table (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- 記得添加索引和 RLS 政策
-- CREATE INDEX IF NOT EXISTS idx_new_table_id ON new_table(id);
-- ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "policy_name" ON new_table FOR ALL USING (auth.uid() = user_id);
