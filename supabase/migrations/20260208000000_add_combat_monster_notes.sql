-- 怪物備註欄位：每隻怪物獨立，不與同名怪物共用
ALTER TABLE combat_monsters
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

COMMENT ON COLUMN combat_monsters.notes IS '備註（僅此隻怪物顯示，不與同名怪物共用）';
