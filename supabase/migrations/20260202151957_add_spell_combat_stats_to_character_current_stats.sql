-- 遷移: add_spell_combat_stats_to_character_current_stats
-- 創建時間: 2026-02-02 15:19:57

-- 為 character_current_stats 表添加法術攻擊加值和法術豁免DC欄位
ALTER TABLE character_current_stats
ADD COLUMN spell_attack_bonus INTEGER DEFAULT 2,
ADD COLUMN spell_save_dc INTEGER DEFAULT 10;

-- 為現有記錄設置預設值
UPDATE character_current_stats
SET spell_attack_bonus = COALESCE(spell_attack_bonus, 2),
    spell_save_dc = COALESCE(spell_save_dc, 10)
WHERE spell_attack_bonus IS NULL OR spell_save_dc IS NULL;

-- 記得添加索引和 RLS 政策
-- CREATE INDEX IF NOT EXISTS idx_new_table_id ON new_table(id);
-- ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "policy_name" ON new_table FOR ALL USING (auth.uid() = user_id);
