# 資料庫遷移（Database Migration）

> 本文件說明如何在本專案中**建立、執行與檢視** Supabase 資料庫遷移。適合需要修改 schema（新增表、欄位、索引、RLS 政策）的開發者。架構與服務層說明見 [code-architecture.md](code-architecture.md)，開發流程總覽見 [README-project.md](../README-project.md)。

---

## 使用方式

### 1. 建立新的遷移檔

```bash
npm run db:create "add_new_feature"
```

- 會在 `supabase/migrations/` 下建立一個新的 SQL 檔，檔名格式為 `YYYYMMDDHHMMSS_add_new_feature.sql`。
- 請編輯該檔案，填入 SQL（建表、ALTER、索引、RLS 等）。
- 建議使用 `IF NOT EXISTS`、`ADD COLUMN IF NOT EXISTS` 等避免重複執行衝突。

### 2. 執行遷移（推送到 Supabase）

```bash
npm run db:migrate
```

- 會檢查未套用的遷移並推送到遠端 Supabase 專案。
- 依專案設定會透過 `scripts/migrate-wrapper.sh` 呼叫實際遷移腳本（如 `auto-migrate.sh`）。
- **重要**：只要有新增 migration，應立即執行 `db:migrate` 推送到遠端，避免本機與遠端 schema 不一致。

### 3. 查看遷移狀態

```bash
npm run db:status
```

- 用於確認哪些遷移已套用、哪些尚未執行。

---

## 環境設定

- **Supabase 專案**：需先在 [Supabase](https://supabase.com) 建立專案。
- **環境變數**：若遷移腳本需連線，請在專案根目錄設定 `.env`，例如：
  - `SUPABASE_ACCESS_TOKEN`（若腳本使用 Supabase CLI 推送）
- **Supabase CLI**：腳本可能依賴本機安裝的 `supabase`（PATH），或專案根目錄的 `./supabase-cli`；請依腳本與 CI 需求安裝。

前端連線 Supabase 使用的為 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`，見 [README.md](../README.md) 的「Supabase 設定」。

---

## 遷移檔命名與結構

- **命名**：`YYYYMMDDHHMMSS_簡短描述.sql`（例如 `20260126123456_add_user_preferences.sql`）。
- **內容**：建議包含註解（遷移目的、日期），並依序撰寫：
  - 結構變更（CREATE / ALTER）
  - 索引（CREATE INDEX IF NOT EXISTS）
  - RLS：`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` 與 `CREATE POLICY ...`

---

## 注意事項

1. **備份**：對重要資料表做結構或資料變更前，建議先在 Supabase 後台或透過工具備份。
2. **先在開發環境測試**：在開發用 Supabase 專案先跑過遷移，確認無誤再套用到生產。
3. **RLS**：新表或新欄位若涉及使用者資料，請為該表啟用 RLS 並建立適當的 policy（例如 `auth.uid() = user_id`）。
4. **向下相容**：盡量以 `ALTER TABLE` 新增欄位而非直接 DROP 表，以減少中斷。

---

## Supabase Security Advisor 警告處理

專案在 Supabase Dashboard → Database → Security Advisor 可能會出現以下警告，處理方式如下。

### 已由遷移修復（無需手動）

- **0011 function_search_path_mutable**：觸發器函數未設定 `search_path`。已於遷移 `20260221151638_fix_supabase_security_warnings.sql` 為 `update_abilities_updated_at` 補上 `SET search_path = public`。
- **0024 permissive_rls_policy**：`global_items`、`spells` 的「USING (true) / WITH CHECK (true)」已改為明確的 JWT role 條件（仍允許 authenticated 與 anon），以消除過於寬鬆的寫入政策警告。

### 需在 Dashboard 或產品取捨的項目

- **0012 auth_allow_anonymous_sign_ins**：多張表的 RLS 允許匿名使用者存取。本專案**刻意支援匿名角色**（未登入即可建立角色、戰鬥等），因此若需保留此功能，可保留現有政策並接受此警告。若不需要匿名玩法，可在 [Supabase Authentication 設定](https://supabase.com/dashboard/project/_/auth/providers) 關閉 Anonymous sign-ins，並視需求調整 RLS（僅允許 `authenticated`）。
- **Leaked Password Protection**：為 Auth 設定，無法用遷移修改。若要在登入時檢查密碼是否曾外洩，請在 [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Settings** → [Password Security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) 中啟用「Leaked password protection」。

### Performance Advisor：外鍵索引 vs 未使用索引

- **0001 unindexed_foreign_keys**：建議為外鍵欄位建立索引（利於 JOIN、CASCADE）。已於遷移 `20260221154000_add_indexes_for_foreign_keys.sql` 為 `characters.user_id`、`combat_sessions.user_id`、`character_combat_actions.default_item_id` 建立索引。
- **0005 unused_index**：上述三個索引可能被標示為「未使用」。此為 **INFO** 等級，且與 0001 衝突（若移除會再觸發 0001）。專案選擇**保留**這三個外鍵索引以符合 0001 建議，可忽略此三筆 unused 提示。

### Performance Advisor：RLS 效能 (0003, 0006)

- **0003 auth_rls_initplan**：RLS 中 `auth.uid()`、`current_setting()` 改為 `(select auth.uid())`、`(select auth.jwt())` 等避免每行重算。已於遷移 `20260221160000` / `20260221162000` 修正相關 policy。
- **0006 multiple_permissive_policies**：`characters` 表原為兩條 permissive policy（認證／匿名），已於同遷移合併為單一 `characters_policy`，權限行為不變。

### Query Performance：應用層查詢優化

- Dashboard / PostgREST 的系統查詢（pg_timezone_names、pg_extension、table_privileges 等）無法由專案修改。
- **global_items 搜尋**（`searchGlobalItems`：name / name_en / description ILIKE）已於遷移 `20260221170000_add_global_items_trigram_indexes.sql` 啟用 `pg_trgm` 並為三欄建立 GIN trigram 索引，可加速 ILIKE '%...%'，不改變查詢結果或功能。

---

## 相關檔案

- 遷移檔目錄：`supabase/migrations/`
- 腳本：`scripts/create-migration.sh`、`scripts/migrate-wrapper.sh`、`scripts/status-wrapper.sh` 等（實際名稱以專案為準）
- 設定：`supabase/config.toml`
