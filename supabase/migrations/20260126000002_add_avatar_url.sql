-- 添加頭像欄位到角色表
ALTER TABLE characters ADD COLUMN avatar_url TEXT;

-- 添加註釋
COMMENT ON COLUMN characters.avatar_url IS 'Base64 encoded avatar image data';