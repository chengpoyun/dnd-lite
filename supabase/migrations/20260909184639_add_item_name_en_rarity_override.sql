-- 遷移: add_item_name_en_rarity_override
-- 創建時間: 2026-09-09 18:46:39
-- 說明: character_items 新增英文名稱／稀有度覆寫欄位。
--      稀有度統一存文字：一般道具存 D&D 標準稀有度文字（如「稀有」），
--      MH素材存來源怪物的 CR 數字轉成的文字（如「35」），顯示層依類別決定怎麼呈現。

ALTER TABLE character_items ADD COLUMN IF NOT EXISTS name_en_override text;
ALTER TABLE character_items ADD COLUMN IF NOT EXISTS rarity_override text;
