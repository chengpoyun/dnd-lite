-- 遷移: fix_sneak_attack_template_max_uses_sentinel
-- 創建時間: 2026-07-04 01:02:33
-- 說明: 修正 bug——「偷襲傷害」範本的 max_uses 原本設為 1，導致 CombatView.tsx 合併
--      預設項目時，任何尚未被同步過（例如非遊蕩者角色）的角色都會看到這張「偷襲傷害 1/1」
--      的假卡片（因為合併邏輯在找不到角色專屬列時，會直接顯示範本的 max_uses）。
--      比照法術位範本的做法，範本 max_uses 應固定為 0，作為「尚未同步過不顯示」的哨兵值；
--      實際可用次數（固定為 1，每回合限一次）改由 CombatItemService.syncSneakAttackResource
--      寫入角色專屬列時直接指定，不再讀範本值。

UPDATE default_combat_actions
SET max_uses = 0
WHERE name = '偷襲傷害' AND category = 'resource';
