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

## 相關檔案

- 遷移檔目錄：`supabase/migrations/`
- 腳本：`scripts/create-migration.sh`、`scripts/migrate-wrapper.sh`、`scripts/status-wrapper.sh` 等（實際名稱以專案為準）
- 設定：`supabase/config.toml`
