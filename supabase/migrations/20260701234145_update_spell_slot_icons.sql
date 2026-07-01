-- 遷移: update_spell_slot_icons
-- 創建時間: 2026-07-01 23:41:45
-- 目的：法術位範本圖示改為對應環位的數字 emoji，取代原本統一的 🔮。

UPDATE default_combat_actions SET icon = '1️⃣' WHERE spell_level = 1;
UPDATE default_combat_actions SET icon = '2️⃣' WHERE spell_level = 2;
UPDATE default_combat_actions SET icon = '3️⃣' WHERE spell_level = 3;
UPDATE default_combat_actions SET icon = '4️⃣' WHERE spell_level = 4;
UPDATE default_combat_actions SET icon = '5️⃣' WHERE spell_level = 5;
UPDATE default_combat_actions SET icon = '6️⃣' WHERE spell_level = 6;
UPDATE default_combat_actions SET icon = '7️⃣' WHERE spell_level = 7;
UPDATE default_combat_actions SET icon = '8️⃣' WHERE spell_level = 8;
UPDATE default_combat_actions SET icon = '9️⃣' WHERE spell_level = 9;
