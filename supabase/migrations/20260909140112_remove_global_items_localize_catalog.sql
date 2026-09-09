-- 遷移: remove_global_items_localize_catalog
-- 創建時間: 2026-09-09 14:01:12
-- 說明: MH素材與通用道具目錄改為本地 JSON（data/mh-materials.json、data/general-items.json）維護，
--      「獲得物品」不再查詢 global_items。前一步已將僅存的 11 筆透過 item_id 外鍵連到 global_items
--      的角色物品，把關聯資料複製進各自的 override 欄位並清空 item_id（已於本檔案 apply 前用
--      supabase db query 手動驗證每一筆都正確，執行前已確認 character_items.item_id 沒有非 NULL 的資料列）。
--      這裡只做結構變更：拿掉 character_items.item_id 外鍵欄位、整張 global_items 表格。

ALTER TABLE character_items DROP COLUMN IF EXISTS item_id;

DROP TABLE IF EXISTS global_items;
