-- 戰鬥追蹤系統 Migration
-- 用於多人協作的怪物戰鬥追蹤功能

-- 1. 戰鬥會話表
CREATE TABLE IF NOT EXISTS combat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code VARCHAR(3) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- 確保至少有一個 ID
  CONSTRAINT combat_sessions_user_check CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);

-- 2. 怪物表
CREATE TABLE IF NOT EXISTS combat_monsters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code VARCHAR(3) NOT NULL REFERENCES combat_sessions(session_code) ON DELETE CASCADE,
  monster_number INTEGER NOT NULL,
  ac_min INTEGER DEFAULT 0,
  ac_max INTEGER DEFAULT 30,
  total_damage INTEGER DEFAULT 0,
  is_dead BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 同一戰鬥中怪物編號唯一
  CONSTRAINT combat_monsters_unique_number UNIQUE (session_code, monster_number),
  
  -- AC 範圍驗證
  CONSTRAINT combat_monsters_ac_check CHECK (ac_min >= 0 AND ac_max <= 99 AND ac_min <= ac_max),
  CONSTRAINT combat_monsters_damage_check CHECK (total_damage >= 0)
);

-- 3. 傷害記錄表
CREATE TABLE IF NOT EXISTS combat_damage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monster_id UUID NOT NULL REFERENCES combat_monsters(id) ON DELETE CASCADE,
  damage_value INTEGER NOT NULL,
  damage_type VARCHAR(50) NOT NULL,
  resistance_type VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT combat_damage_logs_value_check CHECK (damage_value >= 0),
  CONSTRAINT combat_damage_logs_resistance_check CHECK (resistance_type IN ('normal', 'resistant', 'vulnerable', 'immune'))
);

-- 4. 索引優化
CREATE INDEX IF NOT EXISTS idx_combat_sessions_code ON combat_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_combat_sessions_active ON combat_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_combat_monsters_session ON combat_monsters(session_code);
CREATE INDEX IF NOT EXISTS idx_combat_damage_monster ON combat_damage_logs(monster_id);

-- 5. 自動更新 last_updated 的 Trigger
CREATE OR REPLACE FUNCTION update_combat_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE combat_sessions 
  SET last_updated = NOW() 
  WHERE session_code = NEW.session_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 怪物變更時更新戰鬥會話時間戳
CREATE TRIGGER trigger_update_session_on_monster_change
AFTER INSERT OR UPDATE OR DELETE ON combat_monsters
FOR EACH ROW
EXECUTE FUNCTION update_combat_session_timestamp();

-- 傷害記錄變更時更新戰鬥會話時間戳
CREATE TRIGGER trigger_update_session_on_damage_change
AFTER INSERT OR UPDATE OR DELETE ON combat_damage_logs
FOR EACH ROW
EXECUTE FUNCTION update_combat_session_timestamp();

-- 6. RLS 政策

-- combat_sessions 政策
ALTER TABLE combat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人都可以查看活躍的戰鬥會話" ON combat_sessions
  FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "用戶可以創建戰鬥會話" ON combat_sessions
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
  );

CREATE POLICY "用戶可以更新自己的戰鬥會話" ON combat_sessions
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
  );

CREATE POLICY "用戶可以刪除自己的戰鬥會話" ON combat_sessions
  FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
  );

-- combat_monsters 政策
ALTER TABLE combat_monsters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人都可以查看活躍戰鬥的怪物" ON combat_monsters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM combat_sessions 
      WHERE combat_sessions.session_code = combat_monsters.session_code 
      AND combat_sessions.is_active = TRUE
    )
  );

CREATE POLICY "知道戰鬥 ID 的人可以管理怪物" ON combat_monsters
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM combat_sessions 
      WHERE combat_sessions.session_code = combat_monsters.session_code 
      AND combat_sessions.is_active = TRUE
    )
  );

-- combat_damage_logs 政策
ALTER TABLE combat_damage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人都可以查看活躍戰鬥的傷害記錄" ON combat_damage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM combat_monsters 
      JOIN combat_sessions ON combat_monsters.session_code = combat_sessions.session_code
      WHERE combat_monsters.id = combat_damage_logs.monster_id 
      AND combat_sessions.is_active = TRUE
    )
  );

CREATE POLICY "知道戰鬥 ID 的人可以管理傷害記錄" ON combat_damage_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM combat_monsters 
      JOIN combat_sessions ON combat_monsters.session_code = combat_sessions.session_code
      WHERE combat_monsters.id = combat_damage_logs.monster_id 
      AND combat_sessions.is_active = TRUE
    )
  );

-- 7. 註解說明
COMMENT ON TABLE combat_sessions IS '戰鬥會話表 - 儲存多人協作的戰鬥 ID';
COMMENT ON TABLE combat_monsters IS '怪物表 - 儲存戰鬥中的怪物資訊';
COMMENT ON TABLE combat_damage_logs IS '傷害記錄表 - 儲存怪物受到的傷害歷史';
COMMENT ON COLUMN combat_sessions.session_code IS '3位數字戰鬥代碼';
COMMENT ON COLUMN combat_sessions.last_updated IS '最後更新時間 - 用於版本衝突檢測';
COMMENT ON COLUMN combat_monsters.monster_number IS '怪物編號 (1, 2, 3...)';
COMMENT ON COLUMN combat_monsters.ac_min IS 'AC 最小值 (推測範圍)';
COMMENT ON COLUMN combat_monsters.ac_max IS 'AC 最大值 (推測範圍)';
COMMENT ON COLUMN combat_damage_logs.resistance_type IS '抗性類型: normal/resistant/vulnerable/immune';
