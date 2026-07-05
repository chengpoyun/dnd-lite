-- 遷移: create_info_links_table
-- 創建時間: 2026-07-04 23:21:38
-- 說明: 「資訊」分頁的參考連結清單，帳號層級（同一登入/匿名身分下所有角色共用），
--      雙軌 user_id/anonymous_id 設計與 RLS policy 比照 characters 表。

CREATE TABLE IF NOT EXISTS info_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  anonymous_id TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_info_links_user_id ON info_links(user_id);
CREATE INDEX IF NOT EXISTS idx_info_links_anonymous_id ON info_links(anonymous_id);

ALTER TABLE info_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "info_links_policy" ON info_links FOR ALL USING (
  ((select auth.uid()) IS NOT NULL AND user_id = (select auth.uid()))
  OR ((select auth.uid()) IS NULL AND is_anonymous = true)
);
