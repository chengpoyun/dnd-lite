-- 將已存在的「健壯」能力改為使用 specialEffectId（affects_stats = true，stat_bonuses.specialEffectId = 'tough'）

UPDATE abilities
SET affects_stats = true,
    stat_bonuses = '{"specialEffectId":"tough"}'::jsonb
WHERE LOWER(name_en) = 'tough';
