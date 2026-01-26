-- 將 character_currency 表中的 gold 欄位重命名為 gp
-- 統一應用程式和資料庫的欄位命名

ALTER TABLE character_currency 
RENAME COLUMN gold TO gp;

-- 添加註解說明
COMMENT ON COLUMN character_currency.gp IS '金幣數量 (Gold Pieces)';