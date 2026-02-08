-- character_stats_basic_bonus: 戰鬥屬性改為 basic+bonus 結構
-- 舊欄位直接移除，既有值 migration 到 *_basic，*_bonus 預設 0

-- 1. character_current_stats: 新增 basic/bonus 欄位
ALTER TABLE character_current_stats
  ADD COLUMN IF NOT EXISTS max_hp_basic INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_hp_bonus INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ac_basic INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS ac_bonus INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS initiative_basic INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS initiative_bonus INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speed_basic INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS speed_bonus INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attack_hit_basic INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attack_hit_bonus INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attack_damage_basic INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attack_damage_bonus INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spell_hit_basic INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS spell_hit_bonus INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spell_dc_basic INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS spell_dc_bonus INTEGER DEFAULT 0;

-- 2. 遷移既有資料到 basic，bonus 設為 0
UPDATE character_current_stats SET
  max_hp_basic = COALESCE(max_hp, 1),
  max_hp_bonus = 0,
  ac_basic = COALESCE(armor_class, 10),
  ac_bonus = 0,
  initiative_basic = COALESCE(initiative_bonus, 0),
  initiative_bonus = 0,
  speed_basic = COALESCE(speed, 30),
  speed_bonus = 0,
  attack_hit_basic = COALESCE(weapon_attack_bonus, 0),
  attack_hit_bonus = 0,
  attack_damage_basic = COALESCE(weapon_damage_bonus, 0),
  attack_damage_bonus = 0,
  spell_hit_basic = COALESCE(spell_attack_bonus, 2),
  spell_hit_bonus = 0,
  spell_dc_basic = COALESCE(spell_save_dc, 10),
  spell_dc_bonus = 0;

-- 3. 移除舊欄位
ALTER TABLE character_current_stats
  DROP COLUMN IF EXISTS max_hp,
  DROP COLUMN IF EXISTS armor_class,
  DROP COLUMN IF EXISTS initiative_bonus,
  DROP COLUMN IF EXISTS speed,
  DROP COLUMN IF EXISTS weapon_attack_bonus,
  DROP COLUMN IF EXISTS weapon_damage_bonus,
  DROP COLUMN IF EXISTS spell_attack_bonus,
  DROP COLUMN IF EXISTS spell_save_dc;

-- 4. character_saving_throws: 新增 misc_bonus
ALTER TABLE character_saving_throws
  ADD COLUMN IF NOT EXISTS misc_bonus INTEGER DEFAULT 0;

-- 5. character_skill_proficiencies: 新增 misc_bonus
ALTER TABLE character_skill_proficiencies
  ADD COLUMN IF NOT EXISTS misc_bonus INTEGER DEFAULT 0;
