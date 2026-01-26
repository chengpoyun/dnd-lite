-- 擴展角色資料表結構
-- 主角色表（只存基本資訊和計算結果會用到的數值）
CREATE TABLE IF NOT EXISTS characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  experience INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 基本屬性表
CREATE TABLE IF NOT EXISTS character_ability_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  strength INTEGER NOT NULL DEFAULT 10,
  dexterity INTEGER NOT NULL DEFAULT 10,
  constitution INTEGER NOT NULL DEFAULT 10,
  intelligence INTEGER NOT NULL DEFAULT 10,
  wisdom INTEGER NOT NULL DEFAULT 10,
  charisma INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 豁免骰熟練度表
CREATE TABLE IF NOT EXISTS character_saving_throws (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  ability TEXT NOT NULL CHECK (ability IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma')),
  is_proficient BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, ability)
);

-- 技能熟練度表
CREATE TABLE IF NOT EXISTS character_skill_proficiencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  proficiency_level INTEGER NOT NULL DEFAULT 0, -- 0: 無熟練, 1: 熟練, 2: 專精
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, skill_name)
);

-- 生命值和臨時數據表
CREATE TABLE IF NOT EXISTS character_current_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  current_hp INTEGER NOT NULL,
  max_hp INTEGER NOT NULL,
  temporary_hp INTEGER NOT NULL DEFAULT 0,
  current_hit_dice INTEGER NOT NULL,
  total_hit_dice INTEGER NOT NULL,
  hit_die_type TEXT NOT NULL DEFAULT 'd8',
  armor_class INTEGER NOT NULL DEFAULT 10,
  initiative_bonus INTEGER NOT NULL DEFAULT 0,
  speed INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 貨幣表
CREATE TABLE IF NOT EXISTS character_currency (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  copper INTEGER NOT NULL DEFAULT 0,
  silver INTEGER NOT NULL DEFAULT 0,
  electrum INTEGER NOT NULL DEFAULT 0,
  gold INTEGER NOT NULL DEFAULT 0,
  platinum INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 物品表
CREATE TABLE IF NOT EXISTS character_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  weight DECIMAL(5,2) NOT NULL DEFAULT 0,
  value_in_copper INTEGER NOT NULL DEFAULT 0,
  item_type TEXT, -- 'weapon', 'armor', 'tool', 'consumable', 'treasure', etc.
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  properties JSONB DEFAULT '{}', -- 存放特殊屬性，如武器傷害、護甲AC等
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 法術表
CREATE TABLE IF NOT EXISTS character_spells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0, -- 0 for cantrips
  school TEXT NOT NULL,
  casting_time TEXT NOT NULL,
  range_distance TEXT NOT NULL,
  components TEXT NOT NULL,
  duration TEXT NOT NULL,
  description TEXT NOT NULL,
  is_prepared BOOLEAN NOT NULL DEFAULT false,
  is_ritual BOOLEAN NOT NULL DEFAULT false,
  source TEXT, -- 書籍來源
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 法術位表
CREATE TABLE IF NOT EXISTS character_spell_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  spell_level INTEGER NOT NULL CHECK (spell_level >= 1 AND spell_level <= 9),
  total_slots INTEGER NOT NULL DEFAULT 0,
  used_slots INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, spell_level)
);

-- 重新定義戰鬥項目表（保持原有結構但加強）
DROP TABLE IF EXISTS combat_items;
CREATE TABLE IF NOT EXISTS character_combat_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('action', 'bonus_action', 'reaction', 'resource')),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '✨',
  description TEXT,
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 1,
  recovery_type TEXT NOT NULL DEFAULT 'short_rest' CHECK (recovery_type IN ('turn', 'short_rest', 'long_rest', 'manual')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  action_type TEXT, -- 'attack', 'spell', 'ability', 'item'
  damage_formula TEXT, -- 如 '1d8+3'
  attack_bonus INTEGER DEFAULT 0,
  save_dc INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引提升查詢效能
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_character_ability_scores_character_id ON character_ability_scores(character_id);
CREATE INDEX IF NOT EXISTS idx_character_saving_throws_character_id ON character_saving_throws(character_id);
CREATE INDEX IF NOT EXISTS idx_character_skill_proficiencies_character_id ON character_skill_proficiencies(character_id);
CREATE INDEX IF NOT EXISTS idx_character_current_stats_character_id ON character_current_stats(character_id);
CREATE INDEX IF NOT EXISTS idx_character_currency_character_id ON character_currency(character_id);
CREATE INDEX IF NOT EXISTS idx_character_items_character_id ON character_items(character_id);
CREATE INDEX IF NOT EXISTS idx_character_spells_character_id ON character_spells(character_id);
CREATE INDEX IF NOT EXISTS idx_character_spell_slots_character_id ON character_spell_slots(character_id);
CREATE INDEX IF NOT EXISTS idx_character_combat_actions_character_id ON character_combat_actions(character_id);
CREATE INDEX IF NOT EXISTS idx_character_combat_actions_category ON character_combat_actions(category);

-- 設定 Row Level Security (RLS) 
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_ability_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_saving_throws ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_skill_proficiencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_current_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_currency ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_spells ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_spell_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_combat_actions ENABLE ROW LEVEL SECURITY;

-- 先刪除可能存在的政策
DROP POLICY IF EXISTS "Users can view own characters" ON characters;
DROP POLICY IF EXISTS "Users can view own character ability scores" ON character_ability_scores;
DROP POLICY IF EXISTS "Users can view own character saving throws" ON character_saving_throws;
DROP POLICY IF EXISTS "Users can view own character skills" ON character_skill_proficiencies;
DROP POLICY IF EXISTS "Users can view own character current stats" ON character_current_stats;
DROP POLICY IF EXISTS "Users can view own character currency" ON character_currency;
DROP POLICY IF EXISTS "Users can view own character items" ON character_items;
DROP POLICY IF EXISTS "Users can view own character spells" ON character_spells;
DROP POLICY IF EXISTS "Users can view own character spell slots" ON character_spell_slots;
DROP POLICY IF EXISTS "Users can view own character combat actions" ON character_combat_actions;

-- RLS 政策：用戶只能存取自己的角色資料
CREATE POLICY "Users can view own characters" ON characters FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own character ability scores" ON character_ability_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_ability_scores.character_id AND characters.user_id = auth.uid())
);

CREATE POLICY "Users can view own character saving throws" ON character_saving_throws FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_saving_throws.character_id AND characters.user_id = auth.uid())
);

CREATE POLICY "Users can view own character skills" ON character_skill_proficiencies FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_skill_proficiencies.character_id AND characters.user_id = auth.uid())
);

CREATE POLICY "Users can view own character current stats" ON character_current_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_current_stats.character_id AND characters.user_id = auth.uid())
);

CREATE POLICY "Users can view own character currency" ON character_currency FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_currency.character_id AND characters.user_id = auth.uid())
);

CREATE POLICY "Users can view own character items" ON character_items FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_items.character_id AND characters.user_id = auth.uid())
);

CREATE POLICY "Users can view own character spells" ON character_spells FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_spells.character_id AND characters.user_id = auth.uid())
);

CREATE POLICY "Users can view own character spell slots" ON character_spell_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_spell_slots.character_id AND characters.user_id = auth.uid())
);

CREATE POLICY "Users can view own character combat actions" ON character_combat_actions FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_combat_actions.character_id AND characters.user_id = auth.uid())
);