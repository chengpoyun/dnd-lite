-- 修復 auth_rls_initplan (0003)：policy 改為 (select auth.jwt())->>'role' 讓整個 auth 呼叫在 select 內
-- 創建時間: 2026-02-21
-- 說明: linter 要求 auth.<function>() 整段為 (select auth.<function>())，故改為 (select auth.jwt())->>'role'。

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
