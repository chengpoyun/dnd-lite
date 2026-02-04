-- Add is_magic flag to items and remove 魔法物品 category

ALTER TABLE global_items
  ADD COLUMN IF NOT EXISTS is_magic BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE character_items
  ADD COLUMN IF NOT EXISTS is_magic BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing data
UPDATE global_items SET is_magic = false WHERE is_magic IS NULL;
UPDATE character_items SET is_magic = false WHERE is_magic IS NULL;

-- Migrate old category values before re-adding constraints
UPDATE global_items SET category = '雜項' WHERE category = '魔法物品';
UPDATE character_items SET category_override = '雜項' WHERE category_override = '魔法物品';

-- Update category check constraints (remove 魔法物品)
ALTER TABLE global_items
  DROP CONSTRAINT IF EXISTS global_items_category_check;

ALTER TABLE global_items
  ADD CONSTRAINT global_items_category_check
  CHECK (category IN ('裝備', '藥水', '素材', '雜項'));

ALTER TABLE character_items
  DROP CONSTRAINT IF EXISTS character_items_category_override_check;

ALTER TABLE character_items
  ADD CONSTRAINT character_items_category_override_check
  CHECK (category_override IS NULL OR category_override IN ('裝備', '藥水', '素材', '雜項'));
