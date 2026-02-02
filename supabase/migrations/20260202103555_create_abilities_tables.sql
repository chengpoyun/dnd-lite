-- 遷移: create_abilities_tables
-- 創建時間: 2026-02-02 10:35:55

-- 建立特殊能力表（全域資料）
CREATE TABLE IF NOT EXISTS abilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('種族', '職業', '專長', '背景', '其他')),
  recovery_type TEXT NOT NULL CHECK (recovery_type IN ('常駐', '短休', '長休')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立角色特殊能力記錄表
CREATE TABLE IF NOT EXISTS character_abilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  ability_id UUID NOT NULL REFERENCES abilities(id) ON DELETE CASCADE,
  current_uses INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, ability_id)
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_abilities_source ON abilities(source);
CREATE INDEX IF NOT EXISTS idx_abilities_recovery_type ON abilities(recovery_type);
CREATE INDEX IF NOT EXISTS idx_character_abilities_character_id ON character_abilities(character_id);
CREATE INDEX IF NOT EXISTS idx_character_abilities_ability_id ON character_abilities(ability_id);

-- RLS 政策：abilities 表（所有認證用戶可讀寫）
ALTER TABLE abilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abilities_policy" ON abilities FOR ALL USING (
  (select auth.uid()) IS NOT NULL OR 
  (select auth.uid()) IS NULL
);

-- RLS 政策：character_abilities 表（通過 characters 表檢查權限）
ALTER TABLE character_abilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "character_abilities_policy" ON character_abilities FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_abilities.character_id 
    AND (
      ((select auth.uid()) IS NOT NULL AND characters.user_id = (select auth.uid())) OR 
      ((select auth.uid()) IS NULL AND characters.is_anonymous = true)
    )
  )
);

-- 自動更新 updated_at 觸發器
CREATE OR REPLACE FUNCTION update_abilities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER abilities_updated_at
  BEFORE UPDATE ON abilities
  FOR EACH ROW
  EXECUTE FUNCTION update_abilities_updated_at();

CREATE TRIGGER character_abilities_updated_at
  BEFORE UPDATE ON character_abilities
  FOR EACH ROW
  EXECUTE FUNCTION update_abilities_updated_at();
-- 記得添加索引和 RLS 政策
-- CREATE INDEX IF NOT EXISTS idx_new_table_id ON new_table(id);
-- ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "policy_name" ON new_table FOR ALL USING (auth.uid() = user_id);
