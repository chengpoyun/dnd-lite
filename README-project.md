# D&D Lite - 冒險者助手

一個現代化的 D&D 5e 角色管理應用程式，使用 React + TypeScript + Supabase 構建。

## 開發指南

### AI 助理工作規範

如需更新 AI 助理的工作守則，請：

1. **專案層級**：編輯 `.assistant-guidelines.md`
2. **對話層級**：直接在對話中提出新的要求
3. **代碼層級**：在代碼註釋中添加具體指導

### 架構原則

- **資料儲存**：完全使用 Supabase PostgreSQL，無 localStorage 依賴
- **認證**：支援 Supabase Auth 和匿名模式
- **狀態管理**：React useState/useEffect，無額外狀態庫
- **樣式**：TailwindCSS + 自定義 CSS

### 關鍵服務

- `HybridDataManager`: 核心資料操作（已移除 localStorage）
- `UserSettingsService`: 用戶偏好設定
- `CharacterItemService`: 角色物品管理
- `DetailedCharacterService`: 完整角色資料

### 資料庫結構

主要表格：
- `characters` - 角色基本資料
- `character_items` - 角色物品
- `user_settings` - 用戶設定
- `character_combat_actions` - 戰鬥動作

## 快速開始

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 推送 Migration
npx supabase db push
```

## 更新 AI 工作守則

1. **編輯專案指南**：
   ```bash
   code .assistant-guidelines.md
   ```

2. **在對話中指定**：
   ```
   請在這個專案中遵循以下規則：
   - [具體要求]
   ```

3. **代碼註釋指導**：
   ```typescript
   // AI: 這個函數需要保持向後相容性
   function legacyFunction() { ... }
   ```