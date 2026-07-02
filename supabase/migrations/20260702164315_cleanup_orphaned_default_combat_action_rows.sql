-- 遷移: cleanup_orphaned_default_combat_action_rows
-- 創建時間: 2026-07-02 16:43:15
-- 目的：清除 services/detailedCharacter.ts 的 createDefaultCombatActions（已移除）
-- 過去每次建立角色時寫入的垃圾資料。這些列 is_custom=false 且沒有 default_item_id，
-- 不符合 CombatItemService.getCombatItems 合併邏輯的任何一種分類（自訂項目或
-- 修改過的預設項目），從未被戰鬥頁讀取或顯示過。
--
-- is_default=true 目前只由該函式寫入 DB（其餘用法僅為記憶體中的顯示用物件，
-- 不會落地），故用 is_default=true AND default_item_id IS NULL 可精確鎖定這批垃圾列。
DELETE FROM character_combat_actions
WHERE is_default = true
  AND default_item_id IS NULL;
