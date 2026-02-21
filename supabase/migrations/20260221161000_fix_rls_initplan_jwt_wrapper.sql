-- 修復 auth_rls_initplan (0003)：global_items / spells 的 policy 改用 (select auth.jwt()->>'role')
-- 創建時間: 2026-02-21
-- 說明: 以 auth.jwt() 取代 current_setting('request.jwt.claims')，並以 (select ...) 包裝，讓 linter 識別且只評估一次。

-- global_items
DROP POLICY IF EXISTS "global_items_insert" ON global_items;
DROP POLICY IF EXISTS "global_items_update" ON global_items;
DROP POLICY IF EXISTS "global_items_delete" ON global_items;

CREATE POLICY "global_items_insert" ON global_items
  FOR INSERT WITH CHECK (
    (select auth.jwt())->>'role' IN ('authenticated', 'anon')
  );

CREATE POLICY "global_items_update" ON global_items
  FOR UPDATE USING (
    (select auth.jwt())->>'role' IN ('authenticated', 'anon')
  ) WITH CHECK (
    (select auth.jwt())->>'role' IN ('authenticated', 'anon')
  );

CREATE POLICY "global_items_delete" ON global_items
  FOR DELETE USING (
    (select auth.jwt())->>'role' IN ('authenticated', 'anon')
  );

-- spells
DROP POLICY IF EXISTS "spells_insert" ON spells;
DROP POLICY IF EXISTS "spells_update" ON spells;

CREATE POLICY "spells_insert" ON spells
  FOR INSERT WITH CHECK (
    (select auth.jwt())->>'role' IN ('authenticated', 'anon')
  );

CREATE POLICY "spells_update" ON spells
  FOR UPDATE USING (
    (select auth.jwt())->>'role' IN ('authenticated', 'anon')
  ) WITH CHECK (
    (select auth.jwt())->>'role' IN ('authenticated', 'anon')
  );
