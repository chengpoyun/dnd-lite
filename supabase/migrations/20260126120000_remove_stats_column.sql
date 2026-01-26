-- 移除 characters 表中的 stats JSONB 欄位
-- 此欄位已被新的正規化結構取代

-- 檢查欄位是否存在
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'characters' AND column_name = 'stats'
  ) THEN
    -- 移除 stats 欄位
    ALTER TABLE characters DROP COLUMN stats;
    
    -- 記錄移除操作
    INSERT INTO migration_log (operation, description, executed_at)
    VALUES ('DROP_COLUMN', 'Removed stats JSONB column from characters table', NOW())
    ON CONFLICT DO NOTHING;
    
  END IF;
END $$;