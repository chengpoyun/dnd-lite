-- 初始化 D&D Lite 應用程式資料庫結構
-- 合併所有開發期間的遷移腳本為單一初始化腳本
-- 創建日期: 2026-01-26

-- 啟用必要的擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== 核心角色表 =====

CREATE TABLE IF NOT EXISTS characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT,
  name TEXT NOT NULL,
  character_class TEXT NOT NULL DEFAULT '戰士',
  level INTEGER NOT NULL DEFAULT 1,
  experience INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 確保每個用戶的角色名稱唯一
  UNIQUE(user_id, name),
  -- 匿名用戶約束
  CONSTRAINT valid_user_or_anonymous CHECK (
    (user_id IS NOT NULL AND anonymous_id IS NULL AND is_anonymous = false) OR
    (user_id IS NULL AND anonymous_id IS NOT NULL AND is_anonymous = true)
  )
);

-- ===== 角色屬性表 =====

CREATE TABLE IF NOT EXISTS character_ability_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  strength INTEGER NOT NULL DEFAULT 10,
  dexterity INTEGER NOT NULL DEFAULT 10,
  constitution INTEGER NOT NULL DEFAULT 10,
  intelligence INTEGER NOT NULL DEFAULT 10,
  wisdom INTEGER NOT NULL DEFAULT 10,
  charisma INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id)
);

-- ===== 豁免骰熟練度表 =====

CREATE TABLE IF NOT EXISTS character_saving_throws (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  ability TEXT NOT NULL CHECK (ability IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma')),
  is_proficient BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, ability)
);

-- ===== 技能熟練度表 =====

CREATE TABLE IF NOT EXISTS character_skill_proficiencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  proficiency_level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, skill_name)
);

-- ===== 當前狀態表 =====

CREATE TABLE IF NOT EXISTS character_current_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  current_hp INTEGER NOT NULL DEFAULT 1,
  max_hp INTEGER NOT NULL DEFAULT 1,
  temporary_hp INTEGER NOT NULL DEFAULT 0,
  current_hit_dice INTEGER NOT NULL DEFAULT 0,
  total_hit_dice INTEGER NOT NULL DEFAULT 1,
  hit_die_type TEXT NOT NULL DEFAULT 'd8',
  armor_class INTEGER NOT NULL DEFAULT 10,
  initiative_bonus INTEGER NOT NULL DEFAULT 0,
  speed INTEGER NOT NULL DEFAULT 30,
  extra_data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id)
);

-- ===== 貨幣表 =====

CREATE TABLE IF NOT EXISTS character_currency (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  copper INTEGER NOT NULL DEFAULT 0,
  silver INTEGER NOT NULL DEFAULT 0,
  electrum INTEGER NOT NULL DEFAULT 0,
  gp INTEGER NOT NULL DEFAULT 0,
  platinum INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id)
);

-- ===== 物品表 =====

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
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 法術表 =====

CREATE TABLE IF NOT EXISTS character_spells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 0 AND level <= 9),
  school TEXT,
  casting_time TEXT,
  range_distance TEXT,
  components TEXT,
  duration TEXT,
  description TEXT,
  is_prepared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 法術位表 =====

CREATE TABLE IF NOT EXISTS character_spell_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  spell_level INTEGER NOT NULL CHECK (spell_level >= 1 AND spell_level <= 9),
  total_slots INTEGER NOT NULL DEFAULT 0,
  used_slots INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, spell_level)
);

-- ===== 戰鬥動作表 =====

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

-- ===== 索引創建 =====

-- 角色表索引
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_anonymous_id ON characters(anonymous_id);

-- 屬性表索引
CREATE INDEX IF NOT EXISTS idx_character_ability_scores_character_id ON character_ability_scores(character_id);
CREATE INDEX IF NOT EXISTS idx_character_saving_throws_character_id ON character_saving_throws(character_id);
CREATE INDEX IF NOT EXISTS idx_character_skill_proficiencies_character_id ON character_skill_proficiencies(character_id);
CREATE INDEX IF NOT EXISTS idx_character_current_stats_character_id ON character_current_stats(character_id);
CREATE INDEX IF NOT EXISTS idx_character_currency_character_id ON character_currency(character_id);

-- 物品和法術索引
CREATE INDEX IF NOT EXISTS idx_character_items_character_id ON character_items(character_id);
CREATE INDEX IF NOT EXISTS idx_character_spells_character_id ON character_spells(character_id);
CREATE INDEX IF NOT EXISTS idx_character_spell_slots_character_id ON character_spell_slots(character_id);

-- 戰鬥動作索引
CREATE INDEX IF NOT EXISTS idx_character_combat_actions_character_id ON character_combat_actions(character_id);
CREATE INDEX IF NOT EXISTS idx_character_combat_actions_category ON character_combat_actions(category);

-- JSONB 索引
CREATE INDEX IF NOT EXISTS idx_character_current_stats_extra_data ON character_current_stats USING GIN (extra_data);
CREATE INDEX IF NOT EXISTS idx_character_items_properties ON character_items USING GIN (properties);

-- ===== 行級安全性 (RLS) =====

-- 啟用 RLS
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

-- 清理可能存在的舊政策
DROP POLICY IF EXISTS "Users can view own characters" ON characters;
DROP POLICY IF EXISTS "Users can view own character ability scores" ON character_ability_scores;
DROP POLICY IF EXISTS "Users can view own character saving throws" ON character_saving_throws;
DROP POLICY IF EXISTS "Users can view own character skill proficiencies" ON character_skill_proficiencies;
DROP POLICY IF EXISTS "Users can view own character current stats" ON character_current_stats;
DROP POLICY IF EXISTS "Users can view own character currency" ON character_currency;
DROP POLICY IF EXISTS "Users can view own character items" ON character_items;
DROP POLICY IF EXISTS "Users can view own character spells" ON character_spells;
DROP POLICY IF EXISTS "Users can view own character spell slots" ON character_spell_slots;
DROP POLICY IF EXISTS "Users can view own character combat actions" ON character_combat_actions;

-- 創建 RLS 政策 - 角色表
CREATE POLICY "Users can view own characters" ON characters FOR ALL USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
  (auth.uid() IS NULL AND is_anonymous = true)
);

-- 其他表的 RLS 政策
CREATE POLICY "Users can view own character ability scores" ON character_ability_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_ability_scores.character_id 
    AND ((auth.uid() IS NOT NULL AND characters.user_id = auth.uid()) OR 
         (auth.uid() IS NULL AND characters.is_anonymous = true)))
);

CREATE POLICY "Users can view own character saving throws" ON character_saving_throws FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_saving_throws.character_id 
    AND ((auth.uid() IS NOT NULL AND characters.user_id = auth.uid()) OR 
         (auth.uid() IS NULL AND characters.is_anonymous = true)))
);

CREATE POLICY "Users can view own character skill proficiencies" ON character_skill_proficiencies FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_skill_proficiencies.character_id 
    AND ((auth.uid() IS NOT NULL AND characters.user_id = auth.uid()) OR 
         (auth.uid() IS NULL AND characters.is_anonymous = true)))
);

CREATE POLICY "Users can view own character current stats" ON character_current_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_current_stats.character_id 
    AND ((auth.uid() IS NOT NULL AND characters.user_id = auth.uid()) OR 
         (auth.uid() IS NULL AND characters.is_anonymous = true)))
);

CREATE POLICY "Users can view own character currency" ON character_currency FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_currency.character_id 
    AND ((auth.uid() IS NOT NULL AND characters.user_id = auth.uid()) OR 
         (auth.uid() IS NULL AND characters.is_anonymous = true)))
);

CREATE POLICY "Users can view own character items" ON character_items FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_items.character_id 
    AND ((auth.uid() IS NOT NULL AND characters.user_id = auth.uid()) OR 
         (auth.uid() IS NULL AND characters.is_anonymous = true)))
);

CREATE POLICY "Users can view own character spells" ON character_spells FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_spells.character_id 
    AND ((auth.uid() IS NOT NULL AND characters.user_id = auth.uid()) OR 
         (auth.uid() IS NULL AND characters.is_anonymous = true)))
);

CREATE POLICY "Users can view own character spell slots" ON character_spell_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_spell_slots.character_id 
    AND ((auth.uid() IS NOT NULL AND characters.user_id = auth.uid()) OR 
         (auth.uid() IS NULL AND characters.is_anonymous = true)))
);

CREATE POLICY "Users can view own character combat actions" ON character_combat_actions FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_combat_actions.character_id 
    AND ((auth.uid() IS NOT NULL AND characters.user_id = auth.uid()) OR 
         (auth.uid() IS NULL AND characters.is_anonymous = true)))
);

-- 添加註釋
COMMENT ON TABLE characters IS '角色基本資料表';
COMMENT ON TABLE character_ability_scores IS '角色六項能力值表';
COMMENT ON TABLE character_saving_throws IS '角色豁免骰熟練度表';
COMMENT ON TABLE character_skill_proficiencies IS '角色技能熟練度表';
COMMENT ON TABLE character_current_stats IS '角色當前狀態表（血量、護甲等）';
COMMENT ON COLUMN character_current_stats.extra_data IS '儲存額外的角色資料，如修整期、名聲、聲望、自定義記錄等';
COMMENT ON TABLE character_currency IS '角色貨幣表';
COMMENT ON TABLE character_items IS '角色物品表';
COMMENT ON TABLE character_spells IS '角色法術表';
COMMENT ON TABLE character_spell_slots IS '角色法術位表';
COMMENT ON TABLE character_combat_actions IS '角色戰鬥動作表';