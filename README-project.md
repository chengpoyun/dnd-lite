# D&D Lite 開發者指南

> 本文件適合**需要在本專案中開發、維護或擴充功能**的工程師。目標是讓你在短時間內掌握目錄結構、主要模組職責、開發流程與常用指令，並知道該去哪裡查更細的技術細節。

若你只想跑起來或了解功能與技術棧，請先看 [README.md](README.md)。

---

## 文件導覽

| 你想做的事 | 建議閱讀 |
|------------|----------|
| 把專案跑起來、設定 Supabase、跑測試 | [README.md](README.md) 的「快速開始」與「常用指令」 |
| 了解目錄、服務、DB 表與開發流程 | 本文件（README-project.md） |
| 深入 UI 分層、資料流、Modal 慣例、basic/bonus 計算 | [docs/code-architecture.md](docs/code-architecture.md) |
| 新增或執行資料庫遷移 | [docs/database-migration.md](docs/database-migration.md) |
| 用 AI 協作開發（先寫測試再實作） | [docs/ai-workflow.md](docs/ai-workflow.md) |
| 寫或跑測試 | [TEST-README.md](TEST-README.md) |
| 法術/物品描述的 Markdown、HTML | [docs/MARKDOWN-SUPPORT.md](docs/MARKDOWN-SUPPORT.md) |

---

## 專案架構概覽

### 技術架構（高層）

```
前端（React 19 + TypeScript + Vite）
├── 頁面與 Modal（components/）
├── 狀態與 Context（App.tsx 的 stats/setStats、contexts/）
├── 服務層（services/）：Supabase 與領域邏輯
└── 工具與常數（utils/、styles/、lib/）

後端（Supabase）
├── PostgreSQL（角色、能力、戰鬥、法術、物品等表）
├── Auth（登入／匿名）
└── Realtime（可選，即時同步）
```

- **單一資料來源**：畫面上的角色資料以 `stats`（`CharacterStats`）為主，由 `App.tsx` 透過 `setStats` 更新。
- **儲存流程**：各頁面透過 `onSaveXxx` 回調呼叫服務層（如 `DetailedCharacterService`、`HybridDataManager`），寫入 Supabase 後再以 `buildCharacterStats` 組裝並呼叫 `setStats` 更新本地狀態。
- **離線／雲端**：匿名與登入皆使用 Supabase；無單機離線持久化，僅記憶體狀態。

### 目錄結構與職責

| 路徑 | 職責 |
|------|------|
| `App.tsx` | 中央狀態（`stats` / `setStats`）、Tab 路由、`onSaveXxx` 等回調 |
| `components/` | 各分頁與彈窗（Modal）；`components/ui/` 為共用 UI（Modal、FilterBar、FinalTotalRow 等） |
| `contexts/` | `AuthContext`：登入狀態與使用者識別 |
| `services/` | 資料存取與領域邏輯：`hybridDataManager`、`detailedCharacter`、`itemService`、`spellService`、`abilityService`、`combatService` 等 |
| `utils/` | 角色常數（`characterConstants`）、組裝 `CharacterStats`（`appInit`）、屬性與戰鬥數值計算（`characterAttributes`）、職業與兼職（`classUtils`） |
| `styles/` | 共用樣式：`modalStyles.ts`、`common.ts`（STYLES、combatStyles、combineStyles） |
| `hooks/` | `useAppInitialization`、`useToast` |
| `lib/` | Supabase 客戶端（`lib/supabase.ts`）與型別 |
| `data/` | 靜態 JSON/CSV（物品、法術等基礎資料） |
| `scripts/` | 匯入／遷移腳本（法術、物品、DB 更新等） |
| `supabase/migrations/` | 資料庫遷移（SQL） |
| `src/test/` | Vitest 單元／元件測試 |
| `types.ts` | 前端用型別（`CharacterStats`、`CustomRecord`、`ClassInfo` 等） |

### 關鍵服務與模組

- **HybridDataManager**（`services/hybridDataManager.ts`）：統一角色資料存取介面，依登入／匿名選擇後端。
- **DetailedCharacterService**（`services/detailedCharacter.ts`）：角色 CRUD、`updateCurrentStats`、`updateExtraData`；`getFullCharacter` 會聚合能力/物品的 `affects_stats`、`stat_bonuses` 並寫入 `extra_data`，供 `buildCharacterStats` 組裝。
- **UserSettingsService** / **AnonymousService** / **Auth**：使用者設定、匿名 ID、登入狀態。
- **characterItems / combatService / spellService / itemService / abilityService**：戰鬥動作、法術、物品、能力的讀寫與業務規則。
- **databaseInit / migrationHelpers**：DB 初始化與遷移輔助。

資料庫主要表格（角色相關）：`characters`、`character_ability_scores`、`character_current_stats`、`character_currency`、`character_combat_actions`、`character_skill_proficiencies`、`user_settings` 等；詳見 [docs/code-architecture.md](docs/code-architecture.md) 的 DB 對應與 RLS 說明。

---

## 開發流程

### 本地開發

```bash
npm install
npm run dev    # 開發伺服器 http://localhost:3000
```

請在專案根目錄設定 `.env`（`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`），否則僅能使用匿名模式且需後端已部署 schema。

### 執行腳本（匯入／更新資料）

- 腳本多位於 `scripts/`，多數為 Node 腳本（`.js`/`.cjs`），用於將 `data/` 或外部資料匯入 DB 或更新結構。
- 執行前請確認 Supabase 專案與 migrations 已就緒；具體指令見各腳本註解或專案內說明。

### 資料庫遷移

- **新增遷移**：`npm run db:create "描述"`，會在 `supabase/migrations/` 產生新 SQL 檔。
- **執行遷移**：`npm run db:migrate`（會推送到遠端 Supabase）。
- **查看狀態**：`npm run db:status`。

詳見 [docs/database-migration.md](docs/database-migration.md)。**重要**：新增 migration 後應盡快推送到遠端 DB，避免本機與遠端 schema 不一致。

### 新增功能或欄位的建議步驟

1. **需求與驗收**：先與需求方（或 AI 工作流）確認目標、輸入輸出與邊界條件（見 [docs/ai-workflow.md](docs/ai-workflow.md)）。
2. **測試先行**：為新行為撰寫或擴充測試（`src/test/`），再實作功能。
3. **實作**：依 [docs/code-architecture.md](docs/code-architecture.md) 的元件與服務慣例實作；若需新 DB 欄位，用 `db:create` 建立遷移並 `db:migrate`。
4. **跑完整測試**：`npm test`，必要時 `npm run test:watch` 除錯。
5. **更新文件**：若會影響使用方式、環境變數或架構，更新 README 或對應 docs（見本文件末尾「文件維護建議」）。

---

## 測試與品質

- **執行測試**：`npm test` 或 `npm run test:watch`、`npm run test:ui`。
- **覆蓋範圍**：專案以 Vitest 為主，測試集中在 `src/test/`；新功能建議一併補上單元或元件測試。
- 撰寫方式與命名慣例見 [TEST-README.md](TEST-README.md)。

---

## AI 協作工作流摘要

- 先**確認需求**（目標、輸入輸出、邊界、影響範圍）。
- **先設計驗收與測試**，再**先寫測試**，最後才實作功能。
- 實作完成後執行本次測試與**完整單元測試**，再回報結果與影響範圍。

完整守則與適用範圍見 [docs/ai-workflow.md](docs/ai-workflow.md)。

---

## 文件維護建議

- **新功能或行為變更**：若影響「如何跑起來」或「常用指令」，請更新 [README.md](README.md)。
- **架構或目錄、服務職責、DB 對應**：更新 [docs/code-architecture.md](docs/code-architecture.md)。
- **遷移流程或 Supabase 設定**：更新 [docs/database-migration.md](docs/database-migration.md)。
- **測試方式或慣例**：更新 [TEST-README.md](TEST-README.md)。
- 在 PR 或 Issue 中可提醒：是否需同步更新上述文件。
