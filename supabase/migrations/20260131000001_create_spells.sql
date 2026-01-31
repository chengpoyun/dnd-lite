-- 建立法術資料表（全域共用）
CREATE TABLE IF NOT EXISTS spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 0 AND level <= 9),
  casting_time TEXT NOT NULL,
  school TEXT NOT NULL CHECK (school IN ('塑能', '惑控', '預言', '咒法', '變化', '防護', '死靈', '幻術')),
  concentration BOOLEAN NOT NULL DEFAULT false,
  duration TEXT NOT NULL,
  range TEXT NOT NULL,
  source TEXT NOT NULL,
  verbal BOOLEAN NOT NULL DEFAULT false,
  somatic BOOLEAN NOT NULL DEFAULT false,
  material TEXT DEFAULT '',
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立角色已學法術關聯表
CREATE TABLE IF NOT EXISTS character_spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  spell_id UUID NOT NULL REFERENCES spells(id) ON DELETE CASCADE,
  is_prepared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(character_id, spell_id)
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_spells_level ON spells(level);
CREATE INDEX IF NOT EXISTS idx_spells_school ON spells(school);
CREATE INDEX IF NOT EXISTS idx_spells_name ON spells(name);
CREATE INDEX IF NOT EXISTS idx_character_spells_character_id ON character_spells(character_id);
CREATE INDEX IF NOT EXISTS idx_character_spells_spell_id ON character_spells(spell_id);

-- 啟用 RLS
ALTER TABLE spells ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_spells ENABLE ROW LEVEL SECURITY;

-- spells 表的 RLS 政策：所有人可讀取、新增、編輯
CREATE POLICY "Anyone can view spells" ON spells FOR SELECT USING (true);
CREATE POLICY "Anyone can insert spells" ON spells FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update spells" ON spells FOR UPDATE USING (true);

-- character_spells 表的 RLS 政策：只能操作自己的角色
CREATE POLICY "Users can view own character spells" ON character_spells FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_spells.character_id 
    AND (auth.uid() = characters.user_id OR characters.anonymous_id = characters.anonymous_id)
  )
);

CREATE POLICY "Users can insert own character spells" ON character_spells FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_spells.character_id 
    AND (auth.uid() = characters.user_id OR characters.anonymous_id = characters.anonymous_id)
  )
);

CREATE POLICY "Users can update own character spells" ON character_spells FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_spells.character_id 
    AND (auth.uid() = characters.user_id OR characters.anonymous_id = characters.anonymous_id)
  )
);

CREATE POLICY "Users can delete own character spells" ON character_spells FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_spells.character_id 
    AND (auth.uid() = characters.user_id OR characters.anonymous_id = characters.anonymous_id)
  )
);

-- 建立 updated_at 自動更新觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_spells_updated_at 
  BEFORE UPDATE ON spells
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
