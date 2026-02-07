-- 傷害記錄：記錄計算前的原始傷害（使用者輸入），免疫時也可還原
ALTER TABLE combat_damage_logs
ADD COLUMN IF NOT EXISTS damage_value_origin INTEGER DEFAULT NULL;

COMMENT ON COLUMN combat_damage_logs.damage_value_origin IS '計算前原始傷害（使用者輸入）';
