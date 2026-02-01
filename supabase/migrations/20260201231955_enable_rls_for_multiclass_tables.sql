-- 啟用兼職系統表格的 RLS 功能
-- 日期: 2026-02-01
-- 描述: 為 character_classes 和 character_hit_dice_pools 表格啟用 Row Level Security

-- 啟用 character_classes 表的 RLS
ALTER TABLE character_classes ENABLE ROW LEVEL SECURITY;

-- 啟用 character_hit_dice_pools 表的 RLS
ALTER TABLE character_hit_dice_pools ENABLE ROW LEVEL SECURITY;
