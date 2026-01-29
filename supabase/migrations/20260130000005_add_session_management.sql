-- 新增 session 管理欄位到 user_settings 表
-- 用途：實現單一裝置登入機制，防止多裝置資料衝突

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS active_session_token TEXT,
ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ;

-- 為 active_session_token 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_user_settings_session_token 
ON user_settings(active_session_token);

-- 註解說明
COMMENT ON COLUMN user_settings.active_session_token IS '當前有效的 session token，每次登入時更新';
COMMENT ON COLUMN user_settings.session_started_at IS 'Session 建立時間';
