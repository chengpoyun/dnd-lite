# D&D Lite 測試說明

> 本文件說明如何**執行測試**、測試覆蓋範圍，以及**撰寫新測試**時的目錄與命名慣例。專案使用 Vitest 與 Testing Library。  
> 開發流程與「先寫測試再實作」原則見 [README-project.md](README-project.md) 與 [docs/ai-workflow.md](docs/ai-workflow.md)。

---

## 測試總覽

- **測試框架**：Vitest
- **環境**：JSDOM（模擬瀏覽器）
- **測試檔位置**：`src/test/`
- **命名**：`*.test.ts`（單元）、`*.test.tsx`（元件）

專案目前有多個單元與元件測試，涵蓋角色資料、職業與兼職、戰鬥、儲存邏輯、頭像與刪除等；新功能建議一併補上對應測試。

---

## 如何執行測試

### 基本指令

```bash
# 執行所有測試（單次）
npm test

# 監聽模式（開發時使用）
npm run test:watch

# Vitest UI 介面
npm run test:ui

# 別名：單次執行
npm run t
```

### 進階用法

```bash
# 執行單一檔案
npx vitest run src/test/classUtils.test.ts

# 依名稱篩選
npx vitest run --grep "職業系統"

# 產生覆蓋率報告
npx vitest run --coverage
```

---

## 測試檔案結構（示例）

```
src/test/
├── avatar-save.test.ts
├── character-data-services.test.ts
├── CharacterSheet.test.tsx
├── classUtils.test.ts
├── CombatView.clean.test.tsx
├── CombatView.defaultItems.test.tsx
├── DeleteFunction.simple.test.tsx
├── save-logic.test.ts
├── updateExtraData.test.ts
└── setup.ts
```

實際檔名與數量以專案為準；新測試請放在 `src/test/`，並依功能或元件命名（見下方「撰寫新測試」）。

---

## 測試覆蓋重點（摘要）

- **角色與儲存**：角色基本資料、能力值、技能、經驗值與貨幣、儲存邏輯（如 `save-logic.test.ts`）。
- **職業與兼職**：職業資訊、生命骰、兼職計算、遷移與顯示（如 `classUtils.test.ts`）。
- **戰鬥**：預設動作保護、自訂動作 CRUD、編輯模式（如 `CombatView.*.test.tsx`）。
- **資料與服務**：Supabase 整合、同步、錯誤處理、匿名支援（如 `character-data-services.test.ts`）。
- **額外資料**：extra_data、downtime、renown、customRecords（如 `updateExtraData.test.ts`）。
- **UI 與互動**：角色表渲染、表單與提交、頭像上傳、刪除確認（如 `CharacterSheet.test.tsx`、`avatar-save.test.ts`、`DeleteFunction.simple.test.tsx`）。

詳細案例與情境請直接參考各 `src/test/*.test.*` 檔案。

---

## 撰寫新測試

### 檔案命名與位置

- **單元／邏輯測試**：`src/test/<模組或功能>.test.ts`
- **元件測試**：`src/test/<元件名>.test.tsx` 或 `<功能>.test.tsx`
- 可依子功能拆成多檔（例如 `CombatView.clean.test.tsx`）。

### 建議結構（AAA）

```typescript
import { describe, it, expect } from 'vitest'

describe('模組或功能名稱', () => {
  describe('子情境', () => {
    it('應正確處理某種情況', () => {
      // Arrange：準備資料與環境
      // Act：執行被測行為
      // Assert：驗證結果
      expect(result).toBe(expected)
    })
  })
})
```

### Mock 與設定

- 需隔離後端時可使用 `vi.mock('...')`，例如：`vi.mock('../../services/hybridDataManager')`。
- 全域或共用設定（如 Testing Library、JSDOM）見 `src/test/setup.ts`。
- 撰寫前可參考 [docs/ai-workflow.md](docs/ai-workflow.md)：先寫測試、再實作，並跑完整 `npm test` 確保無回歸。

### 新增功能時建議

- **改動資料或 API**：為新行為或邊界條件加單元測試。
- **改動 UI 或流程**：為關鍵互動或狀態加元件測試。
- **改動服務層**：對外介面與錯誤情境加測試，必要時 mock Supabase。

---

## 設定檔

- **Vitest**：`vitest.config.ts`（environment、setupFiles、coverage 等）。
- **測試環境**：`src/test/setup.ts`（Testing Library、JSDOM、全域 mocks）。

---

## 常見問題與除錯

- **JSDOM 限制**：部分瀏覽器 API 需 mock 或 polyfill。
- **非同步**：使用 `async/await` 或 Vitest 提供的非同步輔助。
- **React 狀態**：狀態更新請以 `act()` 包裝（Testing Library 通常已處理）。
- **資料庫**：單元／元件測試應 mock 後端，避免實際連線。

除錯時可嘗試：

```bash
npx vitest --reporter=verbose
npx vitest run --bail=1
npx vitest --inspect-brk
```

---

## 相關文件

- [README.md](README.md)：專案簡介與 `npm test` 指令
- [README-project.md](README-project.md)：開發流程與測試策略
- [docs/ai-workflow.md](docs/ai-workflow.md)：先寫測試再實作的 AI 工作流
