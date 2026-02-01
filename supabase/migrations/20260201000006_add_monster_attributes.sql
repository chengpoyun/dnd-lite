-- 新增怪物屬性：名稱和抗性設定
-- 支援戰鬥中動態發現和記錄怪物抗性

-- 1. 新增欄位
ALTER TABLE combat_monsters 
ADD COLUMN name VARCHAR(100) DEFAULT '怪物',
ADD COLUMN resistances JSONB DEFAULT '{}'::jsonb;

-- 2. 註解說明
COMMENT ON COLUMN combat_monsters.name IS '怪物名稱（如：食人魔、地精）';
COMMENT ON COLUMN combat_monsters.resistances IS '抗性設定 JSON，格式：{"fire": "vulnerable", "slashing": "resistant", "poison": "immune"}。空物件代表所有傷害類型為一般。';

-- 3. 索引優化（加速 JSONB 查詢）
CREATE INDEX IF NOT EXISTS idx_combat_monsters_resistances ON combat_monsters USING GIN (resistances);

-- 4. 驗證約束
ALTER TABLE combat_monsters 
ADD CONSTRAINT combat_monsters_name_check CHECK (char_length(name) >= 1);
