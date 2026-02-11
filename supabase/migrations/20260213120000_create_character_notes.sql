-- 遷移: create_character_notes
-- 角色筆記表：每角色多篇筆記，標題預設為當天日期，內容純文字（可擴充 Markdown）

CREATE TABLE IF NOT EXISTS character_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_notes_character_id ON character_notes(character_id);
CREATE INDEX IF NOT EXISTS idx_character_notes_updated_at ON character_notes(updated_at DESC);

ALTER TABLE character_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "character_notes_policy" ON character_notes FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = character_notes.character_id
    AND (
      ((SELECT auth.uid()) IS NOT NULL AND characters.user_id = (SELECT auth.uid()))
      OR ((SELECT auth.uid()) IS NULL AND characters.is_anonymous = true)
    )
  )
);
