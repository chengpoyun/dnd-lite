-- Fix combat trigger functions to use session_code/last_updated
-- Replaces broken functions referencing combat_session_id/updated_at

-- Drop existing triggers to allow function replacement
DROP TRIGGER IF EXISTS trigger_update_session_on_damage_change ON combat_damage_logs;
DROP TRIGGER IF EXISTS trigger_update_session_on_monster_change ON combat_monsters;

-- Update combat session timestamp when monsters change
CREATE OR REPLACE FUNCTION update_session_on_monster_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle DELETE using OLD
  IF TG_OP = 'DELETE' THEN
    UPDATE combat_sessions
    SET last_updated = NOW()
    WHERE session_code = OLD.session_code;
    RETURN OLD;
  END IF;

  -- Handle INSERT/UPDATE using NEW
  UPDATE combat_sessions
  SET last_updated = NOW()
  WHERE session_code = NEW.session_code;
  RETURN NEW;
END;
$$;

-- Update combat session timestamp when damage logs change
CREATE OR REPLACE FUNCTION update_session_on_damage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_code VARCHAR(3);
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT session_code INTO v_session_code
    FROM combat_monsters
    WHERE id = OLD.monster_id;
  ELSE
    SELECT session_code INTO v_session_code
    FROM combat_monsters
    WHERE id = NEW.monster_id;
  END IF;

  IF v_session_code IS NOT NULL THEN
    UPDATE combat_sessions
    SET last_updated = NOW()
    WHERE session_code = v_session_code;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER trigger_update_session_on_monster_change
AFTER INSERT OR UPDATE OR DELETE ON combat_monsters
FOR EACH ROW
EXECUTE FUNCTION update_session_on_monster_change();

CREATE TRIGGER trigger_update_session_on_damage_change
AFTER INSERT OR UPDATE OR DELETE ON combat_damage_logs
FOR EACH ROW
EXECUTE FUNCTION update_session_on_damage_change();
