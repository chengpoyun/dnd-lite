ALTER TABLE character_spells
  ALTER COLUMN spell_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_spells_name_en_unique
ON spells (LOWER(name_en));
