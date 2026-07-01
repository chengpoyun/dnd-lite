# CLAUDE.md

D&D 冒險者助手 — Vite + React 19 + TypeScript 的手機優先角色管理 App，後端使用 Supabase。

> 本檔為每次 session 的入口濃縮頁。詳細內容請看 `docs/`（見下方「延伸文件」），本檔不重複其內容。

## 常用指令

| 指令 | 用途 |
|------|------|
| `npm run dev` | 開發伺服器（port **3000**，base path **`/dnd-lite/`** → 開 `http://localhost:3000/dnd-lite/`） |
| `npm test` / `npm run t` | 跑 Vitest（單次） |
| `npm run test:watch` | Vitest watch |
| `npm run build` | 產出 `dist/`（target 含 `safari14`，勿產出過新語法） |
| `npm run db:create "描述"` | 建立 migration |
| `npm run db:push` | **推送 migration 到遠端 DB（跨平台，推薦）**；讀 `.env` 憑證，走 `node scripts/db-push.mjs` |
| `npm run db:migrate` | 舊版推送（`.sh`，Windows 需 Git Bash 且本機要有 supabase CLI）|

## 陷阱與注意事項

- **登入牆**：App 開啟後先要登入（Google OAuth 或「匿名試用」），才會進到角色頁。測試用的既有角色叫「**新**」。
- **DB migration 一建立就要立刻推送**：新增 migration 後必須馬上 `npm run db:migrate` 推到遠端，勿累積。
- **`scripts/` 多為 `.sh`**：`db:migrate` / `db:create` / `db:status` 走 shell script，在 Windows 上要用 Git Bash 執行，不能用 PowerShell/cmd 直接跑。**例外**：`db:push` 是 Node 腳本（`scripts/db-push.mjs`），跨平台可直接 `npm run db:push`（推薦用它推送）。
- **環境變數**：`.env` 需要 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`；DB 遷移另需 `SUPABASE_ACCESS_TOKEN`、`SUPABASE_DB_PASSWORD`（皆在 gitignored 的 `.env`）。
- **等級/職業變更後必須 refetch**：依等級或職業計算的數值來自 `extra_data.statBonusSources`；改動等級或職業並寫入 DB 後，要呼叫 `refetchCharacterStats`，否則 max HP、加值列表等會沿用舊值（細節見 `docs/code-architecture.md` §2.1）。
- **路徑別名**：`@` → 專案根目錄（vite 與 vitest 皆設定）。

## 架構速覽

- **單一狀態來源**：`App.tsx` 持有 `stats`（`CharacterStats`），透過 `setStats` 更新；Tab 路由與 `onSaveXxx` 回調也在此。
- **資料流**：Page 元件收 `onSaveXxx` → 呼叫 `services/`（`hybridDataManager` / `detailedCharacter`）寫入 Supabase → 以 `utils/appInit.ts` 的 `buildCharacterStats` 重新組裝 → `setStats`。
- **戰鬥屬性 = basic + bonus = final**：取 final 值一律用 `utils/characterAttributes.ts`（`getFinalCombatStat`、`getFinalAbilityScore`、`getFinalSavingThrow`、`getFinalSkillBonus` 等），勿自行加總。
- **目錄**：`components/`（含 `ui/` 共用元件與各 `XxxModal.tsx`）、`services/`（資料存取）、`utils/`（常數與計算）、`styles/`（`modalStyles.ts`、`common.ts`）、`hooks/`、`contexts/`（`AuthContext`）、`lib/supabase.ts`、`types.ts`、`src/test/`。

## 慣例

- **共用優先**：能複用既有元件/樣式就複用；新元件設計時考慮通用性。Modal 用 `components/ui/Modal.tsx`，命名 `XxxModal.tsx`。
- **手機優先**：字體、點擊區域、間距以手機閱讀為準；Tailwind 深色主題（slate-900/950）、amber 強調色。
- **命名**：camelCase（變數/函式）、PascalCase（元件/型別）。**UI 文案用繁體中文。**
- **測試**：檔案置於 `src/test/`，命名 `Xxx.test.ts` / `Xxx.feature.test.tsx`；`ai-workflow.md` 建議先寫測試再實作。

## 延伸文件

- `docs/code-architecture.md` — 資料流、Modal/樣式慣例、basic/bonus 規則、DB 欄位對應（動 UI 或資料邏輯前必讀）
- `docs/database-migration.md` — migration 建立與推送流程
- `docs/ai-workflow.md` — 開發工作流（測試先行）
- `docs/MARKDOWN-SUPPORT.md` — Markdown 渲染支援
- `README-project.md` — 目錄總覽與「如何在專案裡工作」
