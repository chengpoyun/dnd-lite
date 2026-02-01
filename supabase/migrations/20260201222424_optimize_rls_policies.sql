-- 優化 RLS 政策以提升性能
-- 1. 將 auth.uid() 改為 (select auth.uid()) 避免每行重新計算
-- 2. 合併重複的 permissive 政策，簡化政策結構
-- 創建日期: 2026-02-01

-- ===== 移除所有舊的 RLS 政策 =====

-- Characters 表
DROP POLICY IF EXISTS "使用者只能查看自己的角色" ON characters;
DROP POLICY IF EXISTS "使用者可以建立自己的角色" ON characters;
DROP POLICY IF EXISTS "使用者可以更新自己的角色" ON characters;
DROP POLICY IF EXISTS "使用者可以刪除自己的角色" ON characters;
DROP POLICY IF EXISTS "Users can view own characters" ON characters;
DROP POLICY IF EXISTS "Users can access their characters" ON characters;

-- Character ability scores
DROP POLICY IF EXISTS "Users can access character ability scores" ON character_ability_scores;
DROP POLICY IF EXISTS "Users can manage their character ability scores" ON character_ability_scores;
DROP POLICY IF EXISTS "Users can view own character ability scores" ON character_ability_scores;

-- Character current stats
DROP POLICY IF EXISTS "Users can access character current stats" ON character_current_stats;
DROP POLICY IF EXISTS "Users can manage their character current stats" ON character_current_stats;
DROP POLICY IF EXISTS "Users can view own character current stats" ON character_current_stats;

-- Character currency
DROP POLICY IF EXISTS "Users can access character currency" ON character_currency;
DROP POLICY IF EXISTS "Users can manage their character currency" ON character_currency;
DROP POLICY IF EXISTS "Users can view own character currency" ON character_currency;

-- Character saving throws
DROP POLICY IF EXISTS "Users can access character saving throws" ON character_saving_throws;
DROP POLICY IF EXISTS "Users can manage their character saving throws" ON character_saving_throws;
DROP POLICY IF EXISTS "Users can view own character saving throws" ON character_saving_throws;

-- Character skill proficiencies
DROP POLICY IF EXISTS "Users can access character skills" ON character_skill_proficiencies;
DROP POLICY IF EXISTS "Users can manage their character skill proficiencies" ON character_skill_proficiencies;
DROP POLICY IF EXISTS "Users can view own character skill proficiencies" ON character_skill_proficiencies;

-- Character combat actions
DROP POLICY IF EXISTS "Users can access character combat actions" ON character_combat_actions;
DROP POLICY IF EXISTS "Users can view own character combat actions" ON character_combat_actions;

-- Character spells
DROP POLICY IF EXISTS "Users can view own character spells" ON character_spells;
DROP POLICY IF EXISTS "Users can insert own character spells" ON character_spells;
DROP POLICY IF EXISTS "Users can update own character spells" ON character_spells;
DROP POLICY IF EXISTS "Users can delete own character spells" ON character_spells;

-- User settings
DROP POLICY IF EXISTS "Users can manage their own settings" ON user_settings;

-- Combat sessions
DROP POLICY IF EXISTS "用戶可以創建戰鬥會話" ON combat_sessions;
DROP POLICY IF EXISTS "用戶可以更新自己的戰鬥會話" ON combat_sessions;
DROP POLICY IF EXISTS "用戶可以刪除自己的戰鬥會話" ON combat_sessions;
DROP POLICY IF EXISTS "所有人都可以查看活躍的戰鬥會話" ON combat_sessions;

-- Combat monsters
DROP POLICY IF EXISTS "所有人都可以查看活躍戰鬥的怪物" ON combat_monsters;
DROP POLICY IF EXISTS "知道戰鬥 ID 的人可以管理怪物" ON combat_monsters;

-- Combat damage logs
DROP POLICY IF EXISTS "所有人都可以查看活躍戰鬥的傷害記錄" ON combat_damage_logs;
DROP POLICY IF EXISTS "知道戰鬥 ID 的人可以管理傷害記錄" ON combat_damage_logs;

-- Items
DROP POLICY IF EXISTS "Users can view own items" ON items;
DROP POLICY IF EXISTS "Users can insert own items" ON items;
DROP POLICY IF EXISTS "Users can update own items" ON items;
DROP POLICY IF EXISTS "Users can delete own items" ON items;

-- ===== 創建優化的 RLS 政策（單一 FOR ALL 政策）=====

-- Characters 表 - 合併所有操作為單一政策
CREATE POLICY "characters_policy" ON characters FOR ALL USING (
  ((select auth.uid()) IS NOT NULL AND user_id = (select auth.uid())) OR 
  ((select auth.uid()) IS NULL AND is_anonymous = true)
);

-- Character ability scores - 合併所有操作為單一政策
CREATE POLICY "character_ability_scores_policy" ON character_ability_scores FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_ability_scores.character_id 
    AND (
      ((select auth.uid()) IS NOT NULL AND characters.user_id = (select auth.uid())) OR 
      ((select auth.uid()) IS NULL AND characters.is_anonymous = true)
    )
  )
);

-- Character current stats - 合併所有操作為單一政策
CREATE POLICY "character_current_stats_policy" ON character_current_stats FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_current_stats.character_id 
    AND (
      ((select auth.uid()) IS NOT NULL AND characters.user_id = (select auth.uid())) OR 
      ((select auth.uid()) IS NULL AND characters.is_anonymous = true)
    )
  )
);

-- Character currency - 合併所有操作為單一政策
CREATE POLICY "character_currency_policy" ON character_currency FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_currency.character_id 
    AND (
      ((select auth.uid()) IS NOT NULL AND characters.user_id = (select auth.uid())) OR 
      ((select auth.uid()) IS NULL AND characters.is_anonymous = true)
    )
  )
);

-- Character saving throws - 合併所有操作為單一政策
CREATE POLICY "character_saving_throws_policy" ON character_saving_throws FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_saving_throws.character_id 
    AND (
      ((select auth.uid()) IS NOT NULL AND characters.user_id = (select auth.uid())) OR 
      ((select auth.uid()) IS NULL AND characters.is_anonymous = true)
    )
  )
);

-- Character skill proficiencies - 合併所有操作為單一政策
CREATE POLICY "character_skill_proficiencies_policy" ON character_skill_proficiencies FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_skill_proficiencies.character_id 
    AND (
      ((select auth.uid()) IS NOT NULL AND characters.user_id = (select auth.uid())) OR 
      ((select auth.uid()) IS NULL AND characters.is_anonymous = true)
    )
  )
);

-- Character combat actions - 合併所有操作為單一政策
CREATE POLICY "character_combat_actions_policy" ON character_combat_actions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_combat_actions.character_id 
    AND (
      ((select auth.uid()) IS NOT NULL AND characters.user_id = (select auth.uid())) OR 
      ((select auth.uid()) IS NULL AND characters.is_anonymous = true)
    )
  )
);

-- Character spells - 合併所有操作為單一政策
CREATE POLICY "character_spells_policy" ON character_spells FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_spells.character_id 
    AND (
      ((select auth.uid()) IS NOT NULL AND characters.user_id = (select auth.uid())) OR 
      ((select auth.uid()) IS NULL AND characters.is_anonymous = true)
    )
  )
);

-- User settings - 單一政策（只支援認證用戶）
CREATE POLICY "user_settings_policy" ON user_settings FOR ALL USING (
  (select auth.uid()) IS NOT NULL AND user_id = (select auth.uid())
);

-- Combat sessions - 合併所有操作為單一政策（包含查看活躍會話的權限）
CREATE POLICY "combat_sessions_policy" ON combat_sessions FOR ALL USING (
  is_active = true OR
  ((select auth.uid()) IS NOT NULL AND user_id = (select auth.uid())) OR
  ((select auth.uid()) IS NULL AND anonymous_id IS NOT NULL)
);

-- Combat monsters - 合併讀取和管理權限
CREATE POLICY "combat_monsters_policy" ON combat_monsters FOR ALL USING (
  EXISTS (
    SELECT 1 FROM combat_sessions 
    WHERE combat_sessions.session_code = combat_monsters.session_code
    AND (
      combat_sessions.is_active = true OR
      ((select auth.uid()) IS NOT NULL AND combat_sessions.user_id = (select auth.uid())) OR
      ((select auth.uid()) IS NULL AND combat_sessions.anonymous_id IS NOT NULL)
    )
  )
);

-- Combat damage logs - 合併讀取和管理權限
CREATE POLICY "combat_damage_logs_policy" ON combat_damage_logs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM combat_monsters
    JOIN combat_sessions ON combat_monsters.session_code = combat_sessions.session_code
    WHERE combat_monsters.id = combat_damage_logs.monster_id
    AND (
      combat_sessions.is_active = true OR
      ((select auth.uid()) IS NOT NULL AND combat_sessions.user_id = (select auth.uid())) OR
      ((select auth.uid()) IS NULL AND combat_sessions.anonymous_id IS NOT NULL)
    )
  )
);

-- Items - 合併所有操作為單一政策（Items 直接關聯用戶，不通過 character）
CREATE POLICY "items_policy" ON items FOR ALL USING (
  ((select auth.uid()) IS NOT NULL AND user_id = (select auth.uid())) OR 
  ((select auth.uid()) IS NULL AND anonymous_id IS NOT NULL)
);

-- ===== 添加性能提升說明 =====

COMMENT ON POLICY "characters_policy" ON characters IS 
'優化的 RLS 政策：使用 (select auth.uid()) 避免每行重新計算，合併所有操作為單一政策以提升性能';

COMMENT ON POLICY "character_ability_scores_policy" ON character_ability_scores IS 
'優化的 RLS 政策：使用子查詢包裝 auth.uid() 並合併所有操作';

COMMENT ON POLICY "character_current_stats_policy" ON character_current_stats IS 
'優化的 RLS 政策：使用子查詢包裝 auth.uid() 並合併所有操作';

COMMENT ON POLICY "character_currency_policy" ON character_currency IS 
'優化的 RLS 政策：使用子查詢包裝 auth.uid() 並合併所有操作';

COMMENT ON POLICY "character_saving_throws_policy" ON character_saving_throws IS 
'優化的 RLS 政策：使用子查詢包裝 auth.uid() 並合併所有操作';

COMMENT ON POLICY "character_skill_proficiencies_policy" ON character_skill_proficiencies IS 
'優化的 RLS 政策：使用子查詢包裝 auth.uid() 並合併所有操作';

COMMENT ON POLICY "character_combat_actions_policy" ON character_combat_actions IS 
'優化的 RLS 政策：使用子查詢包裝 auth.uid() 並合併所有操作';

COMMENT ON POLICY "character_spells_policy" ON character_spells IS 
'優化的 RLS 政策：使用子查詢包裝 auth.uid() 並合併所有操作';

COMMENT ON POLICY "combat_monsters_policy" ON combat_monsters IS 
'優化的 RLS 政策：合併查看和管理權限為單一政策';

COMMENT ON POLICY "combat_damage_logs_policy" ON combat_damage_logs IS 
'優化的 RLS 政策：合併查看和管理權限為單一政策';

COMMENT ON POLICY "items_policy" ON items IS 
'優化的 RLS 政策：使用子查詢包裝 auth.uid() 並合併所有操作';
