-- 修復 Supabase Performance Advisor：auth_rls_initplan (0003)、multiple_permissive_policies (0006)
-- 創建時間: 2026-02-21
-- 說明: 將 RLS 中的 auth.uid() / current_setting() 改為 (select ...) 避免每行重算；characters 合併為單一 policy 避免多重 permissive。

-- ===== 1. auth_rls_initplan：character_classes =====
DROP POLICY IF EXISTS "Users can manage own character classes" ON character_classes;
CREATE POLICY "Users can manage own character classes" ON character_classes FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_classes.character_id
    AND (((select auth.uid()) IS NOT NULL AND characters.user_id = (select auth.uid()))
         OR ((select auth.uid()) IS NULL AND characters.is_anonymous = true)))
);

-- ===== 2. auth_rls_initplan：character_hit_dice_pools =====
DROP POLICY IF EXISTS "Users can manage own hit dice pools" ON character_hit_dice_pools;
CREATE POLICY "Users can manage own hit dice pools" ON character_hit_dice_pools FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_hit_dice_pools.character_id
    AND (((select auth.uid()) IS NOT NULL AND characters.user_id = (select auth.uid()))
         OR ((select auth.uid()) IS NULL AND characters.is_anonymous = true)))
);

-- ===== 3. auth_rls_initplan：global_items（用 (select auth.jwt()->>'role') 滿足 linter，只算一次）=====
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

-- ===== 4. auth_rls_initplan：spells（同上）=====
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

-- ===== 5. multiple_permissive_policies：characters 合併為單一 policy =====
DROP POLICY IF EXISTS "characters_authenticated_policy" ON characters;
DROP POLICY IF EXISTS "characters_anonymous_policy" ON characters;

CREATE POLICY "characters_policy" ON characters FOR ALL USING (
  ((select auth.uid()) IS NOT NULL AND user_id = (select auth.uid()))
  OR ((select auth.uid()) IS NULL AND is_anonymous = true)
);
