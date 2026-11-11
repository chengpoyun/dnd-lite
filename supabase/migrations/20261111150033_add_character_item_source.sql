-- 遷移: add_character_item_source
-- 創建時間: 2026-11-11 15:00:33
--
-- 道具新增「來源」欄位（MH素材顯示掉落自哪隻怪物，如「紅蓮爆鱗龍」；採集素材為「採集」）。
-- 與 name_en_override、rarity_override 一致，存的是角色版快照；null 代表未填。
-- 只是在既有資料表加欄位，不需要另外 GRANT（沿用資料表既有授權）。

ALTER TABLE character_items
  ADD COLUMN IF NOT EXISTS source_override TEXT;
