-- 添加 character_spells override 欄位（角色專屬客製化）
-- 允許玩家客製化自己已學習的法術，不影響 spells 表的全域資料

ALTER TABLE character_spells 
  ADD COLUMN IF NOT EXISTS name_override TEXT,
  ADD COLUMN IF NOT EXISTS name_en_override TEXT,
  ADD COLUMN IF NOT EXISTS level_override INTEGER,
  ADD COLUMN IF NOT EXISTS casting_time_override TEXT,
  ADD COLUMN IF NOT EXISTS school_override TEXT CHECK (school_override IN ('塑能', '惑控', '預言', '咒法', '變化', '防護', '死靈', '幻術')),
  ADD COLUMN IF NOT EXISTS concentration_override BOOLEAN,
  ADD COLUMN IF NOT EXISTS ritual_override BOOLEAN,
  ADD COLUMN IF NOT EXISTS duration_override TEXT,
  ADD COLUMN IF NOT EXISTS range_override TEXT,
  ADD COLUMN IF NOT EXISTS source_override TEXT,
  ADD COLUMN IF NOT EXISTS verbal_override BOOLEAN,
  ADD COLUMN IF NOT EXISTS somatic_override BOOLEAN,
  ADD COLUMN IF NOT EXISTS material_override TEXT,
  ADD COLUMN IF NOT EXISTS description_override TEXT;

-- 添加註解說明
COMMENT ON COLUMN character_spells.name_override IS '客製化中文名稱（優先顯示）';
COMMENT ON COLUMN character_spells.name_en_override IS '客製化英文名稱（優先顯示）';
COMMENT ON COLUMN character_spells.level_override IS '客製化法術等級';
COMMENT ON COLUMN character_spells.casting_time_override IS '客製化施法時間';
COMMENT ON COLUMN character_spells.school_override IS '客製化學派';
COMMENT ON COLUMN character_spells.concentration_override IS '客製化是否需要專注';
COMMENT ON COLUMN character_spells.ritual_override IS '客製化是否為儀式';
COMMENT ON COLUMN character_spells.duration_override IS '客製化持續時間';
COMMENT ON COLUMN character_spells.range_override IS '客製化施法距離';
COMMENT ON COLUMN character_spells.source_override IS '客製化來源';
COMMENT ON COLUMN character_spells.verbal_override IS '客製化是否需要言語成分';
COMMENT ON COLUMN character_spells.somatic_override IS '客製化是否需要姿勢成分';
COMMENT ON COLUMN character_spells.material_override IS '客製化材料成分';
COMMENT ON COLUMN character_spells.description_override IS '客製化法術描述';
