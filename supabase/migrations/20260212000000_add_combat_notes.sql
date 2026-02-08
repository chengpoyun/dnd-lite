-- 遷移: add_combat_notes
-- 新增 character_current_stats.combat_notes 欄位，用於儲存戰鬥筆記

ALTER TABLE character_current_stats ADD COLUMN IF NOT EXISTS combat_notes TEXT DEFAULT NULL;
COMMENT ON COLUMN character_current_stats.combat_notes IS '戰鬥筆記（加值表上方）';
