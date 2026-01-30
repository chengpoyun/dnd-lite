# D&D Lite 專案 - AI 助理工作指南

> 📌 **本文檔為 AI 助理專用**：內容經過精簡設計以提升 AI 閱讀效率，保持所有原則同時優化表達方式。

## 📝 核心工作原則

### 1. 🔄 修改前討論 (原則)
- **重大修改前必須先說明計劃**
- 詳細解釋：修改內容、原因、預期效果
- **等待用戶確認「可以」後才開始執行**

**🎯 可直接執行的簡單修改**：
- 修正拼字錯誤、語法錯誤
- 調整文字內容、註解更新
- 簡單的樣式調整（顏色、間距等）
- 文檔內容更新
- 不涉及架構或邏輯的修改

**⚠️ 必須討論的重大修改**：
- 新增或修改功能邏輯
- 資料庫結構變更
- API 介面調整
- 組件架構修改
- 安全性相關變更

### 2. ✅ 修改後驗證 (自動執行)
- 修改完成後立即檢查結果是否符合討論內容
- 發現偏差時主動修正，以討論結果為準
- 確保最終結果與約定內容完全一致

### 3. 📊 專案狀態透明化
- 每次修改後更新專案狀態
- 記錄已知問題和解決進度
- 保持工作流程可追蹤

### 4. 🧪 單元測試工作原則 (必須遵守)
**🎯 確保代碼品質和防止回歸問題**

**必須執行的測試檢查：**
- **所有修改都需確認單元測試沒有問題** - 每次代碼變更後都要執行 `npm test` 確保現有測試通過
- **每次成功修復一個問題，都要考慮是否新增相關的單元測試** - 為修復的 bug 建立測試案例防止再次發生
- **每次實作完畢一個新功能，都要考慮是否新增相關的單元測試** - 為新功能建立完整測試覆蓋率
- **用戶說「此問題已解決」時，嘗試設計簡單的單元測試** - 為確認的修復建立測試保護

**測試最佳實務：**
- ✅ 在修改核心邏輯前先運行測試確保起始狀態正常
- ✅ 使用測試保護腳本 `./test-protection.sh` 驗證測試能捕獲破壞性修改
- ✅ 針對資料保存、用戶互動、錯誤處理建立測試案例
- ✅ 遵循測試文檔 `src/test/TEST-README.md` 的指引

### 5. 🔄 資料持久化檢查清單 (防止回歸問題)
**🎯 每次修改涉及狀態更新時必須檢查**

**必須確認的事項：**
- **本地狀態更新後，是否需要保存到數據庫？** - 任何 `setState` 或狀態修改都要檢查是否需要對應的保存操作
- **用戶操作完成後，資料是否會持久化？** - 特別注意上傳、編輯、新增等操作
- **頁面重載後，修改的資料是否還存在？** - 這是最重要的驗證點

**高風險操作清單：**
- 🔴 **圖片/檔案上傳** - 必須有對應的 URL 保存函數
- 🔴 **表單輸入** - 確認有 onSave 回調和數據庫更新
- 🔴 **拖放排序** - 順序改變需要立即保存
- 🔴 **開關切換** - 布林值變更要觸發保存
- 🔴 **新增/刪除項目** - 列表變更必須同步到數據庫

**開發自我檢查流程：**
1. **修改前** - 確認現有保存機制
2. **修改中** - 每個狀態更新都配對一個保存操作  
3. **修改後** - 測試重載後資料是否持續存在
4. **測試保護** - 為新功能添加對應測試案例

### 6. 🎯 獨立保存函數設計原則 (必須遵守)
**🎯 每個可修改的數值都應該有專屬的保存函數**

**設計原則：**
- **單一職責** - 每個保存函數只負責一個特定數值或相關數值組
- **精確更新** - 只更新被修改的特定值，避免不必要的數據庫操作
- **獨立性** - 各值的修改和保存互不影響，失敗不會連帶其他值
- **清晰命名** - 函數名稱明確指出保存的內容 (如 `saveHP`, `saveAC`, `saveInitiative`)

**實施模式：**
```typescript
// ✅ 推薦：獨立保存函數
const saveHP = async (current: number, max: number) => Promise<boolean>
const saveAC = async (ac: number) => Promise<boolean>  
const saveInitiative = async (initiative: number) => Promise<boolean>

// ❌ 避免：大型綜合保存函數
const saveAllStats = async (stats: CharacterStats) => Promise<boolean>
```

**優勢說明：**
- **性能優化** - 只傳輸和更新必要的數據
- **錯誤定位** - 可以精確知道哪個值保存失敗
- **用戶體驗** - 部分保存失敗不影響其他已成功保存的值
- **維護性** - 修改特定值的保存邏輯不影響其他值

### 7. � Debug 日誌規範
**🎯 使用統一標記方便清理**

- **Debug 標記** - 驗證問題時使用的 `console.log()` 必須加上 `[DEBUG]` 前綴
- **範例格式** - `console.log('[DEBUG] 用戶狀態:', userContext)`
- **便於清理** - 問題解決後可快速搜尋並刪除所有 debug 日誌

### 8. 🔄 Git 提交工作流程
**⚠️ 只有在用戶明確確認後才能提交**

- **等待確認** - 當用戶說「此問題已解決」時，按以下順序執行：
  1. **移除測試 log** - 搜尋並刪除所有帶 `[DEBUG]` 標記的測試日誌
  2. **設計單元測試** - 為確認的修復建立測試保護
  3. **提交並推送** - 將變更推送至遠端
- **禁止自動提交** - 未經確認不得執行 `git commit` 或 `git push`
- **提交前檢查** - 確認所有測試通過、代碼符合規範

## 專案特定規則

### 代碼風格
- 使用 TypeScript 嚴格模式
- React 組件使用函數式寫法
- 優先使用 async/await 而非 Promise.then()
- **CSS 重用原則** - 相似 UI 元件共用 CSS 代碼（使用 Tailwind 或共用樣式類），避免每個元件獨立樣式，便於統一維護和修改

### 資料庫操作
- 永遠使用 Database，避免 localStorage
- 所有資料操作都要有錯誤處理
- 使用 Supabase 的 RLS 政策確保安全性
- **🔑 狀態持久化黃金原則：每個用戶操作的狀態變更都必須有對應的數據庫保存機制**

### 🛢️ 資料庫遷移安全原則 (必須遵守)
**🚨 所有 DB Migration 都必須確保原有資料不會損毀**

**必須執行的安全檢查：**
1. **備份驗證** - 確認重要資料已備份或可恢復
2. **向下兼容** - 新結構必須支援現有資料格式
3. **資料保護** - 使用 `ALTER` 添加欄位，避免 `DROP` 刪除欄位
4. **測試驗證** - Migration 後確認現有功能正常運作
5. **回滾準備** - 準備反向操作以防需要回退

**禁止的危險操作：**
- ❌ `DROP TABLE` - 刪除表格
- ❌ `DROP COLUMN` - 刪除欄位 (除非確認無資料)
- ❌ `ALTER COLUMN ... DROP` - 刪除約束或預設值
- ❌ 沒有備份的批量 `UPDATE` 或 `DELETE`

**推薦的安全做法：**
- ✅ `ALTER TABLE ... ADD COLUMN` - 添加新欄位
- ✅ `CREATE INDEX IF NOT EXISTS` - 安全創建索引
- ✅ 使用 `COALESCE` 處理 NULL 值
- ✅ 分階段遷移：先添加，後遷移資料，最後清理

### Migration 標準流程 (遠端 Supabase)
1. **安全性評估** → 檢查 Migration 是否會損毀資料
2. **建立 migration 文件** → 創建新的 `.sql` 檔案
3. **執行 migration** → ⚠️ **透過以下方式推送到遠端**：
   ```bash
   # 從 .env 讀取 SUPABASE_ACCESS_TOKEN 並執行推送
   cd /home/barry/dnd-lite && \
   export $(cat .env | grep SUPABASE_ACCESS_TOKEN | xargs) && \
   supabase db push
   ```
4. **驗證更新** → 確認遠端資料庫欄位實際更新成功
5. **資料完整性檢查** → 確保現有資料完好無損
6. **測試功能** → 確保應用程式正常運作

**注意事項：**
- SUPABASE_ACCESS_TOKEN 儲存在專案根目錄的 `.env` 檔案中
- 每次執行 migration 前需要先 `export` token
- 使用系統的 `supabase` CLI（位於 `/usr/local/bin/supabase`）

### UUID 驗證最佳實務
**🔑 核心原則：防範無效資料進入資料庫**

**必須執行的驗證檢查：**
1. **多層級驗證** - 在服務函數和資料管理器中都要實作 UUID 驗證
2. **空值檢查** - 絕不允許空字串或 null 值傳遞到資料庫操作
3. **格式驗證** - 確認 UUID 符合正確格式（36 字元含連字號）
4. **防禦性程式設計** - 在關鍵資料流程點加入檢查機制

### 開發流程
- 修改資料庫結構時，創建 migration 檔案
- 重大變更前先備份相關檔案
- 使用 `multi_replace_string_in_file` 進行批量修改

### 用戶體驗
- 提供載入狀態和錯誤訊息
- 確保認證和匿名用戶都能正常使用
- 保持 UI 響應式設計
- **🎯 手機優先 (Mobile-First)** - 主要目標為手機瀏覽器使用
- **📱 響應式設計 (RWD)** - 確保各種裝置都能良好顯示
- **觸控友善** - 按鈕大小適合手指操作
- **🚫 禁止使用 `alert()`、`confirm()`、`prompt()`** - 所有用戶確認操作都必須使用 Modal 組件
  - ✅ 正確：使用 `<ConfirmDeleteModal>` 等自定義 Modal 組件
  - ❌ 錯誤：`if (confirm('確定刪除？'))` 或 `alert('操作成功')`
  - **原因：** 原生對話框無法客製化樣式、不支援 RWD、體驗較差

### 檔案組織
- Services 放在 `services/` 目錄
- 組件放在 `components/` 目錄  
- 類型定義統一在 `lib/supabase.ts`
- Migration 檔案使用時間戳命名

## 🎲 D&D 5E 規則合規性

### 必須遵守的原則
- **所有功能必須符合 D&D 5E 官方規則**
- 遊戲機制、數值計算、術語使用都要準確
- 參考來源：[D&D 5e Tools](https://5e.tools/)

### 實作指導
- 用戶需求不明確時，直接採用 D&D 標準規則
- 發現不符合規則的修改時，必須告知用戶
- 優先考慮遊戲平衡性和規則正確性

## 🔧 技術棧規範

### 前端技術
- **React + TypeScript** - 主要開發框架
- **Tailwind CSS** - 樣式系統
- **Vite** - 建置工具

### 開發環境設定
- **開發伺服器** - 永遠使用 `localhost:3000` 執行 `npm run dev`（測試環境也發布於此端口）
- **端口固定** - 確保開發環境一致性，避免端口衝突問題

### 後端與資料庫
- **Supabase** - 後端即服務 (遠端)
- **PostgreSQL** - 資料庫
- **Row Level Security (RLS)** - 資料安全

## 特殊注意事項

- 這是一個 D&D 角色管理應用
- 支援多角色管理
- 需要處理戰鬥、技能、物品等遊戲元素
- 考慮手機和桌面使用體驗

## 🔄 每日開發流程
- [ ] 確認專案狀態和已知問題
- [ ] 與用戶討論修改計劃
- [ ] 獲得確認後執行修改
- [ ] **持久化檢查** - 驗證所有狀態更新都有對應的保存機制
- [ ] **重載測試** - 確認頁面重載後用戶資料完整
- [ ] 測試修改結果
- [ ] 更新專案狀態

## ⚡ 性能優化經驗 (必須遵守)
**🎯 應用初始化和資料載入性能優化原則**

### 完整案例：從 53 秒優化到 3 秒的實戰經驗 (2026-01-29)

**初始問題：應用載入超過 53 秒**
- 用戶報告：初始化觸發兩次、角色載入失敗、經常超時
- 通過 `performance.now()` 定位到三大瓶頸

---

### 📊 性能優化總覽

| 階段 | 優化前 | 優化後 | 改善 |
|------|--------|--------|------|
| 身份驗證 | 36.6s (冗餘調用) | 0ms (傳遞上下文) | **-100%** |
| 角色列表查詢 | 11.8s → 34.3s (冷啟動) | 1-2s (重試機制) | **-95%** |
| 完整角色載入 | 92.7s (7個查詢) | 2.9s (單一JOIN) | **-97%** |
| 資料庫初始化 | 卡住/超時 | 1-2s (重試+超時) | **穩定** |
| **總載入時間** | **53-140s** | **3-5s** | **-95%** |

---

### 核心問題與解決方案

#### 問題一：冗餘的身份驗證調用（-36.6s）
**症狀：** 
- `supabase.auth.getUser()` 在已有用戶狀態時仍被重複調用
- 首次調用耗時 36.6 秒，第二次僅 132ms（說明首次有巨大開銷）

**根本原因：**
- AuthContext 已經維護用戶狀態
- 服務層 (DetailedCharacterService) 仍然重複調用 `getCurrentUserContext()`
- 每次資料查詢都觸發不必要的身份驗證檢查

**解決方案 - 傳遞用戶上下文：**
```typescript
// ✅ 正確做法：從 AuthContext 傳遞用戶上下文
const userContext = {
  isAuthenticated: true,
  userId: user.id
}
const characters = await HybridDataManager.getUserCharacters(userContext)

// ❌ 錯誤做法：讓服務層自己獲取用戶狀態
const characters = await HybridDataManager.getUserCharacters() // 會觸發 supabase.auth.getUser()
```

**實施要點：**
1. **應用層傳遞上下文** - 在 App.tsx 使用 AuthContext 的 user 狀態
2. **服務層接受參數** - DetailedCharacterService 和 HybridDataManager 都要支援 `userContext` 參數
3. **可選參數設計** - 保持向後兼容，`userContext` 為可選參數
4. **效果驗證** - 消除 36.6 秒的冗餘調用，減少 ~70% 的總載入時間

#### 問題二：低效的資料庫查詢（11.8s → 1.4s）
**症狀：**
- 簡單的角色列表查詢耗時 11.8 秒
- 資料庫結構簡單且資料量少，理應極快

**根本原因：**
- 使用 `SELECT *` 查詢所有欄位（包括不需要的）
- 缺少 `ORDER BY` 子句，資料庫需要額外處理
- 查詢未明確指定需要的欄位

**解決方案 - 查詢優化：**
```typescript
// ✅ 正確做法：明確指定欄位和排序
let query = supabase
  .from('characters')
  .select('id, user_id, anonymous_id, name, character_class, level, experience, avatar_url, is_anonymous, created_at, updated_at')
  .order('updated_at', { ascending: false })

// ❌ 錯誤做法：使用 SELECT * 且無排序
let query = supabase.from('characters').select('*')
```

**實施要點：**
1. **明確欄位列表** - 只查詢實際需要的欄位
2. **添加排序** - 使用 `ORDER BY` 讓資料庫利用索引
3. **避免通配符** - 不使用 `SELECT *`
4. **效果驗證** - 查詢時間大幅降低

#### 問題三：RLS 政策子查詢開銷（92.7s → 2.9s，關鍵優化）
**症狀：**
- 多個並行查詢（7個）耗時極長（92.7秒）
- 每個子表查詢平均 13 秒
- 剛完成的角色列表查詢很快（1.4秒），說明不是冷啟動

**根本原因：**
- **每個子表的 RLS 政策都執行 `EXISTS` 子查詢** 到 characters 表
- 7 個並行查詢 = 7 次獨立的 RLS 檢查 + 7 次 `auth.uid()` 調用
- RLS 政策範例：
```sql
CREATE POLICY "Users can view own character ability scores" ON character_ability_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = character_ability_scores.character_id 
    AND auth.uid() = characters.user_id)
);
```
- 每次查詢都要：檢查身份 → 子查詢 characters 表 → 驗證權限

**解決方案 - 使用單一 JOIN 查詢：**
```typescript
// ✅ 正確做法：單一查詢 + JOIN，讓 Supabase 自動找外鍵
const { data } = await supabase
  .from('characters')
  .select(`
    *,
    character_ability_scores(*),
    character_current_stats(*),
    character_currency(*),
    character_saving_throws(*),
    character_skill_proficiencies(*),
    character_combat_actions(*)
  `)
  .eq('id', characterId)
  .single()

// ❌ 錯誤做法：多個並行查詢，每個都觸發 RLS 檢查
const [char, abilities, stats] = await Promise.all([
  supabase.from('characters').select('*').eq('id', characterId),
  supabase.from('character_ability_scores').select('*').eq('character_id', characterId),
  supabase.from('character_current_stats').select('*').eq('character_id', characterId)
])
```

**實施要點：**
1. **使用簡化的 JOIN 語法** - `table_name(*)` 讓 Supabase 自動找到外鍵關係
2. **避免手動指定外鍵名稱** - `table!foreign_key_name (*)` 語法容易出錯
3. **只在主表檢查 RLS** - characters 表檢查一次，子表通過 JOIN 自動關聯
4. **減少 `auth.uid()` 調用** - 從 7 次減少到 1 次
5. **⚠️ 關鍵：正確處理 JOIN 返回的數據結構** - 見下方說明
4. **提取嵌套數據** - JOIN 結果會有嵌套陣列，需要展平處理

**性能對比：**
- 並行 7 個查詢：92.7 秒（每個 ~13 秒）
- 單一 JOIN 查詢：2.9 秒（**改善 97%**）

**識別此問題的特徵：**
- ⚠️ 並行查詢數量越多，總時間越長
- ⚠️ 每個子表查詢時間相似（都在執行類似的 RLS 檢查）
- ⚠️ 主表查詢很快，但子表查詢很慢
- ⚠️ 資料量很少但查詢很慢

**🔥 重要：JOIN 查詢的數據提取陷阱（必讀）**

Supabase JOIN 對不同關係類型返回不同的數據結構：

**一對一關係**（表中有 `UNIQUE(foreign_key)` 約束）：
```typescript
// ⚠️ 返回 object，不是 array！
character.character_ability_scores    // → {id: 1, strength: 10, ...}
character.character_current_stats     // → {id: 2, current_hp: 20, ...}
character.character_currency          // → {id: 3, gp: 100, ...}
```

**一對多關係**（表中無 `UNIQUE(foreign_key)` 約束）：
```typescript
// ✅ 返回 array
character.character_saving_throws      // → [{ability: 'str'}, {ability: 'dex'}]
character.character_skill_proficiencies // → [{skill_name: '運動'}, ...]
character.character_combat_actions     // → [{name: '攻擊'}, ...]
```

**正確的數據提取方式：**
```typescript
// ✅ 正確：同時處理 object 和 array
const abilityScores = character.character_ability_scores
  ? (Array.isArray(character.character_ability_scores)
      ? character.character_ability_scores[0]  // 如果是 array 取第一個
      : character.character_ability_scores)     // 如果是 object 直接用
  : null

// ❌ 錯誤：只檢查 Array.isArray() 會導致一對一關係數據丟失
const abilityScores = Array.isArray(character.character_ability_scores) && 
  character.character_ability_scores.length > 0
    ? character.character_ability_scores[0]
    : null  // 一對一關係會走到這裡，導致數據丟失！
```

**診斷技巧：**
```typescript
console.log('數據類型:', Array.isArray(data) ? 'array' : typeof data)
// 一對一：object
// 一對多：array
```

#### 問題四：Supabase 冷啟動問題（重要）
**使用 performance.now() 定位瓶頸：**
```typescript
const startTime = performance.now()
// ... 執行操作 ...
const duration = performance.now() - startTime
console.log(`⏱️ 操作耗時: ${duration.toFixed(1)}ms`)
```

**關鍵測量點：**
- 緩存檢查時間
- 身份驗證時間
- 資料庫查詢時間  
- 總體操作時間

**效能目標：**
- 緩存命中: < 1ms
- 身份驗證: < 200ms (已有上下文時應為 0ms)
- 資料庫查詢: < 500ms (簡單查詢)
- 總初始化: < 3s

#### 問題五：資料庫初始化卡住
**症狀：**
- 應用卡在 "初始化資料庫服務..." 階段
- 沒有錯誤訊息，無限等待

**根本原因：**
- 資料庫檢查查詢遇到冷啟動，但沒有超時保護
- 沒有重試機制，一次失敗就永久卡住

**解決方案 - 超時保護 + 重試：**
```typescript
// ✅ 正確做法：添加超時和重試
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => reject(new Error('資料庫連接超時')), 10000)
})

const checkPromise = supabase.from('characters').select('id').limit(1)
const { error } = await Promise.race([checkPromise, timeoutPromise])

// 如果失敗，自動重試
if (error && attempt < maxRetries) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  continue
}
```

**實施要點：**
1. **設定合理超時** - 10 秒足夠檢測連接問題
2. **自動重試** - 檢測冷啟動錯誤時重試 1-2 次
3. **延遲重試** - 等待 1 秒給伺服器時間啟動
4. **防止卡死** - 確保所有關鍵查詢都有超時保護

### 通用優化原則
1. **避免冗餘 API 調用** - 利用已有的狀態管理避免重複請求
2. **明確查詢需求** - 永遠指定需要的欄位，避免 `SELECT *`
3. **添加性能測量** - 使用 `performance.now()` 定位瓶頸
4. **上下文傳遞** - 從頂層傳遞已知信息，避免底層重複獲取
5. **查詢排序** - 添加 `ORDER BY` 幫助資料庫使用索引
6. **使用 JOIN 而非多次查詢** - 減少 RLS 檢查次數，單一查詢比多個並行查詢快得多

#### 問題四：Supabase 冷啟動問題
**症狀：**
- 第一次請求返回 520 錯誤或 CORS 錯誤
- 耗時極長（40-50 秒）然後失敗
- 第二次請求立即成功，正常速度（200-300ms）

**根本原因：**
- **Supabase 免費層專案會休眠** - 閒置一段時間後自動暫停
- 第一次請求觸發專案喚醒，但喚醒過程可能超時
- 常見錯誤：`520 Web Server Returned an Unknown Error`、CORS 錯誤、`Failed to fetch`

**解決方案 - 實施重試機制：**
```typescript
// ✅ 正確做法：檢測冷啟動錯誤並自動重試
const maxRetries = 2
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    if (attempt > 1) {
      console.log(`🔄 重試第 ${attempt} 次...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    const result = await supabase.from('table').select('*')
    
    if (result.error) {
      // 檢測值得重試的錯誤
      const errorMessage = result.error.message || ''
      if (errorMessage.includes('CORS') || errorMessage.includes('520') || 
          errorMessage.includes('502') || errorMessage.includes('503') ||
          errorMessage.includes('Failed to fetch')) {
        if (attempt < maxRetries) {
          continue // 重試
        }
      }
    }
    
    return result.data
  } catch (error) {
    if (attempt < maxRetries) continue
    throw error
  }
}
```

**實施要點：**
1. **自動重試** - 檢測到冷啟動錯誤（520, CORS, 502, 503）時自動重試 1-2 次
2. **延遲重試** - 第一次失敗後等待 1 秒再重試，給伺服器時間完成啟動
3. **錯誤分類** - 區分網路/伺服器錯誤（值得重試）vs 資料錯誤（不值得重試）
4. **用戶體驗** - 第一次失敗不驚慌，自動重試通常能成功

**識別冷啟動問題的特徵：**
- ⚠️ 首次請求失敗，後續請求成功
- ⚠️ 錯誤訊息包含 "CORS", "520", "502", "503", "Failed to fetch"
- ⚠️ 請求耗時異常長（30-50 秒）
- ⚠️ 無需修改代碼，重新載入頁面通常能解決

**預防措施（可選）：**
- 使用付費版 Supabase（專案不休眠）
- 實施定期 ping 機制保持專案活躍
- 向用戶展示友好的載入提示

---

### 通用優化原則（必須遵守）
1. **避免冗餘 API 調用** - 利用已有的狀態管理避免重複請求
2. **明確查詢需求** - 永遠指定需要的欄位，避免 `SELECT *`
3. **添加性能測量** - 使用 `performance.now()` 定位瓶頸
4. **上下文傳遞** - 從頂層傳遞已知信息，避免底層重複獲取
5. **查詢排序** - 添加 `ORDER BY` 幫助資料庫使用索引
6. **使用 JOIN 而非多次查詢** - 減少 RLS 檢查次數，單一查詢比多個並行查詢快得多
7. **實施重試機制** - 檢測網路/伺服器錯誤時自動重試
8. **超時保護** - 防止查詢永久卡住

### 優化檢查清單

**在實施資料載入功能時，必須檢查：**
- [ ] 是否避免了冗餘的身份驗證調用？
- [ ] 是否明確指定了查詢欄位（避免 `SELECT *`）？
- [ ] 是否使用 JOIN 而非多個獨立查詢？
- [ ] **是否正確處理 JOIN 返回的數據結構（一對一 = object，一對多 = array）？**
- [ ] 是否添加了性能測量日誌？
- [ ] 是否實施了重試機制處理冷啟動？
- [ ] 是否設定了合理的超時時間？
- [ ] 是否從上層傳遞了 userContext？

**Debug 性能問題時，必須測量：**
- [ ] 緩存檢查時間
- [ ] 身份驗證時間
- [ ] 每個資料庫查詢的時間
- [ ] 總體操作時間
- [ ] 是否存在重複調用？

## 更新記錄

- 2026-01-29: 完整記錄載入速度優化案例（53s→3s）包含 5 大問題及解決方案
- 2026-01-29: 添加優化檢查清單，確保未來開發遵循最佳實踐
- 2026-01-27: 移除 localStorage，改用完整 database 架構
- 2026-01-27: 添加 user_settings 表和物品管理系統
- 2026-01-27: 整合原 .assistant-notes.md 內容，加強工作流程規範