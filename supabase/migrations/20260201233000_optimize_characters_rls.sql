-- 優化 characters 表的 RLS 政策以提升查詢效能
-- 日期: 2026-02-01
-- 描述: 分離認證用戶和匿名用戶的政策，避免複雜的 OR 條件

-- 刪除舊的合併政策
DROP POLICY IF EXISTS "characters_policy" ON characters;
DROP POLICY IF EXISTS "Users can view own characters" ON characters;

-- 為認證用戶創建獨立政策（更高效的索引利用）
CREATE POLICY "characters_authenticated_policy" ON characters FOR ALL USING (
  (select auth.uid()) IS NOT NULL AND user_id = (select auth.uid())
);

-- 為匿名用戶創建獨立政策
CREATE POLICY "characters_anonymous_policy" ON characters FOR ALL USING (
  (select auth.uid()) IS NULL AND is_anonymous = true
);
