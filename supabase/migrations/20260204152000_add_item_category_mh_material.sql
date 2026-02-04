-- Add MH素材 to item category constraints

ALTER TABLE global_items
  DROP CONSTRAINT IF EXISTS global_items_category_check;

ALTER TABLE global_items
  ADD CONSTRAINT global_items_category_check
  CHECK (category IN ('裝備', '藥水', '素材', 'MH素材', '雜項'));

ALTER TABLE character_items
  DROP CONSTRAINT IF EXISTS character_items_category_override_check;

ALTER TABLE character_items
  ADD CONSTRAINT character_items_category_override_check
  CHECK (category_override IS NULL OR category_override IN ('裝備', '藥水', '素材', 'MH素材', '雜項'));
