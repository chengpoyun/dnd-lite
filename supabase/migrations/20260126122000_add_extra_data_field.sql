-- 添加額外資料欄位到 character_current_stats 表
-- 用於儲存 downtime、renown、prestige、customRecords 等前端資料

ALTER TABLE character_current_stats 
ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;

-- 添加註釋說明此欄位的用途
COMMENT ON COLUMN character_current_stats.extra_data IS '儲存額外的角色資料，如修整期、名聲、聲望、自定義記錄等';

-- 創建 GIN 索引以提升 JSONB 查詢效能
CREATE INDEX IF NOT EXISTS idx_character_current_stats_extra_data 
ON character_current_stats USING GIN (extra_data);