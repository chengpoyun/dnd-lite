-- 加入 characters.user_id 的外鍵約束到 auth.users
-- 考慮匿名用戶，允許 NULL 值

-- 首先檢查是否存在無效的 user_id
DO $$
BEGIN
  -- 檢查是否有無效的 user_id 引用
  IF EXISTS (
    SELECT 1 
    FROM characters c 
    WHERE c.user_id IS NOT NULL 
      AND c.is_anonymous = false
      AND NOT EXISTS (
        SELECT 1 FROM auth.users u WHERE u.id = c.user_id
      )
  ) THEN
    RAISE EXCEPTION 'Found invalid user_id references in characters table. Please clean up data first.';
  END IF;

  -- 如果不存在約束，則添加
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'characters_user_id_fkey'
      AND table_name = 'characters'
  ) THEN
    -- 添加外鍵約束，允許 NULL（匿名用戶）
    ALTER TABLE characters 
    ADD CONSTRAINT characters_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Successfully added foreign key constraint for characters.user_id';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists for characters.user_id';
  END IF;
END $$;