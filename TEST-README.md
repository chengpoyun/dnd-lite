# D&D Lite - 測試文檔 🧪

> 完整的測試套件文檔，確保 D&D 5e 角色管理系統的穩定性與可靠性

[![Tests](https://img.shields.io/badge/tests-124%20passing-brightgreen)](src/test/) [![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](src/test/) [![Vitest](https://img.shields.io/badge/test--framework-Vitest-yellow)](vitest.config.ts)

## 📊 測試總覽

### 統計數據
- **總測試數量**: 124 個測試
- **測試檔案**: 9 個測試檔案
- **測試通過率**: 100%
- **測試框架**: Vitest
- **測試環境**: JSDOM (瀏覽器模擬)

### 測試分類
- **單元測試** (80%) - 個別函數與模組
- **整合測試** (15%) - 服務間互動
- **組件測試** (5%) - React 組件行為

## 🗂️ 測試檔案結構

```
src/test/
├── avatar-save.test.ts          # 頭像儲存功能 (8 tests)
├── character-data-services.test.ts # 角色資料服務 (14 tests)
├── CharacterSheet.test.tsx      # 角色表組件 (8 tests)
├── classUtils.test.ts           # 職業系統工具 (41 tests)
├── CombatView.clean.test.tsx    # 戰鬥介面-清潔 (10 tests)
├── CombatView.defaultItems.test.tsx # 戰鬥介面-預設項目 (7 tests)
├── DeleteFunction.simple.test.tsx # 刪除功能 (4 tests)
├── save-logic.test.ts           # 保存邏輯 (21 tests)
└── updateExtraData.test.ts      # 額外資料更新 (11 tests)
```

## 🎯 詳細測試覆蓋

### 1. 角色基本資料管理 (`save-logic.test.ts`)
- ✅ **角色識別** - 名稱、職業、等級驗證
- ✅ **能力值系統** - 六項基本能力值 (1-30 範圍檢查)
- ✅ **技能熟練度** - 技能名稱與等級驗證 (0=無, 1=熟練, 2=專精)
- ✅ **經驗值與貨幣** - 非負整數驗證
- ✅ **錯誤處理** - 無效值與邊界條件

### 2. 職業系統與兼職支援 (`classUtils.test.ts`)
- ✅ **職業資訊** - 13個基礎職業支援
- ✅ **生命骰系統** - d6, d8, d10, d12 管理
- ✅ **兼職計算** - 多職業等級與熟練度
- ✅ **遷移系統** - 傳統單職業轉換為兼職
- ✅ **顯示格式** - 職業名稱格式化

### 3. 戰鬥系統管理 (`CombatView.*.test.tsx`)
- ✅ **預設動作保護** - 攻擊、衝刺等預設動作不可刪除
- ✅ **自訂動作管理** - 新增、編輯、刪除自訂戰鬥動作
- ✅ **編輯模式切換** - UI 狀態正確切換
- ✅ **項目分類** - 動作、獎勵動作、反應分類
- ✅ **功能完整性** - CRUD 操作完整支援

### 4. 資料持久化 (`character-data-services.test.ts`)
- ✅ **Supabase 整合** - 資料庫連線與操作
- ✅ **資料同步** - 即時更新與衝突解決
- ✅ **錯誤處理** - 網路異常與資料庫錯誤
- ✅ **匿名支援** - 訪客模式資料管理

### 5. 額外資料管理 (`updateExtraData.test.ts`)
- ✅ **參數驗證** - characterId UUID 格式檢查
- ✅ **修整期管理** - downtime 數值更新
- ✅ **名聲威望** - renown 與 prestige 系統
- ✅ **自訂記錄** - customRecords 動態內容

### 6. UI 組件行為 (`CharacterSheet.test.tsx`)
- ✅ **組件渲染** - 正確顯示角色資料
- ✅ **Props 傳遞** - 資料正確流動
- ✅ **互動測試** - 表單輸入與提交
- ✅ **錯誤邊界** - 異常狀態處理

### 7. 檔案管理 (`avatar-save.test.ts`)
- ✅ **頭像上傳** - 圖片檔案處理
- ✅ **格式驗證** - 支援的圖片格式
- ✅ **大小限制** - 檔案大小檢查
- ✅ **錯誤處理** - 上傳失敗情境

### 8. 刪除功能 (`DeleteFunction.simple.test.tsx`)
- ✅ **安全刪除** - 確認對話框
- ✅ **關聯清理** - 相關資料同步刪除
- ✅ **權限檢查** - 用戶授權驗證
- ✅ **回滾機制** - 刪除失敗復原

## 🚀 運行測試

### 基本命令
```bash
# 運行所有測試
npm test

# 監視模式 (開發時使用)
npm run test:watch

# 測試 UI 介面
npm run test:ui

# 快速測試 (別名)
npm run t
```

### 高級選項
```bash
# 運行特定檔案
npx vitest run src/test/classUtils.test.ts

# 運行匹配模式的測試
npx vitest run --grep "職業系統"

# 產生覆蓋率報告
npx vitest run --coverage
```

## 🔧 測試配置

### Vitest 設定 (`vitest.config.ts`)
```typescript
export default defineConfig({
  test: {
    globals: true,           // 全域測試函數
    environment: 'jsdom',    // DOM 環境模擬
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html']
    }
  }
})
```

### 測試環境設定 (`src/test/setup.ts`)
- Testing Library 配置
- JSDOM polyfills
- 全域 mocks 設定

## 📈 品質保證

### 持續整合
- ✅ 每次提交自動執行測試
- ✅ Pull Request 必須通過所有測試
- ✅ 測試覆蓋率維持 100%

### 測試策略
- **單元測試優先** - 確保每個函數正確運作
- **整合測試補充** - 驗證系統間互動
- **回歸測試防護** - 防止功能倒退
- **邊界條件覆蓋** - 處理極端情況

## 🐛 測試除錯

### 常見問題
1. **JSDOM 限制** - 某些瀏覽器 API 需要 mock
2. **非同步操作** - 正確使用 async/await
3. **React 狀態** - 使用 act() 包裝狀態更新
4. **資料庫連線** - 使用 mock 避免實際資料庫操作

### 除錯技巧
```bash
# 使用 Node.js inspector
npx vitest --inspect-brk

# 顯示詳細錯誤
npx vitest --reporter=verbose

# 只運行失敗的測試
npx vitest --run --reporter=verbose --bail=1
```

## 📋 新增測試指南

### 測試檔案命名
- 功能測試: `*.test.ts`
- 組件測試: `*.test.tsx`
- 置於 `src/test/` 目錄

### 測試結構
```typescript
import { describe, it, expect } from 'vitest'

describe('功能模組名稱', () => {
  describe('子功能群組', () => {
    it('應該正確執行特定行為', () => {
      // Arrange - 準備測試資料
      // Act - 執行測試動作
      // Assert - 驗證結果
      expect(result).toBe(expected)
    })
  })
})
```

---

**📍 重要提醒**: 所有新功能開發都必須包含對應的測試案例，確保系統穩定性！

**🎯 目標**: 維持 100% 測試通過率，打造最穩定可靠的 D&D 輔助工具！