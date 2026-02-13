# D&D Lite（冒險者助手）

> 現代化的 D&D 5e 角色管理網頁應用，專為數位桌遊與跑團設計。支援角色卡、戰鬥輔助、法術/物品管理、內建骰子與雲端同步。

[![Tests](https://img.shields.io/badge/tests-365%20passing-brightgreen)](src/test/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](tsconfig.json) [![React](https://img.shields.io/badge/React-19-61dafb)](package.json)

---

## 專案簡介

**D&D Lite** 是單頁式（SPA）的 D&D 5e 角色管理工具，適合：

- **玩家**：建立與管理角色、追蹤 HP/先攻、使用法術與物品、擲骰
- **主持人**：快速查看怪物與戰況
- **開發者**：在 React + TypeScript + Supabase 技術棧上擴充功能

無需註冊即可試用（匿名模式）；登入後資料透過 Supabase 雲端同步，跨裝置存取。

---

## 功能總覽

- **角色管理**：能力值、技能熟練度、兼職（multiclass）支援、經驗值與貨幣
- **戰鬥輔助**：血量（HP）、護甲等級（AC）、先攻、戰鬥動作與獎勵動作、休息（短休/長休）
- **法術與物品**：法術表、物品庫、角色法術/物品裝備，描述欄位支援 [Markdown/HTML](docs/MARKDOWN-SUPPORT.md)
- **怪物**：怪物卡與戰役內怪物管理
- **裝備與骰子**：裝備欄位、內建骰子（含修正值）
- **筆記**：角色筆記與戰鬥筆記
- **雲端同步**：Supabase 後端，Row Level Security（RLS）隔離使用者資料
- **響應式 UI**：手機、平板、桌面皆可操作

---

## 技術棧

| 類別 | 技術 |
|------|------|
| 前端 | React 19、TypeScript |
| 建置 | Vite 6 |
| 樣式 | Tailwind CSS |
| 後端／資料 | Supabase（PostgreSQL、Auth、Realtime） |
| 測試 | Vitest、Testing Library |
| 部署 | GitHub Pages（`main` 分支推送後自動建置） |

專案為**單一前端應用**，無獨立 API 伺服器；後端能力由 Supabase 提供。

---

## 快速開始（Quick Start）

### 環境需求

- **Node.js** 18+（建議 20）
- **npm** 或 yarn

### 安裝與啟動

```bash
# 克隆專案
git clone <repository-url>
cd dnd-lite

# 安裝依賴
npm install

# 啟動開發伺服器（預設 http://localhost:3000）
npm run dev
```

### Supabase 設定（雲端同步與登入）

若要使用登入與雲端同步，需自建 Supabase 專案並設定環境變數：

1. 在 [Supabase](https://supabase.com) 建立專案，取得 **Project URL** 與 **anon public key**。
2. 在專案根目錄建立 `.env`（勿提交至版控），例如：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. 依專案內 `supabase/migrations/` 執行資料庫遷移，並在 Supabase 後台設定好 Auth 與 RLS。詳見 [資料庫遷移說明](docs/database-migration.md)。

未設定上述變數時，應用仍可啟動，但僅能使用匿名模式（資料存於 Supabase 時需後端已部署對應 schema）。

### 瀏覽器支援與 Safari

- **建議**：Chrome / Firefox / Edge / Safari **14+**（含 iOS 14+ 的 Safari）。建置已設定 `target: es2020, safari14` 以相容 Safari。
- **若 Safari 無法開啟**：請確認 (1) 使用 **HTTPS 或 localhost** 開啟（勿用 `file://`）；(2) 更新至最新版 Safari / iOS；(3) 關閉「防止跨網站追蹤」或改用無痕再試一次（僅作除錯用）。

### 常用指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | 建置生產版本（輸出至 `dist/`） |
| `npm run preview` | 本地預覽建置結果 |
| `npm test` | 執行所有測試（Vitest） |
| `npm run test:watch` | 監聽模式執行測試 |
| `npm run test:ui` | 開啟 Vitest UI |
| `npm run db:create "描述"` | 建立新的 DB 遷移檔 |
| `npm run db:migrate` | 執行遷移並推送到 Supabase |
| `npm run db:status` | 查看遷移狀態 |

---

## 基本使用流程（使用者角度）

1. **建立角色**：在角色選擇頁面建立新角色，填寫名稱、職業、等級等。
2. **編輯角色卡**：在「角色」分頁維護能力值、技能、裝備、法術與物品。
3. **戰鬥**：在「戰鬥」分頁管理 HP、AC、先攻、戰鬥動作與休息。
4. **擲骰**：使用「骰子」分頁或戰鬥/法術中的擲骰功能。
5. **雲端同步**：登入後變更會自動同步；匿名使用者則以裝置與匿名 ID 辨識。

---

## 專案目標與設計理念

- **雲端優先**：角色與設定存於 Supabase，不依賴 `localStorage`。
- **類型安全**：全面使用 TypeScript，降低執行期錯誤。
- **測試驅動**：核心邏輯與關鍵 UI 有單元／元件測試，新功能建議先補測試再實作（見 [AI 工作流](docs/ai-workflow.md)）。
- **手機優先**：版面與字級以行動裝置為主要考量。

---

## 常見問題（Troubleshooting）

- **無法連線或登入**  
  確認 `.env` 中 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` 正確，且 Supabase 專案已執行完 migrations、Auth 與 RLS 已啟用。

- **建置後在 GitHub Pages 路徑不對**  
  本專案已設定 `base: '/dnd-lite/'`，需部署至 `https://<username>.github.io/dnd-lite/`；若部署至其他路徑，請調整 `vite.config.ts` 的 `base`。

- **測試失敗**  
  執行 `npm test` 或 `npm run test:watch`，依錯誤訊息檢查；詳見 [測試說明](TEST-README.md)。

---

## 相關文件

| 文件 | 說明 |
|------|------|
| [README-project.md](README-project.md) | 開發者指南：架構、目錄、開發流程、DB 與 AI 工作流摘要 |
| [docs/code-architecture.md](docs/code-architecture.md) | 程式架構：資料流、元件慣例、樣式、服務層與 DB 對應 |
| [docs/database-migration.md](docs/database-migration.md) | 資料庫遷移：建立、執行、注意事項 |
| [docs/ai-workflow.md](docs/ai-workflow.md) | AI 協作工作流：需求確認、先寫測試再實作、回報 |
| [docs/MARKDOWN-SUPPORT.md](docs/MARKDOWN-SUPPORT.md) | 法術/物品描述欄位的 Markdown 與 HTML 支援 |
| [TEST-README.md](TEST-README.md) | 測試：如何執行、覆蓋範圍、撰寫新測試 |

---

## 貢獻指南

1. Fork 本專案
2. 自 `main` 建立功能分支（例如 `git checkout -b feature/xxx`）
3. 變更後執行 `npm test` 確保通過
4. 提交變更（`git commit -m '...'`）並推送到分支
5. 開啟 Pull Request

較大功能或重構建議先於 Issue 討論；實作時請參考 [README-project.md](README-project.md) 與 [docs/ai-workflow.md](docs/ai-workflow.md)。若變更會影響使用方式或環境設定，請同步更新本 README 或相關 docs。

---

## 授權

本專案採用 [MIT 授權](LICENSE)。
