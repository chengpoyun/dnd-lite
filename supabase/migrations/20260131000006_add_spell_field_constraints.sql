-- 為法術表添加欄位值約束
-- 確保施法時間、持續時間、射程、來源只能填入預定義的值

-- 移除舊的約束（如果存在）
ALTER TABLE spells DROP CONSTRAINT IF EXISTS check_casting_time;
ALTER TABLE spells DROP CONSTRAINT IF EXISTS check_duration;
ALTER TABLE spells DROP CONSTRAINT IF EXISTS check_range;
ALTER TABLE spells DROP CONSTRAINT IF EXISTS check_source;

-- 添加施法時間約束
ALTER TABLE spells ADD CONSTRAINT check_casting_time CHECK (
  casting_time IN ('動作', '附贈動作', '反應', '1分鐘', '10分鐘', '1小時', '8小時', '12小時', '24小時')
);

-- 添加持續時間約束
ALTER TABLE spells ADD CONSTRAINT check_duration CHECK (
  duration IN ('即效', '一回合', '1分鐘', '10分鐘', '1小時', '8小時', '24小時', '直到取消', '其他')
);

-- 添加射程約束
ALTER TABLE spells ADD CONSTRAINT check_range CHECK (
  range IN ('自身', '觸碰', '5尺', '10尺', '30尺', '60尺', '90尺', '120尺', '150尺', '300尺', '其他')
);

-- 添加來源約束
ALTER TABLE spells ADD CONSTRAINT check_source CHECK (
  source IN ('PHB', 'PHB''24', 'AI', 'IDRotF', 'TCE', 'XGE', 'AAG', 'BMT', 'EFA', 'FRHoF', 'FTD', 'SatO', 'SCC')
);
