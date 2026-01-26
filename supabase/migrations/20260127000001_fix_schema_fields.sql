-- 修復資料庫欄位名稱不匹配問題
-- 創建時間: 2026-01-27
-- 目的: 解決 PostgREST schema cache 中欄位名稱錯誤

-- 1. 確保 character_currency 表有正確的 'gp' 欄位
-- 如果存在 'gold' 欄位，重命名為 'gp'
DO $$ 
BEGIN
    -- 檢查是否存在 'gold' 欄位
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'character_currency' 
        AND column_name = 'gold'
    ) THEN
        ALTER TABLE character_currency RENAME COLUMN gold TO gp;
        RAISE NOTICE 'Renamed character_currency.gold to gp';
    END IF;
    
    -- 確保存在 'gp' 欄位
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'character_currency' 
        AND column_name = 'gp'
    ) THEN
        ALTER TABLE character_currency ADD COLUMN gp INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added character_currency.gp column';
    END IF;
END $$;

-- 2. 確保 character_current_stats 表有正確的 'current_hit_dice' 欄位
-- 如果存在 'hit_dice_current' 欄位，重命名為 'current_hit_dice'
DO $$ 
BEGIN
    -- 檢查是否存在 'hit_dice_current' 欄位
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'character_current_stats' 
        AND column_name = 'hit_dice_current'
    ) THEN
        ALTER TABLE character_current_stats RENAME COLUMN hit_dice_current TO current_hit_dice;
        RAISE NOTICE 'Renamed character_current_stats.hit_dice_current to current_hit_dice';
    END IF;
    
    -- 確保存在 'current_hit_dice' 欄位
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'character_current_stats' 
        AND column_name = 'current_hit_dice'
    ) THEN
        ALTER TABLE character_current_stats ADD COLUMN current_hit_dice INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added character_current_stats.current_hit_dice column';
    END IF;
END $$;

-- 3. 嘗試刷新 PostgREST schema cache
-- 注意: 這可能需要適當的權限
SELECT pg_notify('pgrst', 'reload schema');

-- 4. 驗證修復結果
-- 顯示相關表的欄位結構
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('character_currency', 'character_current_stats')
    AND column_name IN ('gp', 'gold', 'current_hit_dice', 'hit_dice_current')
ORDER BY table_name, column_name;