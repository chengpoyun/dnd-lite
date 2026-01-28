-- 新增職業系統 - 支援兼職和多生命骰池
-- 日期: 2026-01-28  
-- 描述: 為 D&D 5E 兼職系統新增 character_classes 和 character_hit_dice_pools 表格

-- ===== 角色職業詳細表 =====
CREATE TABLE IF NOT EXISTS character_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  class_level INTEGER NOT NULL CHECK (class_level > 0),
  hit_die TEXT NOT NULL CHECK (hit_die IN ('d4', 'd6', 'd8', 'd10', 'd12')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 確保每角色每職業只能有一條記錄
  UNIQUE(character_id, class_name)
);

-- ===== 角色生命骰池表 =====
CREATE TABLE IF NOT EXISTS character_hit_dice_pools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  
  -- 各類型生命骰的當前/總數
  d12_current INTEGER NOT NULL DEFAULT 0 CHECK (d12_current >= 0),
  d12_total INTEGER NOT NULL DEFAULT 0 CHECK (d12_total >= 0 AND d12_current <= d12_total),
  d10_current INTEGER NOT NULL DEFAULT 0 CHECK (d10_current >= 0), 
  d10_total INTEGER NOT NULL DEFAULT 0 CHECK (d10_total >= 0 AND d10_current <= d10_total),
  d8_current INTEGER NOT NULL DEFAULT 0 CHECK (d8_current >= 0),
  d8_total INTEGER NOT NULL DEFAULT 0 CHECK (d8_total >= 0 AND d8_current <= d8_total),
  d6_current INTEGER NOT NULL DEFAULT 0 CHECK (d6_current >= 0),
  d6_total INTEGER NOT NULL DEFAULT 0 CHECK (d6_total >= 0 AND d6_current <= d6_total),
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 每角色只能有一條生命骰池記錄
  UNIQUE(character_id)
);

-- ===== RLS 政策 =====
-- character_classes 表格政策
CREATE POLICY "Users can manage own character classes" ON character_classes FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_classes.character_id 
    AND ((auth.uid() IS NOT NULL AND characters.user_id = auth.uid()) OR 
         (auth.uid() IS NULL AND characters.is_anonymous = true)))
);

-- character_hit_dice_pools 表格政策
CREATE POLICY "Users can manage own hit dice pools" ON character_hit_dice_pools FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_hit_dice_pools.character_id 
    AND ((auth.uid() IS NOT NULL AND characters.user_id = auth.uid()) OR 
         (auth.uid() IS NULL AND characters.is_anonymous = true)))
);

-- ===== 為現有角色創建預設職業和生命骰池 =====
-- 為現有角色創建單職業記錄
INSERT INTO character_classes (character_id, class_name, class_level, hit_die, is_primary)
SELECT 
  id, 
  COALESCE(character_class, '戰士') as class_name,
  COALESCE(level, 1) as class_level,
  CASE COALESCE(character_class, '戰士')
    WHEN '野蠻人' THEN 'd12'
    WHEN '戰士' THEN 'd10'
    WHEN '聖騎士' THEN 'd10'
    WHEN '騎兵' THEN 'd10'
    WHEN '牧師' THEN 'd8'
    WHEN '德魯伊' THEN 'd8' 
    WHEN '遊俠' THEN 'd8'
    WHEN '術士' THEN 'd8'
    WHEN '邪術師' THEN 'd8'
    WHEN '盜賊' THEN 'd8'
    WHEN '吟遊詩人' THEN 'd8'
    WHEN '法師' THEN 'd6'
    ELSE 'd8'
  END as hit_die,
  true as is_primary
FROM characters 
WHERE id NOT IN (SELECT character_id FROM character_classes);

-- 為現有角色創建生命骰池
INSERT INTO character_hit_dice_pools (character_id, d12_current, d12_total, d10_current, d10_total, d8_current, d8_total, d6_current, d6_total)
SELECT 
  c.id as character_id,
  CASE WHEN cc.hit_die = 'd12' THEN COALESCE(c.level, 1) ELSE 0 END as d12_current,
  CASE WHEN cc.hit_die = 'd12' THEN COALESCE(c.level, 1) ELSE 0 END as d12_total,
  CASE WHEN cc.hit_die = 'd10' THEN COALESCE(c.level, 1) ELSE 0 END as d10_current,
  CASE WHEN cc.hit_die = 'd10' THEN COALESCE(c.level, 1) ELSE 0 END as d10_total,
  CASE WHEN cc.hit_die = 'd8' THEN COALESCE(c.level, 1) ELSE 0 END as d8_current,
  CASE WHEN cc.hit_die = 'd8' THEN COALESCE(c.level, 1) ELSE 0 END as d8_total,
  CASE WHEN cc.hit_die = 'd6' THEN COALESCE(c.level, 1) ELSE 0 END as d6_current,
  CASE WHEN cc.hit_die = 'd6' THEN COALESCE(c.level, 1) ELSE 0 END as d6_total
FROM characters c
JOIN character_classes cc ON c.id = cc.character_id
WHERE c.id NOT IN (SELECT character_id FROM character_hit_dice_pools);