# 怪物追蹤系統 - 抗性管理功能更新

## 📋 功能概要

本次更新為怪物追蹤頁面新增了完整的抗性管理系統，符合 D&D 5E 規則，包含以下 5 大核心功能：

1. **抗性資料儲存** - 怪物的屬性（名稱、抗性）儲存在資料庫
2. **批次新增怪物** - 彈窗介面可一次新增多隻同類怪物
3. **自動傷害計算** - 輸入原始傷害，系統自動套用抗性/易傷/免疫規則
4. **0 傷害顯示** - 被免疫的 0 傷害也會顯示在傷害記錄中
5. **戰鬥結束檢測** - 當其他玩家結束戰鬥時，自動彈出通知

---

## 🗃️ 資料庫變更

### Migration: `20260201000006_add_monster_attributes.sql`

```sql
-- 新增欄位
ALTER TABLE combat_monsters 
  ADD COLUMN name VARCHAR(100) DEFAULT '怪物' NOT NULL,
  ADD COLUMN resistances JSONB DEFAULT '{}' NOT NULL;

-- 效能優化索引
CREATE INDEX idx_combat_monsters_resistances ON combat_monsters USING GIN (resistances);

-- 約束條件
ALTER TABLE combat_monsters 
  ADD CONSTRAINT check_name_length CHECK (char_length(name) BETWEEN 1 AND 100);
```

**JSONB 格式範例：**
```json
{
  "fire": "vulnerable",
  "slashing": "resistant",
  "cold": "immune"
}
```

**預設行為：** 
- 只儲存非 `normal` 的抗性
- 空物件 `{}` 表示全部為普通抗性

---

## 💻 程式碼變更

### 1. TypeScript 介面更新

**檔案：** `lib/supabase.ts`

```typescript
export interface CombatMonster {
  id: string;
  session_code: string;
  monster_number: number;
  name: string;                                    // ✅ 新增
  ac_min: number;
  ac_max: number | null;
  resistances: Record<string, ResistanceType>;    // ✅ 新增
  created_at: string;
}

export type ResistanceType = 'normal' | 'resistant' | 'vulnerable' | 'immune';
```

---

### 2. 傷害計算工具函數

**檔案：** `utils/damageTypes.ts`

```typescript
export function calculateActualDamage(
  originalDamage: number, 
  resistanceType: ResistanceType
): number {
  switch (resistanceType) {
    case 'resistant':
      return Math.floor(originalDamage / 2);  // 向下取整
    case 'vulnerable':
      return originalDamage * 2;
    case 'immune':
      return 0;
    case 'normal':
    default:
      return originalDamage;
  }
}
```

**D&D 5E 規則對照：**
- **抗性 (Resistant)**: 傷害減半，向下取整（15 → 7, 11 → 5）
- **易傷 (Vulnerable)**: 傷害加倍（20 → 40）
- **免疫 (Immune)**: 傷害歸零（任何數值 → 0）
- **普通 (Normal)**: 原始傷害

---

### 3. 新增組件

#### 📝 AddMonsterModal (245 行)

**功能：**
- 輸入怪物名稱（預設「怪物」）
- 設定新增數量（無上限）
- 選擇 AC 模式（已知/未知）
- 摺疊式抗性設定（13 種傷害類型）

**關鍵程式碼：**
```typescript
// 只儲存非 normal 的抗性
const resistancesToSave = Object.entries(resistances)
  .filter(([_, resistance]) => resistance !== 'normal')
  .reduce((acc, [type, resistance]) => ({ ...acc, [type]: resistance }), {});

onConfirm(name, count, knownAC, resistancesToSave);
```

**UI 特色：**
- 摺疊/展開抗性設定
- 每個傷害類型獨立下拉選單
- 載入中覆蓋畫面

---

#### 💥 AddDamageModal (重寫，336 行)

**重大變更：**
- `DamageEntry.value` → `originalValue`（儲存原始傷害）
- 新增 `monsterResistances` prop
- 自動套用已知抗性
- 即時計算預覽
- 發現新抗性時更新資料庫

**關鍵邏輯：**
```typescript
// 自動套用已知抗性
useEffect(() => {
  entries.forEach((entry, index) => {
    if (entry.damageType && monsterResistances[entry.damageType]) {
      const knownResistance = monsterResistances[entry.damageType];
      if (entry.resistanceType !== knownResistance) {
        updateEntry(index, 'resistanceType', knownResistance);
      }
    }
  });
}, [entries, monsterResistances]);

// 即時計算預覽
const calculatedEntries = useMemo(() => {
  return entries.map(entry => ({
    ...entry,
    actualDamage: calculateActualDamage(entry.originalValue, entry.resistanceType)
  }));
}, [entries]);
```

**UI 顯示：**
```
🔥 火焰傷害
原始傷害: [20] → 實際: 40 (易傷↑)

總計: 原始 45 → 實際 57
```

---

#### 🛡️ MonsterCard (增強)

**新增顯示區塊：**

1. **怪物名稱**
   ```tsx
   <div className="flex items-center gap-2">
     <span className="text-xl">👹 {name} #{monster_number}</span>
   </div>
   ```

2. **已知抗性區塊**
   ```tsx
   {Object.keys(resistances).length > 0 && (
     <div className="text-sm">
       <div className="font-semibold mb-1">🛡️ 已知抗性</div>
       <div className="flex flex-wrap gap-2">
         {Object.entries(resistances).map(([type, resistance]) => (
           <span className={`px-2 py-1 rounded ${RESISTANCE_COLORS[resistance]}`}>
             {DAMAGE_TYPE_ICONS[type]} {DAMAGE_TYPE_LABELS[type]} {RESISTANCE_ICONS[resistance]}
           </span>
         ))}
       </div>
     </div>
   )}
   ```

3. **0 傷害記錄特殊樣式**
   ```tsx
   <div className={`
     ${log.damage_value === 0 ? 'opacity-60 line-through text-slate-500' : ''}
   `}>
     {log.damage_value} {DAMAGE_TYPE_LABELS[log.damage_type]}
     {log.damage_value === 0 && ' (已免疫)'}
   </div>
   ```

---

#### ⚔️ CombatEndedModal (47 行)

**簡單通知 Modal：**
```typescript
interface CombatEndedModalProps {
  isOpen: boolean;
  onClose: (viewFinal: boolean) => void;
}

// 兩個按鈕：
// 1. 查看最終狀態 (viewFinal = true)
// 2. 返回首頁 (viewFinal = false)
```

---

### 4. 服務層更新

**檔案：** `services/combatService.ts`

#### 新增方法：

##### `addMonsters()` - 批次新增
```typescript
static async addMonsters(
  sessionCode: string,
  name: string,
  count: number,
  knownAC: number | null,
  resistances: Record<string, ResistanceType>
): Promise<{
  success: boolean;
  monsters?: CombatMonster[];
  error?: string;
}>
```

**實作邏輯：**
```typescript
// 生成多筆怪物資料
const monsters = Array.from({ length: count }, () => ({
  session_code: sessionCode,
  name,
  ac_min: knownAC || 0,
  ac_max: knownAC,
  resistances
}));

// 批次插入
const { data, error } = await supabase
  .from('combat_monsters')
  .insert(monsters)
  .select();
```

##### `updateMonsterResistances()` - 合併抗性
```typescript
static async updateMonsterResistances(
  monsterId: string,
  newResistances: Record<string, ResistanceType>
): Promise<{ success: boolean; error?: string }>
```

**合併邏輯：**
```typescript
// 1. 取得目前抗性
const { data: monster } = await supabase
  .from('combat_monsters')
  .select('resistances')
  .eq('id', monsterId)
  .single();

// 2. 合併新抗性（新值覆蓋舊值）
const merged = { ...monster.resistances, ...newResistances };

// 3. 更新資料庫
await supabase
  .from('combat_monsters')
  .update({ resistances: merged })
  .eq('id', monsterId);
```

##### `checkVersionConflict()` - 增強版本檢查
```typescript
// 新增回傳 isActive 欄位
Promise<{ 
  hasConflict: boolean; 
  latestTimestamp?: string;
  isActive?: boolean;  // ✅ 新增
}>
```

---

### 5. MonstersPage 整合

**新增 State：**
```typescript
const [addMonsterModalOpen, setAddMonsterModalOpen] = useState(false);
const [combatEndedModalOpen, setCombatEndedModalOpen] = useState(false);
```

**新增 Handler：**
```typescript
// 批次新增怪物
const handleAddMonsters = async (
  name: string, 
  count: number, 
  knownAC: number | null, 
  resistances: Record<string, ResistanceType>
) => {
  if (await checkConflict()) return;
  
  const result = await CombatService.addMonsters(
    sessionCode, name, count, knownAC, resistances
  );
  
  if (result.success) {
    showSuccess(`已新增 ${count} 隻 ${name}`);
    await refreshCombatData();
    setAddMonsterModalOpen(false);
  }
};

// 處理戰鬥結束
const handleCombatEnded = (viewFinal: boolean) => {
  if (viewFinal) {
    setCombatEndedModalOpen(false);
  } else {
    setSessionCode('');
    setMonsters([]);
    setCombatEndedModalOpen(false);
  }
};
```

**戰鬥結束檢測：**
```typescript
// refreshCombatData 中檢查
if (!result.session.is_active) {
  setCombatEndedModalOpen(true);
  return;
}

// checkConflict 中檢查
if (result.isActive === false) {
  setCombatEndedModalOpen(true);
  return true;
}
```

**UI 變更：**
```tsx
{/* 舊版：直接呼叫 handleAddMonster() */}
<button onClick={() => handleAddMonster()}>➕</button>

{/* 新版：開啟 Modal */}
<button onClick={() => setAddMonsterModalOpen(true)}>➕</button>

{/* 新增 Modals */}
<AddMonsterModal
  isOpen={addMonsterModalOpen}
  onClose={() => setAddMonsterModalOpen(false)}
  onConfirm={handleAddMonsters}
/>

<AddDamageModal
  monsterResistances={monsters.find(m => m.id === selectedMonsterId)?.resistances || {}}
  {/* ...其他 props */}
/>

<CombatEndedModal
  isOpen={combatEndedModalOpen}
  onClose={handleCombatEnded}
/>
```

---

## 🧪 單元測試

### 測試檔案：`src/test/resistance-system.test.ts` (21 個測試)

**測試涵蓋範圍：**

1. **傷害計算** (6 測試)
   - ✅ 普通傷害原值
   - ✅ 抗性向下取整 (15 → 7, 11 → 5)
   - ✅ 易傷加倍
   - ✅ 免疫歸零
   - ✅ 大數值邊界測試 (999)
   - ✅ 零值處理

2. **抗性類型驗證** (2 測試)
   - ✅ 所有有效類型能正確計算
   - ✅ 計算結果符合預期

3. **複合傷害場景** (2 測試)
   - ✅ 多種抗性混合計算 (火40 + 穿刺7 + 酸10 + 冰0 = 57)
   - ✅ 識別 0 傷害來源（免疫 vs 抗性）

4. **抗性儲存邏輯** (2 測試)
   - ✅ 只儲存非 normal 值
   - ✅ 全 normal 時儲存空物件

5. **抗性合併邏輯** (3 測試)
   - ✅ 合併新發現抗性
   - ✅ 新值覆蓋舊值
   - ✅ 空物件不影響現有資料

6. **批次新增怪物** (3 測試)
   - ✅ 正確數量生成
   - ✅ 未知 AC 為 null
   - ✅ 共用抗性設定

7. **0 傷害顯示** (3 測試)
   - ✅ 免疫導致 0 傷害
   - ✅ 抗性導致 0 傷害
   - ✅ 原始 0 傷害

**測試結果：**
```
✅ 21 tests passed
✅ 完整系統測試 235 tests passed
```

---

## 📊 效能優化

### 資料庫層級
- **GIN 索引** - `resistances` JSONB 欄位加速查詢
- **批次插入** - 一次新增多隻怪物使用單一 INSERT

### 前端層級
- **useMemo** - 傷害計算結果快取
- **useEffect** - 自動套用已知抗性避免重複計算
- **條件渲染** - 只在有抗性時顯示區塊

---

## 🎯 使用流程

### 流程一：批次新增怪物

1. **點擊「➕」按鈕** → 開啟 AddMonsterModal
2. **填寫資訊：**
   - 名稱：哥布林
   - 數量：5
   - AC：15（已知）
   - 抗性：火焰 - 易傷
3. **確認** → 一次新增 5 隻哥布林，全部易傷火焰
4. **畫面顯示：**
   ```
   👹 哥布林 #1    [AC: 15]
   🛡️ 已知抗性: 🔥 火焰 ↑↑
   
   👹 哥布林 #2    [AC: 15]
   🛡️ 已知抗性: 🔥 火焰 ↑↑
   ...
   ```

---

### 流程二：輸入傷害與抗性發現

1. **點擊「💥」按鈕** → 開啟 AddDamageModal
2. **輸入原始傷害：**
   - 類型：火焰
   - 原始：20
   - **系統自動套用易傷** → 實際：40 (易傷↑)
3. **再輸入未知傷害：**
   - 類型：穿刺
   - 原始：15
   - 手動選擇：抗性
   - **即時顯示** → 實際：7 (抗性↓)
4. **送出** → 
   - 記錄 2 筆傷害
   - **自動更新怪物抗性** - 新增「穿刺：抗性」
5. **下次對此怪物輸入穿刺傷害時，自動套用抗性**

---

### 流程三：查看傷害記錄

**怪物卡片顯示：**
```
👹 冰霜巨人 #3    [AC: 15]
🛡️ 已知抗性: 🔥 火焰 ↑↑  ❄️ 冰冷 🛡️

傷害記錄：
✅ 20 火焰 (原始 10) - 18:30:15      [易傷↑]
✅ 10 穿刺 (原始 10) - 18:30:15      [普通]
❌ 0 冰冷 (原始 15) - 18:30:20 (已免疫)  [免疫顯示]
✅ 15 鈍擊 (原始 15) - 18:31:05      [普通]
```

**特色：**
- 免疫的 0 傷害也顯示（半透明 + 刪除線）
- 同一時間的複合傷害自動分組
- 括號顯示原始傷害值

---

## 🔄 向後相容性

### 保留舊功能
- ✅ `addMonster()` 保留為 wrapper - `addMonsters('怪物', 1, null, {})`
- ✅ 未設定抗性的怪物預設為空物件 `{}`
- ✅ 舊的單一怪物新增流程仍可用（開始戰鬥時自動新增第一隻）

### 資料庫預設值
```sql
name VARCHAR(100) DEFAULT '怪物' NOT NULL
resistances JSONB DEFAULT '{}' NOT NULL
```

---

## 🐛 已知問題與注意事項

### TypeScript 注意事項
- `Object.entries(resistances)` 需要明確型別標註：
  ```typescript
  Object.entries(resistances).map(([type, resistance]: [string, ResistanceType]) => ...)
  ```

### 備份檔案
- `components/AddDamageModal.tsx.backup` - 保留原始版本以供參考

### 測試覆蓋率
- ✅ 單元測試 - calculateActualDamage, 抗性邏輯, 批次新增
- ⚠️ 整合測試 - 需手動測試完整流程（新增 → 輸入傷害 → 抗性更新）
- ⚠️ E2E 測試 - 待未來實施

---

## 📦 檔案清單

### 新增檔案
```
supabase/migrations/20260201000006_add_monster_attributes.sql
components/AddMonsterModal.tsx                (245 行)
components/CombatEndedModal.tsx               (47 行)
src/test/resistance-system.test.ts            (21 測試)
docs/MONSTER_RESISTANCE_UPDATE.md             (本文檔)
```

### 修改檔案
```
lib/supabase.ts                               (新增 name, resistances 欄位)
utils/damageTypes.ts                          (新增 calculateActualDamage)
components/AddDamageModal.tsx                 (重寫 336 行)
components/MonsterCard.tsx                    (增強顯示)
components/MonstersPage.tsx                   (整合新 Modals)
services/combatService.ts                     (新增 3 個方法)
```

### 備份檔案
```
components/AddDamageModal.tsx.backup          (重寫前的原始版本)
```

---

## ✅ 完成檢查清單

- [x] 資料庫 migration 建立並推送
- [x] TypeScript 介面更新
- [x] calculateActualDamage 工具函數實作
- [x] AddMonsterModal 組件建立
- [x] AddDamageModal 重寫
- [x] MonsterCard 增強
- [x] CombatEndedModal 建立
- [x] CombatService 方法新增
- [x] MonstersPage 整合
- [x] 單元測試撰寫 (21 測試)
- [x] 所有測試通過 (235 tests)
- [x] TypeScript 編譯無錯誤
- [x] 文檔撰寫完成

---

## 🚀 部署注意事項

### 資料庫 Migration
```bash
# Migration 已推送到遠端 Supabase
cd /home/barry/dnd-lite
export $(cat .env | grep SUPABASE_ACCESS_TOKEN | xargs)
supabase db push
```

### 驗證步驟
1. ✅ 檢查資料庫欄位存在：`name`, `resistances`
2. ✅ 檢查索引建立：`idx_combat_monsters_resistances`
3. ✅ 測試批次新增怪物
4. ✅ 測試傷害計算與抗性自動套用
5. ✅ 測試戰鬥結束檢測

---

## 📚 相關文檔

- [D&D 5e Tools - 官方規則參考](https://5e.tools/)
- [專案 Copilot 指南](../.github/copilot-instructions.md)
- [測試文檔](../src/test/TEST-README.md)
- [資料庫遷移指南](./database-migration.md)

---

**更新日期：** 2026-02-01  
**版本：** v1.0.0  
**測試狀態：** ✅ 235/235 tests passed  
**編譯狀態：** ✅ No TypeScript errors
