-- 修復傷害記錄 trigger 的 session_code 問題
-- combat_damage_logs 表沒有 session_code 欄位，需要從 combat_monsters 取得

-- 先刪除所有 triggers
DROP TRIGGER IF EXISTS trigger_update_session_on_damage_change ON combat_damage_logs;
DROP TRIGGER IF EXISTS trigger_update_session_on_monster_change ON combat_monsters;

-- 然後刪除舊的 function
DROP FUNCTION IF EXISTS update_combat_session_timestamp();

-- 創建新的 trigger function for combat_monsters
CREATE OR REPLACE FUNCTION update_session_on_monster_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 處理 DELETE 操作 (使用 OLD)
  IF TG_OP = 'DELETE' THEN
    UPDATE combat_sessions 
    SET last_updated = NOW() 
    WHERE session_code = OLD.session_code;
    RETURN OLD;
  END IF;
  
  -- 處理 INSERT 和 UPDATE (使用 NEW)
  UPDATE combat_sessions 
  SET last_updated = NOW() 
  WHERE session_code = NEW.session_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 創建新的 trigger function for combat_damage_logs
CREATE OR REPLACE FUNCTION update_session_on_damage_change()
RETURNS TRIGGER AS $$
DECLARE
  v_session_code VARCHAR(3);
BEGIN
  -- 處理 DELETE 操作 (從 OLD 獲取 monster_id)
  IF TG_OP = 'DELETE' THEN
    SELECT session_code INTO v_session_code
    FROM combat_monsters
    WHERE id = OLD.monster_id;
  ELSE
    -- 處理 INSERT 和 UPDATE (從 NEW 獲取 monster_id)
    SELECT session_code INTO v_session_code
    FROM combat_monsters
    WHERE id = NEW.monster_id;
  END IF;
  
  -- 更新戰鬥會話時間戳
  IF v_session_code IS NOT NULL THEN
    UPDATE combat_sessions 
    SET last_updated = NOW() 
    WHERE session_code = v_session_code;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 重新創建 triggers
CREATE TRIGGER trigger_update_session_on_monster_change
AFTER INSERT OR UPDATE OR DELETE ON combat_monsters
FOR EACH ROW
EXECUTE FUNCTION update_session_on_monster_change();

CREATE TRIGGER trigger_update_session_on_damage_change
AFTER INSERT OR UPDATE OR DELETE ON combat_damage_logs
FOR EACH ROW
EXECUTE FUNCTION update_session_on_damage_change();
