-- 建立角色資料表
CREATE TABLE characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立戰鬥項目資料表
CREATE TABLE combat_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('action', 'bonus', 'reaction', 'resource')),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '✨',
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 1,
  recovery TEXT NOT NULL DEFAULT 'round' CHECK (recovery IN ('round', 'short', 'long')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_combat_items_character_id ON combat_items(character_id);
CREATE INDEX idx_combat_items_category ON combat_items(category);

-- 設定 Row Level Security (RLS)
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE combat_items ENABLE ROW LEVEL SECURITY;

-- 角色資料表的 RLS 政策
CREATE POLICY "使用者只能查看自己的角色" 
  ON characters FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "使用者可以建立自己的角色" 
  ON characters FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "使用者可以更新自己的角色" 
  ON characters FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "使用者可以刪除自己的角色" 
  ON characters FOR DELETE 
  USING (auth.uid() = user_id);

-- 戰鬥項目資料表的 RLS 政策
CREATE POLICY "使用者只能查看自己角色的戰鬥項目" 
  ON combat_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM characters 
      WHERE characters.id = combat_items.character_id 
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "使用者可以建立自己角色的戰鬥項目" 
  ON combat_items FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters 
      WHERE characters.id = combat_items.character_id 
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "使用者可以更新自己角色的戰鬥項目" 
  ON combat_items FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM characters 
      WHERE characters.id = combat_items.character_id 
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "使用者可以刪除自己角色的戰鬥項目" 
  ON combat_items FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM characters 
      WHERE characters.id = combat_items.character_id 
      AND characters.user_id = auth.uid()
    )
  );

-- 建立觸發器自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_characters_updated_at 
  BEFORE UPDATE ON characters 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();