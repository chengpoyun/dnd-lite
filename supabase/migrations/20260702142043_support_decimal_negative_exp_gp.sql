-- 遷移: support_decimal_negative_exp_gp
-- 創建時間: 2026-07-02 14:20:43
-- 目的：經驗值、金幣改為支援小數與負數。
-- 修整期、名聲已存於 character_current_stats.extra_data（JSONB），本身即無型別限制，不需遷移。

-- characters.experience 原為 INTEGER，無法儲存小數；若前端存入小數會被 PostgREST 拒絕。
-- 改為 NUMERIC（不限精度/位數），保留原本的 NOT NULL DEFAULT 0，且原本就無 CHECK 限制負數。
ALTER TABLE characters
  ALTER COLUMN experience TYPE NUMERIC;

-- character_currency.gp 原為 NUMERIC(10,2)，小數位數會被靜默四捨五入到小數點後兩位。
-- 改為不限精度/位數的 NUMERIC，避免超過 2 位小數的輸入被裁切。
ALTER TABLE character_currency
  ALTER COLUMN gp TYPE NUMERIC;

COMMENT ON COLUMN characters.experience IS '經驗值（支援小數與負數）';
COMMENT ON COLUMN character_currency.gp IS '金幣數量（支援小數與負數，不限小數位數）';
