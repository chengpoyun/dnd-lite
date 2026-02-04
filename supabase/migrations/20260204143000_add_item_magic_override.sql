-- Add per-character magic override for items

ALTER TABLE character_items
  ADD COLUMN IF NOT EXISTS is_magic_override BOOLEAN;
