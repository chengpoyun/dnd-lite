-- 遷移: add_equipment_fields
-- 說明:
-- 1. global_items 新增 equipment_kind：此裝備可穿戴的部位類型（單一類型，前端對應到具體槽位）
-- 2. character_items 新增 equipment_kind_override、equipment_slot、is_equipped
--    - equipment_slot：此物品被指派到哪一個具體槽位（裝備類必填）
--    - is_equipped：是否穿戴中，僅穿戴中的裝備會影響角色數值

-- ===== global_items =====
ALTER TABLE global_items
  ADD COLUMN IF NOT EXISTS equipment_kind TEXT;

COMMENT ON COLUMN global_items.equipment_kind IS '裝備類型：face, head, neck, shoulders, body, torso, arms, hands, waist, feet, ring, melee_weapon, ranged_weapon, shield；非裝備類為 NULL';

-- ===== character_items =====
ALTER TABLE character_items
  ADD COLUMN IF NOT EXISTS equipment_kind_override TEXT,
  ADD COLUMN IF NOT EXISTS equipment_slot TEXT,
  ADD COLUMN IF NOT EXISTS is_equipped BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN character_items.equipment_kind_override IS '角色專屬裝備類型覆寫（優先於 global_items.equipment_kind）';
COMMENT ON COLUMN character_items.equipment_slot IS '穿戴的具體槽位，裝備類必填';
COMMENT ON COLUMN character_items.is_equipped IS '是否穿戴中，僅 true 時計入角色數值';

CREATE INDEX IF NOT EXISTS idx_character_items_is_equipped ON character_items(is_equipped);
CREATE INDEX IF NOT EXISTS idx_character_items_equipment_slot ON character_items(equipment_slot) WHERE equipment_slot IS NOT NULL;
