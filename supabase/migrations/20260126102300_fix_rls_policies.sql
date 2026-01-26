-- 修復所有相關表的 RLS 政策以支持匿名用戶
-- 確保匿名用戶可以創建和存取相關的角色數據

-- 為 character_ability_scores 表設置 RLS 政策
DROP POLICY IF EXISTS "Users can manage their character ability scores" ON character_ability_scores;
CREATE POLICY "Users can manage their character ability scores" ON character_ability_scores FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_ability_scores.character_id 
    AND (
      -- 登入用戶存取自己的角色
      (auth.uid() = characters.user_id AND characters.is_anonymous = false) OR
      -- 匿名用戶存取自己的角色
      (characters.is_anonymous = true AND characters.anonymous_id IS NOT NULL)
    )
  )
);

-- 為 character_current_stats 表設置 RLS 政策
DROP POLICY IF EXISTS "Users can manage their character current stats" ON character_current_stats;
CREATE POLICY "Users can manage their character current stats" ON character_current_stats FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_current_stats.character_id 
    AND (
      -- 登入用戶存取自己的角色
      (auth.uid() = characters.user_id AND characters.is_anonymous = false) OR
      -- 匿名用戶存取自己的角色
      (characters.is_anonymous = true AND characters.anonymous_id IS NOT NULL)
    )
  )
);

-- 為 character_currency 表設置 RLS 政策
DROP POLICY IF EXISTS "Users can manage their character currency" ON character_currency;
CREATE POLICY "Users can manage their character currency" ON character_currency FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_currency.character_id 
    AND (
      -- 登入用戶存取自己的角色
      (auth.uid() = characters.user_id AND characters.is_anonymous = false) OR
      -- 匿名用戶存取自己的角色
      (characters.is_anonymous = true AND characters.anonymous_id IS NOT NULL)
    )
  )
);

-- 為其他相關表設置類似的政策
DROP POLICY IF EXISTS "Users can manage their character saving throws" ON character_saving_throws;
CREATE POLICY "Users can manage their character saving throws" ON character_saving_throws FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_saving_throws.character_id 
    AND (
      (auth.uid() = characters.user_id AND characters.is_anonymous = false) OR
      (characters.is_anonymous = true AND characters.anonymous_id IS NOT NULL)
    )
  )
);

DROP POLICY IF EXISTS "Users can manage their character skill proficiencies" ON character_skill_proficiencies;
CREATE POLICY "Users can manage their character skill proficiencies" ON character_skill_proficiencies FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_skill_proficiencies.character_id 
    AND (
      (auth.uid() = characters.user_id AND characters.is_anonymous = false) OR
      (characters.is_anonymous = true AND characters.anonymous_id IS NOT NULL)
    )
  )
);

-- 啟用所有表的 RLS
ALTER TABLE character_ability_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_current_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_currency ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_saving_throws ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_skill_proficiencies ENABLE ROW LEVEL SECURITY;