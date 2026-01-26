-- 創建預設戰鬥項目表
CREATE TABLE default_combat_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(20) NOT NULL CHECK (category IN ('action', 'bonus_action', 'reaction', 'resource')),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  description TEXT,
  max_uses INTEGER DEFAULT 1,
  recovery_type VARCHAR(20) DEFAULT 'turn' CHECK (recovery_type IN ('turn', 'short_rest', 'long_rest', 'manual')),
  action_type VARCHAR(50),
  damage_formula VARCHAR(100),
  attack_bonus INTEGER,
  save_dc INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 插入預設的戰鬥項目
INSERT INTO default_combat_actions (category, name, icon, max_uses, recovery_type) VALUES
-- 動作項目
('action', '攻擊', '⚔️', 1, 'turn'),
('action', '疾走', '💨', 1, 'turn'),
('action', '閃避', '🛡️', 1, 'turn'),
('action', '撤離', '🏃', 1, 'turn'),
('action', '幫助', '🤝', 1, 'turn'),
('action', '隱匿', '👤', 1, 'turn'),
('action', '準備', '⏱️', 1, 'turn'),
('action', '搜索', '🔍', 1, 'turn'),
('action', '使用物品', '📦', 1, 'turn'),

-- 附贈動作項目
('bonus_action', '副手攻擊', '🗡️', 1, 'turn'),
('bonus_action', '藥水', '🧪', 1, 'turn'),

-- 反應項目
('reaction', '藉機攻擊', '⚡', 1, 'turn');

-- 創建索引提高查詢效率
CREATE INDEX idx_default_combat_actions_category ON default_combat_actions(category);

-- 修改角色戰鬥項目表，添加 is_custom 字段來區分自定義項目
ALTER TABLE character_combat_actions ADD COLUMN is_custom BOOLEAN DEFAULT FALSE;
ALTER TABLE character_combat_actions ADD COLUMN default_item_id UUID REFERENCES default_combat_actions(id);

-- 創建索引
CREATE INDEX idx_character_combat_actions_custom ON character_combat_actions(character_id, is_custom);
CREATE INDEX idx_character_combat_actions_default ON character_combat_actions(default_item_id);

-- 添加註釋
COMMENT ON TABLE default_combat_actions IS '預設戰鬥動作模板表';
COMMENT ON COLUMN character_combat_actions.is_custom IS '是否為自定義項目（true）或基於預設項目的修改（false）';
COMMENT ON COLUMN character_combat_actions.default_item_id IS '關聯的預設項目ID（如果基於預設項目修改）';

-- 為預設表啟用 RLS（所有用戶都可以讀取）
ALTER TABLE default_combat_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read default combat actions" ON default_combat_actions FOR SELECT USING (true);