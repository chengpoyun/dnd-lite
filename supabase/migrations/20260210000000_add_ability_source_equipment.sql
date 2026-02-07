-- 能力來源新增「裝備」，順序：職業、種族、裝備、專長、背景、其他

-- abilities.source：放寬 CHECK 以允許「裝備」
ALTER TABLE abilities DROP CONSTRAINT IF EXISTS abilities_source_check;
ALTER TABLE abilities ADD CONSTRAINT abilities_source_check
  CHECK (source IN ('職業', '種族', '裝備', '專長', '背景', '其他'));

-- character_abilities.source_override：同上
ALTER TABLE character_abilities DROP CONSTRAINT IF EXISTS character_abilities_source_override_check;
ALTER TABLE character_abilities ADD CONSTRAINT character_abilities_source_override_check
  CHECK (source_override IS NULL OR source_override IN ('職業', '種族', '裝備', '專長', '背景', '其他'));
