# Changelog

本檔僅紀錄每個版本的**關鍵變更**，不包含實作細節。

---

## 1.1.5

- 優化：抽出 `withSaveGuard` 共用儲存流程守衛（utils/saveGuard.ts），App.tsx 各 onSaveXxx 改為使用，減少重複 guard 與 try/finally。

## 1.1.4

- 資料庫效能與 Performance Advisor：移除 16 個未使用索引（0005）、為 3 個外鍵補上索引（0001）；修正 RLS 的 auth_rls_initplan（0003）與 multiple_permissive_policies（0006）；為 `global_items` 搜尋新增 pg_trgm + GIN 索引以加速 ILIKE 查詢。
- 於 `docs/database-migration.md` 補充 Performance Advisor（0001/0005/0003/0006）與 Query Performance 說明。

## 1.1.3

- 修復 Supabase Security Advisor 警告：為 `update_abilities_updated_at` 設定 `search_path`（0011）；將 `global_items`、`spells` 的過於寬鬆 RLS 改為明確的 JWT role 條件（0024），不影響用戶上傳物品／法術／能力。
- 於 `docs/database-migration.md` 補充 Security Advisor 各項警告的處理說明（含 0012 匿名存取與 Leaked Password 的 Dashboard 設定）。

## 1.1.2

- 修復屬性區豁免優劣勢框框左右被裁切：僅在六格屬性區加左右 padding，不影響技能調整區。

## 1.1.1

- 修復寬螢幕下技能檢定優劣勢框框造成內容底色不一致（優劣勢外框與技能按鈕改為填滿格子，統一由按鈕背景覆蓋）。

## 1.1.0

- 新增「地形」分頁與地形獎勵流程（包含地形卡、地形獎勵彈窗與備用技能檢定）。
- 統一技能加值覆寫邏輯（`skillBasicOverrides` + `skillBonuses`）在角色卡、戰鬥加值表與地形獎勵流程。
- 調整共用樣式與測試設定（FilterBar 樣式、`@` 別名、相關測試）。
- 更新版本顯示：`package.json` 版本改為 `1.1.0`，About 頁顯示同步改為讀取此版本。

## 1.0.0

- 初始穩定版：
  - 角色卡（屬性、技能、能力、裝備、金錢與經驗值等）。
  - 戰鬥檢視（HP、先攻、戰鬥動作與加值表）。
  - 物品／能力管理與筆記頁。
  - 基本骰子擲骰功能。

