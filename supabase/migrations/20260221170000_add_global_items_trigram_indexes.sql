-- 優化 global_items 搜尋效能（Query Performance：ILIKE 三欄 OR 查詢）
-- 創建時間: 2026-02-21
-- 說明: 應用層 searchGlobalItems 使用 name/name_en/description ILIKE '%...%'，
--       啟用 pg_trgm 並為三欄建立 GIN 索引可加速此查詢，不改變查詢語意與功能。

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_global_items_name_gin_trgm
  ON public.global_items USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_global_items_name_en_gin_trgm
  ON public.global_items USING GIN (name_en gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_global_items_description_gin_trgm
  ON public.global_items USING GIN (description gin_trgm_ops);
