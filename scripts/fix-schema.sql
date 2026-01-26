-- 修復資料庫表結構問題
-- 主要解決 schema cache 中欄位名稱不匹配的問題

-- 確保 character_currency 表結構正確
-- (檢查是否有 'gold' 欄位而不是 'gp')
DO $$
BEGIN
    -- 檢查是否存在 'gold' 欄位，如果存在則重命名為 'gp'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'character_currency' 
        AND column_name = 'gold'
    ) THEN
        ALTER TABLE character_currency RENAME COLUMN gold TO gp;
        RAISE NOTICE '已將 character_currency.gold 重命名為 gp';
    END IF;
    
    -- 如果不存在 'gp' 欄位，創建它
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'character_currency' 
        AND column_name = 'gp'
    ) THEN
        ALTER TABLE character_currency ADD COLUMN gp INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE '已添加 character_currency.gp 欄位';
    END IF;
END $$;

-- 確保 character_current_stats 表結構正確
-- (檢查是否有 'hit_dice_current' 欄位而不是 'current_hit_dice')
DO $$
BEGIN
    -- 檢查是否存在 'hit_dice_current' 欄位，如果存在則重命名
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'character_current_stats' 
        AND column_name = 'hit_dice_current'
    ) THEN
        ALTER TABLE character_current_stats RENAME COLUMN hit_dice_current TO current_hit_dice;
        RAISE NOTICE '已將 character_current_stats.hit_dice_current 重命名為 current_hit_dice';
    END IF;
    
    -- 如果不存在 'current_hit_dice' 欄位，創建它
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'character_current_stats' 
        AND column_name = 'current_hit_dice'
    ) THEN
        ALTER TABLE character_current_stats ADD COLUMN current_hit_dice INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE '已添加 character_current_stats.current_hit_dice 欄位';
    END IF;
END $$;

-- 刷新 schema cache
NOTIFY pgrst, 'reload schema';

-- 顯示修復後的表結構
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name IN ('character_currency', 'character_current_stats')
ORDER BY table_name, ordinal_position;