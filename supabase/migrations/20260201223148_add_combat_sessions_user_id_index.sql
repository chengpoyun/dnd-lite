-- 為 combat_sessions.user_id 外鍵添加索引
-- 修復 Supabase Database Linter 建議：Unindexed foreign keys
-- 創建日期: 2026-02-01

-- 添加 user_id 索引以優化 JOIN 和過濾查詢
CREATE INDEX IF NOT EXISTS idx_combat_sessions_user_id ON combat_sessions(user_id);

-- 添加索引註解
COMMENT ON INDEX idx_combat_sessions_user_id IS '優化通過 user_id 查詢戰鬥會話的效能（外鍵索引）';
