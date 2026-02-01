-- 修改金幣欄位以支援小數點（至少到第二位）
-- Change GP column to support decimal values (at least 2 decimal places)

-- 將 gp 欄位從 INTEGER 改為 NUMERIC(10,2)
-- NUMERIC(10,2) 表示：總共10位數字，其中2位為小數
-- 例如：可以存儲 99999999.99
ALTER TABLE character_currency 
  ALTER COLUMN gp TYPE NUMERIC(10,2);

-- 確保現有資料正確轉換（整數會自動轉為 .00）
-- Existing integer values will automatically be converted to .00 format

COMMENT ON COLUMN character_currency.gp IS '金幣數量（支援小數點後兩位）';
