-- 新增屬性值和調整值的額外加成欄位
-- 用於支援裝備或魔法效果帶來的屬性增強

-- 為 character_ability_scores 表新增 12 個欄位
-- 每個屬性有兩個欄位：屬性值加成 (_bonus) 和調整值加成 (_modifier_bonus)
ALTER TABLE character_ability_scores
  -- 屬性值加成（會影響最終調整值的計算）
  ADD COLUMN strength_bonus INTEGER DEFAULT 0,
  ADD COLUMN dexterity_bonus INTEGER DEFAULT 0,
  ADD COLUMN constitution_bonus INTEGER DEFAULT 0,
  ADD COLUMN intelligence_bonus INTEGER DEFAULT 0,
  ADD COLUMN wisdom_bonus INTEGER DEFAULT 0,
  ADD COLUMN charisma_bonus INTEGER DEFAULT 0,
  
  -- 調整值加成（直接加到最終調整值）
  ADD COLUMN strength_modifier_bonus INTEGER DEFAULT 0,
  ADD COLUMN dexterity_modifier_bonus INTEGER DEFAULT 0,
  ADD COLUMN constitution_modifier_bonus INTEGER DEFAULT 0,
  ADD COLUMN intelligence_modifier_bonus INTEGER DEFAULT 0,
  ADD COLUMN wisdom_modifier_bonus INTEGER DEFAULT 0,
  ADD COLUMN charisma_modifier_bonus INTEGER DEFAULT 0;

-- 註解說明計算邏輯
COMMENT ON COLUMN character_ability_scores.strength_bonus IS '力量屬性值額外加成（裝備/魔法效果）';
COMMENT ON COLUMN character_ability_scores.strength_modifier_bonus IS '力量調整值額外加成（裝備/魔法效果）';
COMMENT ON COLUMN character_ability_scores.dexterity_bonus IS '敏捷屬性值額外加成（裝備/魔法效果）';
COMMENT ON COLUMN character_ability_scores.dexterity_modifier_bonus IS '敏捷調整值額外加成（裝備/魔法效果）';
COMMENT ON COLUMN character_ability_scores.constitution_bonus IS '體質屬性值額外加成（裝備/魔法效果）';
COMMENT ON COLUMN character_ability_scores.constitution_modifier_bonus IS '體質調整值額外加成（裝備/魔法效果）';
COMMENT ON COLUMN character_ability_scores.intelligence_bonus IS '智力屬性值額外加成（裝備/魔法效果）';
COMMENT ON COLUMN character_ability_scores.intelligence_modifier_bonus IS '智力調整值額外加成（裝備/魔法效果）';
COMMENT ON COLUMN character_ability_scores.wisdom_bonus IS '感知屬性值額外加成（裝備/魔法效果）';
COMMENT ON COLUMN character_ability_scores.wisdom_modifier_bonus IS '感知調整值額外加成（裝備/魔法效果）';
COMMENT ON COLUMN character_ability_scores.charisma_bonus IS '魅力屬性值額外加成（裝備/魔法效果）';
COMMENT ON COLUMN character_ability_scores.charisma_modifier_bonus IS '魅力調整值額外加成（裝備/魔法效果）';

-- 計算邏輯說明：
-- 最終屬性值 = 基礎屬性值 + 屬性值加成 (ability_bonus)
-- 最終調整值 = floor((最終屬性值 - 10) / 2) + 調整值加成 (modifier_bonus)
