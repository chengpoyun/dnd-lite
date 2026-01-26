-- 為角色相關表添加唯一約束，確保每個角色只有一條記錄
-- 這將解決 upsert 操作時的 400 錯誤問題

-- 清理 character_ability_scores 中的重複記錄，保留最新的一條
DELETE FROM character_ability_scores 
WHERE id NOT IN (
  SELECT DISTINCT ON (character_id) id 
  FROM character_ability_scores 
  ORDER BY character_id, updated_at DESC
);

-- 清理 character_current_stats 中的重複記錄，保留最新的一條
DELETE FROM character_current_stats 
WHERE id NOT IN (
  SELECT DISTINCT ON (character_id) id 
  FROM character_current_stats 
  ORDER BY character_id, updated_at DESC
);

-- 清理 character_currency 中的重複記錄，保留最新的一條
DELETE FROM character_currency 
WHERE id NOT IN (
  SELECT DISTINCT ON (character_id) id 
  FROM character_currency 
  ORDER BY character_id, updated_at DESC
);

-- 為 character_ability_scores 添加唯一約束
ALTER TABLE character_ability_scores ADD CONSTRAINT unique_character_ability_scores UNIQUE (character_id);

-- 為 character_current_stats 添加唯一約束
ALTER TABLE character_current_stats ADD CONSTRAINT unique_character_current_stats UNIQUE (character_id);

-- 為 character_currency 添加唯一約束
ALTER TABLE character_currency ADD CONSTRAINT unique_character_currency UNIQUE (character_id);