-- 遷移: add_sneak_attack_default_resource
-- 創建時間: 2026-07-03 21:02:58
-- 說明: 新增遊蕩者「偷襲傷害」預設職業資源範本，每回合限用一次（比照攻擊/疾走），
--      骰數依遊蕩者等級查表（見 utils/sneakAttack.ts），同步時會寫入角色項目名稱（如「偷襲傷害 3d6」）。

INSERT INTO default_combat_actions (category, name, icon, description, max_uses, recovery_type)
VALUES ('resource', '偷襲傷害', '🔪', '每回合限一次，骰數依遊蕩者等級增加', 1, 'turn');
