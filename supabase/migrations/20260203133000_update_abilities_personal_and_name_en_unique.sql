ALTER TABLE character_abilities
  ALTER COLUMN ability_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_abilities_name_en_unique
ON abilities (LOWER(name_en));
