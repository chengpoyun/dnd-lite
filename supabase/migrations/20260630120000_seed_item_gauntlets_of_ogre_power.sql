-- 種子資料：全域物品「食人魔力量手套」(Gauntlets of Ogre Power)
-- 以 stat_bonuses.specialEffectId = 'ogrePower' 由程式計算（屬性值下限 19）：
--   穿戴（裝備中）時，若「所有加值後的最終力量」低於 19 才補足至 19；最終已 ≥19 則無效。
-- 僅在尚不存在時新增，避免重複執行報錯。
INSERT INTO global_items (name, name_en, description, category, is_magic, equipment_kind, affects_stats, stat_bonuses)
SELECT
  '食人魔力量手套',
  'Gauntlets of Ogre Power',
  E'穿戴時你的力量值變為 **19**（若你原本的力量已達 19 或更高則無效）。\n\n稀有度：非凡（Uncommon）；需要同調。',
  '裝備',
  true,
  'hands',
  true,
  '{"specialEffectId":"ogrePower"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM global_items WHERE LOWER(name_en) = 'gauntlets of ogre power'
);
