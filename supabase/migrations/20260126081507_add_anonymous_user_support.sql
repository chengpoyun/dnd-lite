-- 遷移: add_anonymous_user_support
-- 創建時間: 2026-01-26 08:15:07

-- 添加匿名用戶支援欄位到 characters 表格
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS anonymous_id TEXT,
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- 創建匿名用戶索引
CREATE INDEX IF NOT EXISTS idx_characters_anonymous_id ON characters(anonymous_id) WHERE anonymous_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_characters_is_anonymous ON characters(is_anonymous) WHERE is_anonymous = true;

-- 刪除現有的 characters RLS 政策
DROP POLICY IF EXISTS "Users can view own characters" ON characters;

-- 創建新的 RLS 政策支援匿名用戶
CREATE POLICY "Users can access their characters" ON characters FOR ALL USING (
  -- 登入用戶存取自己的角色
  (auth.uid() = user_id AND is_anonymous = false) OR
  -- 匿名用戶存取自己的角色
  (is_anonymous = true AND anonymous_id = current_setting('app.anonymous_id', true))
);

-- 同樣更新所有相關表格的 RLS 政策
-- character_ability_scores
DROP POLICY IF EXISTS "Users can view own character ability scores" ON character_ability_scores;
CREATE POLICY "Users can access character ability scores" ON character_ability_scores FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_ability_scores.character_id 
    AND (
      (characters.user_id = auth.uid() AND characters.is_anonymous = false) OR
      (characters.is_anonymous = true AND characters.anonymous_id = current_setting('app.anonymous_id', true))
    )
  )
);

-- character_saving_throws
DROP POLICY IF EXISTS "Users can view own character saving throws" ON character_saving_throws;
CREATE POLICY "Users can access character saving throws" ON character_saving_throws FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_saving_throws.character_id 
    AND (
      (characters.user_id = auth.uid() AND characters.is_anonymous = false) OR
      (characters.is_anonymous = true AND characters.anonymous_id = current_setting('app.anonymous_id', true))
    )
  )
);

-- character_skill_proficiencies
DROP POLICY IF EXISTS "Users can view own character skills" ON character_skill_proficiencies;
CREATE POLICY "Users can access character skills" ON character_skill_proficiencies FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_skill_proficiencies.character_id 
    AND (
      (characters.user_id = auth.uid() AND characters.is_anonymous = false) OR
      (characters.is_anonymous = true AND characters.anonymous_id = current_setting('app.anonymous_id', true))
    )
  )
);

-- character_current_stats
DROP POLICY IF EXISTS "Users can view own character current stats" ON character_current_stats;
CREATE POLICY "Users can access character current stats" ON character_current_stats FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_current_stats.character_id 
    AND (
      (characters.user_id = auth.uid() AND characters.is_anonymous = false) OR
      (characters.is_anonymous = true AND characters.anonymous_id = current_setting('app.anonymous_id', true))
    )
  )
);

-- character_currency
DROP POLICY IF EXISTS "Users can view own character currency" ON character_currency;
CREATE POLICY "Users can access character currency" ON character_currency FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_currency.character_id 
    AND (
      (characters.user_id = auth.uid() AND characters.is_anonymous = false) OR
      (characters.is_anonymous = true AND characters.anonymous_id = current_setting('app.anonymous_id', true))
    )
  )
);

-- character_items
DROP POLICY IF EXISTS "Users can view own character items" ON character_items;
CREATE POLICY "Users can access character items" ON character_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_items.character_id 
    AND (
      (characters.user_id = auth.uid() AND characters.is_anonymous = false) OR
      (characters.is_anonymous = true AND characters.anonymous_id = current_setting('app.anonymous_id', true))
    )
  )
);

-- character_spells
DROP POLICY IF EXISTS "Users can view own character spells" ON character_spells;
CREATE POLICY "Users can access character spells" ON character_spells FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_spells.character_id 
    AND (
      (characters.user_id = auth.uid() AND characters.is_anonymous = false) OR
      (characters.is_anonymous = true AND characters.anonymous_id = current_setting('app.anonymous_id', true))
    )
  )
);

-- character_spell_slots
DROP POLICY IF EXISTS "Users can view own character spell slots" ON character_spell_slots;
CREATE POLICY "Users can access character spell slots" ON character_spell_slots FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_spell_slots.character_id 
    AND (
      (characters.user_id = auth.uid() AND characters.is_anonymous = false) OR
      (characters.is_anonymous = true AND characters.anonymous_id = current_setting('app.anonymous_id', true))
    )
  )
);

-- character_combat_actions
DROP POLICY IF EXISTS "Users can view own character combat actions" ON character_combat_actions;
CREATE POLICY "Users can access character combat actions" ON character_combat_actions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_combat_actions.character_id 
    AND (
      (characters.user_id = auth.uid() AND characters.is_anonymous = false) OR
      (characters.is_anonymous = true AND characters.anonymous_id = current_setting('app.anonymous_id', true))
    )
  )
);
