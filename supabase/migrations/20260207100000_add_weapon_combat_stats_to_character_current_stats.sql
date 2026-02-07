-- 遷移: add_weapon_combat_stats_to_character_current_stats
-- 為 character_current_stats 表添加武器命中加值和武器傷害加值欄位（所有職業可見）

ALTER TABLE character_current_stats ADD COLUMN IF NOT EXISTS weapon_attack_bonus INTEGER DEFAULT 0;
ALTER TABLE character_current_stats ADD COLUMN IF NOT EXISTS weapon_damage_bonus INTEGER DEFAULT 0;

UPDATE character_current_stats
SET weapon_attack_bonus = COALESCE(weapon_attack_bonus, 0),
    weapon_damage_bonus = COALESCE(weapon_damage_bonus, 0)
WHERE weapon_attack_bonus IS NULL OR weapon_damage_bonus IS NULL;
