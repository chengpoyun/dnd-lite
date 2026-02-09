-- 還原 initiative_bonus 欄位（20260208231913 在 DROP 舊欄位時一併移除了新加的 initiative_bonus）
-- 若已存在則不重複新增
ALTER TABLE character_current_stats
  ADD COLUMN IF NOT EXISTS initiative_bonus INTEGER DEFAULT 0;

COMMENT ON COLUMN character_current_stats.initiative_bonus IS '先攻其他加值（敏捷調整值由 basic+dex 計算，此欄為額外 bonus）';
