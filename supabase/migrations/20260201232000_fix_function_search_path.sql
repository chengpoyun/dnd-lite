-- 修復函數 search_path 安全問題
-- 日期: 2026-02-01
-- 描述: 為所有觸發器函數添加 SECURITY DEFINER 和固定的 search_path，防止 schema 注入攻擊

-- 1. update_updated_at_column (spells 表使用)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. update_user_settings_updated_at (user_settings 表使用)
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. update_items_updated_at (items 表使用)
CREATE OR REPLACE FUNCTION update_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4. update_session_on_monster_change (combat_monsters 表使用)
CREATE OR REPLACE FUNCTION update_session_on_monster_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 更新對應的戰鬥會話時間戳
  IF NEW.combat_session_id IS NOT NULL THEN
    UPDATE combat_sessions
    SET updated_at = NOW()
    WHERE id = NEW.combat_session_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. update_session_on_damage_change (combat_damage_log 表使用)
CREATE OR REPLACE FUNCTION update_session_on_damage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 更新對應的戰鬥會話時間戳
  IF NEW.combat_session_id IS NOT NULL THEN
    UPDATE combat_sessions
    SET updated_at = NOW()
    WHERE id = NEW.combat_session_id;
  END IF;
  RETURN NEW;
END;
$$;
