-- 遷移: remove_abilities_spells_localize_catalog
-- 創建時間: 2026-09-09 16:13:03
-- 說明: 能力／法術目錄改為本地 JSON（data/abilities.json、data/spells.json）維護，
--      「學習特殊能力」「學習法術」不再查詢 abilities / spells 表。前一步已將全部
--      （含測試角色）透過 ability_id / spell_id 外鍵連到 abilities / spells 的角色資料，
--      把關聯資料複製進各自的 override 欄位並清空外鍵（已於本檔案 apply 前用
--      supabase db query 手動驗證每一筆都正確，執行前已確認
--      character_abilities.ability_id 與 character_spells.spell_id 都沒有非 NULL 的資料列）。
--      這裡只做結構變更：拿掉兩個外鍵欄位、整張 abilities／spells 表格。
--      （先拆欄位再砍表，即使前一步有遺漏也不會被 ON DELETE CASCADE 誤刪其他資料）

ALTER TABLE character_abilities DROP COLUMN IF EXISTS ability_id;
ALTER TABLE character_spells DROP COLUMN IF EXISTS spell_id;

DROP TABLE IF EXISTS abilities;
DROP TABLE IF EXISTS spells;
