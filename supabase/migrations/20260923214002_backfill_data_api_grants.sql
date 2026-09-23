-- 遷移: backfill_data_api_grants
-- 創建時間: 2026-09-23 21:40:02
--
-- 背景：Supabase 宣布從 2026-10-30 起，不再自動把新建資料表授權給 Data API
-- （anon / authenticated / service_role），既有表格的授權不受影響、維持現狀。
-- 但本專案至今沒有任何 migration 明確下過 GRANT——全部授權都是 Supabase 過去
-- 自動給的。10/30 後若本機執行 `supabase db reset`（用全部 migration 重建資料庫）
-- 或建立新專案／preview branch，重建出來的每一張表都會因為缺少明確 GRANT 而連不上
-- Data API，整個 App 會直接壞掉。
--
-- 這支 migration 把「目前 21 張表實際已有的授權」原封不動補成明確的 GRANT，
-- 不改變任何現有權限（用 information_schema.role_table_grants 查證過，21 張表
-- 的 anon / authenticated / service_role 權限完全一致：
-- DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE）。
--
-- 注意：本專案的「匿名試用」是 App 自訂的 anonymous_id 機制，不是 Supabase Auth
-- 的匿名登入——匿名玩家全程用 anon role 直接讀寫自己的角色資料、RLS 依
-- anonymous_id 過濾，因此 anon 需要完整 CRUD，不能照 Supabase 範例只給 SELECT。
--
-- 之後新增資料表時，記得在建表的同一支 migration 裡一併加上對應的 GRANT。

grant delete, insert, references, select, trigger, truncate, update
  on public.character_abilities
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.character_ability_scores
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.character_classes
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.character_combat_actions
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.character_currency
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.character_current_stats
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.character_hit_dice_pools
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.character_items
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.character_notes
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.character_saving_throws
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.character_skill_proficiencies
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.character_spells
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.characters
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.combat_damage_logs
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.combat_monsters
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.combat_sessions
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.default_combat_actions
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.info_document_access
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.info_documents
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.info_links
  to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update
  on public.user_settings
  to anon, authenticated, service_role;
