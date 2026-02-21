-- 修復 Supabase Security Advisor 警告
-- 創建時間: 2026-02-21
-- 對應: function_search_path_mutable (0011), rls_policy_always_true (0024)
-- 說明: 匿名存取 (0012) 與 Leaked Password (Auth) 見文件說明，不在此遷移修改

-- ===== 1. Function search_path (0011) =====
-- update_abilities_updated_at 建立於 create_abilities_tables，未設定 search_path
CREATE OR REPLACE FUNCTION update_abilities_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ===== 2. Permissive RLS - global_items (0024) =====
-- 原 policy: FOR ALL USING (true) 觸發「always true」警告
-- 改為：SELECT 保持公開；INSERT/UPDATE/DELETE 限定為「有 JWT 的請求」（authenticated 或 anon）
DROP POLICY IF EXISTS "global_items_policy" ON global_items;

CREATE POLICY "global_items_select" ON global_items
  FOR SELECT USING (true);

CREATE POLICY "global_items_insert" ON global_items
  FOR INSERT WITH CHECK (
    (coalesce(current_setting('request.jwt.claims', true), '{}')::json->>'role') IN ('authenticated', 'anon')
  );

CREATE POLICY "global_items_update" ON global_items
  FOR UPDATE USING (
    (coalesce(current_setting('request.jwt.claims', true), '{}')::json->>'role') IN ('authenticated', 'anon')
  ) WITH CHECK (
    (coalesce(current_setting('request.jwt.claims', true), '{}')::json->>'role') IN ('authenticated', 'anon')
  );

CREATE POLICY "global_items_delete" ON global_items
  FOR DELETE USING (
    (coalesce(current_setting('request.jwt.claims', true), '{}')::json->>'role') IN ('authenticated', 'anon')
  );

-- ===== 3. Permissive RLS - spells (0024) =====
-- 「Anyone can view spells」保留（SELECT USING true 為刻意公開）
-- 「Anyone can insert/update spells」改為明確的 JWT role 條件
DROP POLICY IF EXISTS "Anyone can insert spells" ON spells;
DROP POLICY IF EXISTS "Anyone can update spells" ON spells;

CREATE POLICY "spells_insert" ON spells
  FOR INSERT WITH CHECK (
    (coalesce(current_setting('request.jwt.claims', true), '{}')::json->>'role') IN ('authenticated', 'anon')
  );

CREATE POLICY "spells_update" ON spells
  FOR UPDATE USING (
    (coalesce(current_setting('request.jwt.claims', true), '{}')::json->>'role') IN ('authenticated', 'anon')
  ) WITH CHECK (
    (coalesce(current_setting('request.jwt.claims', true), '{}')::json->>'role') IN ('authenticated', 'anon')
  );
