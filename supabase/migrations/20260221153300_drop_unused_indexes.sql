-- 移除 Supabase Performance Advisor 回報的未使用索引 (0005 unused_index)
-- 創建時間: 2026-02-21
-- 說明: 僅刪除索引，不變更表結構或查詢邏輯，不影響任何既有功能；若未來查詢模式改變需某欄位索引，可再以新遷移建立。

DROP INDEX IF EXISTS public.idx_character_notes_updated_at;
DROP INDEX IF EXISTS public.idx_characters_user_id;
DROP INDEX IF EXISTS public.idx_character_combat_actions_default;
DROP INDEX IF EXISTS public.idx_character_combat_actions_category;
DROP INDEX IF EXISTS public.idx_combat_sessions_active;
DROP INDEX IF EXISTS public.idx_characters_is_anonymous;
DROP INDEX IF EXISTS public.idx_character_current_stats_extra_data;
DROP INDEX IF EXISTS public.idx_user_settings_session_token;
DROP INDEX IF EXISTS public.idx_combat_monsters_resistances;
DROP INDEX IF EXISTS public.idx_combat_sessions_user_id;
DROP INDEX IF EXISTS public.idx_abilities_source;
DROP INDEX IF EXISTS public.idx_abilities_recovery_type;
DROP INDEX IF EXISTS public.idx_abilities_affects_stats;
DROP INDEX IF EXISTS public.idx_character_abilities_affects_stats;
DROP INDEX IF EXISTS public.idx_character_items_affects_stats;
DROP INDEX IF EXISTS public.idx_character_items_equipment_slot;
