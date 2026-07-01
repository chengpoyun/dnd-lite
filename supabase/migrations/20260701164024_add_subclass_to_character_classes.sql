-- 遷移: add_subclass_to_character_classes
-- 創建時間: 2026-07-01 16:40:24
-- 為 character_classes 新增子職業欄位（選填，低等級角色尚未取得子職業時為 NULL）

ALTER TABLE character_classes
  ADD COLUMN IF NOT EXISTS subclass_name TEXT;
