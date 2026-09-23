-- 遷移: create_character_temporary_conditions
-- 創建時間: 2026-09-24 00:16:21
--
-- 「臨時狀態」功能：角色頁面名稱欄位下方、六維屬性上方的臨時狀態清單。
-- 每筆狀態有名稱／持續時間（純文字說明，無自動倒數）／效果說明，
-- 可選擇是否影響角色數值（affects_stats + stat_bonuses，與能力/物品共用同一套
-- StatBonusEditor 加成格式），由 characterBonusAggregation.ts 一併聚合進 bySource。

CREATE TABLE IF NOT EXISTS character_temporary_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  affects_stats BOOLEAN NOT NULL DEFAULT FALSE,
  stat_bonuses JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_temporary_conditions_character_id ON character_temporary_conditions(character_id);
CREATE INDEX IF NOT EXISTS idx_character_temporary_conditions_created_at ON character_temporary_conditions(created_at DESC);

ALTER TABLE character_temporary_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "character_temporary_conditions_policy" ON character_temporary_conditions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = character_temporary_conditions.character_id
    AND (
      ((SELECT auth.uid()) IS NOT NULL AND characters.user_id = (SELECT auth.uid()))
      OR ((SELECT auth.uid()) IS NULL AND characters.is_anonymous = true)
    )
  )
);

-- Supabase 2026-10-30 起不再自動授權新表給 Data API，需明確 GRANT（見 CLAUDE.md）
grant delete, insert, references, select, trigger, truncate, update
  on public.character_temporary_conditions
  to anon, authenticated, service_role;
