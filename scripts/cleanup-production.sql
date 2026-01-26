-- ===============================================
-- 清理 Production 環境所有測試資料
-- 執行方式：複製到 Supabase Dashboard SQL Editor
-- ===============================================

-- 1. 刪除所有角色相關資料（按依賴順序）
DELETE FROM character_items;
DELETE FROM character_spells; 
DELETE FROM character_spell_slots;
DELETE FROM character_combat_actions;
DELETE FROM character_skill_proficiencies;
DELETE FROM character_saving_throws;
DELETE FROM character_currency;
DELETE FROM character_current_stats;
DELETE FROM character_ability_scores;
DELETE FROM characters;

-- 2. UUID 不需要重置序列（因為使用 gen_random_uuid()）
-- 資料已清理完成

-- 3. 驗證清理結果
SELECT 'characters' as table_name, count(*) as count FROM characters
UNION ALL
SELECT 'character_ability_scores', count(*) FROM character_ability_scores  
UNION ALL
SELECT 'character_current_stats', count(*) FROM character_current_stats
UNION ALL
SELECT 'character_currency', count(*) FROM character_currency
UNION ALL
SELECT 'character_saving_throws', count(*) FROM character_saving_throws
UNION ALL
SELECT 'character_skill_proficiencies', count(*) FROM character_skill_proficiencies
UNION ALL
SELECT 'character_items', count(*) FROM character_items
UNION ALL
SELECT 'character_spells', count(*) FROM character_spells
UNION ALL
SELECT 'character_spell_slots', count(*) FROM character_spell_slots
UNION ALL
SELECT 'character_combat_actions', count(*) FROM character_combat_actions;