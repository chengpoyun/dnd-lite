-- 遷移: create_global_items_and_character_items_tables
-- 創建時間: 2026-02-02 12:25:03

-- 重新設計物品系統：全域物品庫 + 角色物品關聯
-- 類似 spells 和 character_spells 的架構

-- 1. 保存現有 items 表資料（作為備份）
ALTER TABLE items RENAME TO items_backup;

-- 2. 創建新的全域物品庫表
CREATE TABLE IF NOT EXISTS global_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT, -- 英文名稱（未來可能支援）
  description TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('裝備', '魔法物品', '藥水', '素材', '雜項')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 創建角色物品關聯表（包含 override 欄位）
CREATE TABLE IF NOT EXISTS character_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES global_items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
  
  -- Override 欄位（角色專屬客製化）
  name_override TEXT,
  description_override TEXT,
  category_override TEXT CHECK (category_override IS NULL OR category_override IN ('裝備', '魔法物品', '藥水', '素材', '雜項')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(character_id, item_id)
);

-- 4. 創建索引
CREATE INDEX IF NOT EXISTS idx_global_items_name ON global_items(name);
CREATE INDEX IF NOT EXISTS idx_global_items_category ON global_items(category);
CREATE INDEX IF NOT EXISTS idx_character_items_character_id ON character_items(character_id);
CREATE INDEX IF NOT EXISTS idx_character_items_item_id ON character_items(item_id);

-- 5. 啟用 RLS
ALTER TABLE global_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_items ENABLE ROW LEVEL SECURITY;

-- 6. global_items 表的 RLS 政策：所有人可讀取、新增、編輯
CREATE POLICY "global_items_policy" ON global_items FOR ALL USING (true);

-- 7. character_items 表的 RLS 政策：只能操作自己的角色
CREATE POLICY "character_items_policy" ON character_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters 
    WHERE characters.id = character_items.character_id 
    AND (
      ((select auth.uid()) IS NOT NULL AND characters.user_id = (select auth.uid())) OR 
      ((select auth.uid()) IS NULL AND characters.is_anonymous = true)
    )
  )
);

-- 8. 遷移現有資料到新架構
-- 將舊的 items 轉為 global_items（去重）
INSERT INTO global_items (name, description, category, created_at)
SELECT DISTINCT ON (name) name, description, category, MIN(created_at) as created_at
FROM items_backup
GROUP BY name, description, category
ON CONFLICT DO NOTHING;

-- 注意：由於舊架構沒有 character_id，無法自動遷移到 character_items
-- 用戶需要重新從 global_items 獲得物品

-- 9. 可選：一段時間後移除備份表
-- DROP TABLE items_backup;

