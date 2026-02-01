-- 修改 AC 範圍：ac_max 改為可為 NULL，初始不設定上限

-- 1. 移除舊的約束
ALTER TABLE combat_monsters DROP CONSTRAINT IF EXISTS combat_monsters_ac_check;

-- 2. 修改 ac_max 為可為 NULL
ALTER TABLE combat_monsters ALTER COLUMN ac_max DROP NOT NULL;
ALTER TABLE combat_monsters ALTER COLUMN ac_max DROP DEFAULT;

-- 3. 添加新的約束（允許 ac_max 為 NULL）
ALTER TABLE combat_monsters ADD CONSTRAINT combat_monsters_ac_check 
  CHECK (
    ac_min >= 0 AND 
    (ac_max IS NULL OR (ac_max <= 99 AND ac_min <= ac_max))
  );

-- 4. 更新現有數據（可選，將 ac_max = 30 的設為 NULL）
UPDATE combat_monsters SET ac_max = NULL WHERE ac_max = 30;

COMMENT ON COLUMN combat_monsters.ac_max IS 'AC 最大值 (推測範圍)，NULL 表示尚未確定上限';
