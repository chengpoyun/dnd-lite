-- 遷移: add_stat_bonuses_to_abilities_and_items
-- 說明:
-- 1. abilities 表新增 affects_stats 與 stat_bonuses 欄位
-- 2. items 表新增 affects_stats 與 stat_bonuses 欄位
--    stat_bonuses 用來儲存此能力／物品對各種角色數值的加值設定（JSON 結構）
--    例如：
--    {
--      "abilityModifiers": { "dex": 1, "wis": 1 },
--      "savingThrows": { "wis": 2 },
--      "skills": { "運動": 1, "察覺": 2 },
--      "combatStats": { "ac": 1, "initiative": 2, "maxHp": 5, "speed": 10, "attackHit": 1, "attackDamage": 1, "spellHit": 1, "spellDc": 1 }
--    }

-- ===== abilities 表 =====
ALTER TABLE abilities
  ADD COLUMN IF NOT EXISTS affects_stats BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stat_bonuses JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 為查詢影響角色數值的能力建立索引
CREATE INDEX IF NOT EXISTS idx_abilities_affects_stats ON abilities(affects_stats);

-- ===== items / global_items 表 =====
-- 物品系統已在 20260202122503 遷移為 global_items + character_items，
-- 這裡直接在 global_items 上新增欄位，以作為所有角色共用的物品定義。
ALTER TABLE global_items
  ADD COLUMN IF NOT EXISTS affects_stats BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stat_bonuses JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_global_items_affects_stats ON global_items(affects_stats);

