-- 為戰鬥怪物新增最大HP欄位
-- 2026-02-01: 新增 max_hp 欄位支援HP追蹤

-- 新增 max_hp 欄位 (nullable，未知時為 null)
ALTER TABLE combat_monsters
ADD COLUMN IF NOT EXISTS max_hp INTEGER;

-- 新增註解
COMMENT ON COLUMN combat_monsters.max_hp IS '怪物最大HP（可選，未知時為 null）';
