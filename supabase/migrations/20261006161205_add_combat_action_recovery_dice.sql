-- 遷移: add_combat_action_recovery_dice
-- 創建時間: 2026-10-06 16:12:05
--
-- 戰鬥項目新增「長休擲骰恢復」：recovery_dice 有值（如 '1d6'）時，長休不補滿，
-- 改為擲骰增加剩餘次數（上限為 max_uses）。recovery_type 維持 'long_rest' 不變，
-- 因此不需要改動 recovery_type 的 CHECK 限制。null 代表長休補滿（維持原行為）。
-- 只是在既有資料表加欄位，不需要另外 GRANT（沿用資料表既有授權）。

ALTER TABLE character_combat_actions
  ADD COLUMN IF NOT EXISTS recovery_dice TEXT;

ALTER TABLE character_combat_actions
  DROP CONSTRAINT IF EXISTS character_combat_actions_recovery_dice_check;

ALTER TABLE character_combat_actions
  ADD CONSTRAINT character_combat_actions_recovery_dice_check
  CHECK (recovery_dice IS NULL OR recovery_dice ~ '^[0-9]+d[0-9]+$');
