-- 種子資料：特殊能力「健壯」(Tough)，以 stat_bonuses.specialEffectId = 'tough' 由程式計算（每等級 +2 最大生命）
-- 僅在尚不存在時新增，避免重複執行報錯

INSERT INTO abilities (name, name_en, description, source, recovery_type, affects_stats, stat_bonuses)
SELECT '健壯', 'tough', '額外增加 總等級*2 的最大生命值。', '專長', '常駐', true, '{"specialEffectId":"tough"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM abilities WHERE LOWER(name_en) = 'tough');
