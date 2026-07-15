-- 遷移: add decoration effects to items
-- 創建時間: 2026-07-14 17:21:13
--
-- MH素材鑲入武器 vs 鑲入護甲，效果應各自獨立，不應共用同一份 stat_bonuses
-- （原本設計誤用共用欄位當「鑲嵌效果」，會導致鑲武器/鑲護甲的效果同時生效）。
-- decoration_effects 格式：{ weapon?: {note, stat_bonuses}, armor?: {note, stat_bonuses} }
-- 鑲嵌時依裝備實際類型（武器/護甲）只取對應那份效果套用。

ALTER TABLE global_items
  ADD COLUMN IF NOT EXISTS decoration_effects JSONB DEFAULT '{}'::jsonb;

ALTER TABLE character_items
  ADD COLUMN IF NOT EXISTS decoration_effects JSONB DEFAULT '{}'::jsonb;
