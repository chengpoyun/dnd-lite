-- 為外鍵欄位建立索引，滿足 Supabase Performance Advisor 0001 unindexed_foreign_keys
-- 創建時間: 2026-02-21
-- 說明: 外鍵有對應索引可改善 JOIN 與 CASCADE 效能。此三索引可能被 0005 unused_index 標示為未使用，
--       仍刻意保留以符合 0001 外鍵索引建議；若移除會再次觸發 unindexed_foreign_keys。

CREATE INDEX IF NOT EXISTS idx_character_combat_actions_default_item_id
  ON public.character_combat_actions(default_item_id);

CREATE INDEX IF NOT EXISTS idx_characters_user_id
  ON public.characters(user_id);

CREATE INDEX IF NOT EXISTS idx_combat_sessions_user_id
  ON public.combat_sessions(user_id);
