-- 遷移: add_character_abilities_override_fields
-- 創建時間: 2026-02-02 11:21:38
-- 說明: 在 character_abilities 表中添加覆蓋欄位，讓角色可以客製化能力而不影響全域資料

-- 添加覆蓋欄位（nullable，如果為 NULL 則使用 abilities 表的值）
ALTER TABLE character_abilities 
  ADD COLUMN name_override TEXT,
  ADD COLUMN name_en_override TEXT,
  ADD COLUMN description_override TEXT,
  ADD COLUMN source_override TEXT CHECK (source_override IN ('種族', '職業', '專長', '背景', '其他')),
  ADD COLUMN recovery_type_override TEXT CHECK (recovery_type_override IN ('常駐', '短休', '長休'));
