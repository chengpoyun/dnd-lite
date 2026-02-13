# 專案程式架構（Code Architecture）

> 本文件說明**系統如何設計與運作**：資料流、UI 分層、Modal 與樣式慣例、服務層職責、戰鬥屬性 basic/bonus 與 DB 對應。適合在動手改 UI 或資料邏輯時查閱。若你想先掌握「如何在專案裡工作」與目錄總覽，請看 [README-project.md](../README-project.md)。

---

## 設計原則

1. **手機優先**：UI 以手機版為主要設計目標，文字與點擊區域以易讀、易點為準。
2. **共用優先**：能共用的元件與樣式盡量共用；新元件與樣式以「後續可被其他場景複用」為原則。

### 名詞對照（避免與「怪物頁」混淆）

| 用語 | 元件／分頁 | 說明 |
|------|------------|------|
| **戰鬥檢視／戰鬥頁** | `CombatView` | 角色卡內分頁，顯示 HP、先攻、戰鬥動作、加值表等。 |
| **怪物頁** | `MonstersPage` | 獨立分頁，用於開始／加入戰鬥與怪物追蹤（非角色卡內）。 |

---

## 1. 目錄與職責（精簡對照）

| 路徑 | 職責 |
|------|------|
| `App.tsx` | 中央狀態、Tab 路由、`stats` / `setStats`、`onSaveXxx` 回調 |
| `components/` | 頁面與 Modal；`ui/` 下為共用 UI（Modal、FilterBar、FinalTotalRow 等） |
| `services/` | 資料存取：`hybridDataManager`、`detailedCharacter` 等 |
| `utils/` | `characterConstants`、`appInit`（組裝 CharacterStats）、`characterAttributes`（basic+bonus 計算） |
| `styles/` | `modalStyles.ts`、`common.ts`（STYLES、combatStyles、combineStyles） |
| `types.ts` | `CharacterStats`、`CustomRecord`、`ClassInfo` 等前端型別 |
| `lib/supabase.ts` | Supabase 客戶端與 DB 型別（如 `CharacterCurrentStats`） |
| `src/test/` | Vitest 測試 |
| `hooks/` | `useAppInitialization`、`useToast` |
| `contexts/` | `AuthContext.tsx` |

---

## 2. 資料流

- **角色資料**：`stats`（`CharacterStats`）為單一來源，由 `App.tsx` 持有並透過 `setStats` 更新。
- **儲存**：各頁面收到 `onSaveXxx`，呼叫 Service 寫入 Supabase，成功後再以 `buildCharacterStats`（`utils/appInit.ts`）組裝並呼叫 `setStats` 更新本地。
- **載入**：`buildCharacterStats` 從 DB（經 `getFullCharacter` 等）組裝出 `CharacterStats`。

```mermaid
flowchart TD
  App[App.tsx]
  Stats[stats / setStats]
  Page[Page 元件]
  Service[DetailedCharacterService / HybridDataManager]
  DB[(Supabase)]
  App --> Stats
  Stats --> Page
  Page -->|onSaveXxx| Service
  Service --> DB
  DB -->|buildCharacterStats| Stats
```

---

## 3. 元件慣例

### 共用優先

能複用既有元件就複用；新元件設計時考慮通用性，供後續場景共用。

### Modal

- 使用 [components/ui/Modal.tsx](../components/ui/Modal.tsx)（`Modal`、`ModalButton`、`ModalInput`）。
- 內容包在 [MODAL_CONTAINER_CLASS](../styles/modalStyles.ts) 內。
- Props：`isOpen`、`onClose`、資料與 `onSave` / `onDelete` 等回調。
- 獨立檔案命名：`XxxModal.tsx`（如 CombatNoteModal、ItemDetailModal）。
- **加值來源列表**：NumberEditModal、CombatStatEditModal、CombatHPModal 等可傳 `bonusSources`（`{ label, value }[]`），顯示「加值來源」標題與列表（正負值顏色區分），總計使用 [FinalTotalRow](../components/ui/FinalTotalRow.tsx)。
- **影響角色數值**：[StatBonusEditor](../components/StatBonusEditor.tsx) 用於能力/物品的「影響角色數值」編輯；在 CharacterItemEditModal、GlobalItemFormModal、AbilityFormModal 中此區塊位於「描述」下方；上傳時會帶入 `affects_stats` / `stat_bonuses` 並寫入 DB。
- 戰鬥相關彈窗：CombatHPModal、CombatItemEditModal、CategoryUsageModal、RestOptionsModal、ShortRestDetailModal、LongRestConfirmModal、EndCombatConfirmModal 等。

### Page 元件

- 接收 `stats`、`setStats`、`characterId`、`onSaveXxx`（視需要）。
- 可使用 lazy 載入。

---

## 4. 樣式慣例

- **手機優先**：字體大小、點擊區域、間距以手機閱讀為準。
- [styles/modalStyles.ts](../styles/modalStyles.ts)：`MODAL_CONTAINER_CLASS`、`INPUT_FULL_WIDTH_CLASS`、`BUTTON_PRIMARY_CLASS` 等。
- [styles/common.ts](../styles/common.ts)：`STYLES`、`combineStyles`、`conditionalStyle`。
- Tailwind：深色主題（slate-900/950）、amber 強調色、響應式 `sm:`。
- 新樣式盡量放到共用檔，命名具語意、可複用。

---

## 5. 常數與型別

- [utils/characterConstants.ts](../utils/characterConstants.ts)：`STAT_LABELS`、`SKILLS_MAP`、`ABILITY_KEYS`（與 CharacterSheet、CombatView 共用）。
- `types.ts`：`CharacterStats`、`CustomRecord`、`ClassInfo` 等。
- `lib/supabase.ts`：DB 對應型別（`CharacterCurrentStats` 含 `combat_notes` 等）。

### 5.1 屬性 basic + bonus 規則

- **basic + bonus = final**：戰鬥屬性（AC、先攻、速度、HP max、攻擊命中、攻擊傷害、法術命中、法術 DC）皆採此結構。
- **basic 可編輯**：使用者可直接編輯 basic。
- **bonus 來源**：bonus 由 (1) 能力/物品的 `stat_bonuses` 聚合（經 `extra_data.statBonusSources` 與各 combat/技能/豁免加總）、(2) DB 的 misc bonus 欄位（可編輯的「其他加值」）組成；各 Modal 會顯示「加值來源」列表。
- 取得 final 值請使用 [utils/characterAttributes.ts](../utils/characterAttributes.ts)：
  - `getFinalCombatStat(stats, key)`：AC、先攻、速度、maxHp、attackHit、attackDamage、spellHit、spellDc（已含 statBonusSources 加總）
  - `getBasicCombatStat(stats, key)`：取得 basic（供編輯用）
  - `getFinalAbilityScore` / `getFinalAbilityModifier`：6 屬性值／調整值（含 extra_data.abilityBonuses、modifierBonuses）
  - `getFinalSavingThrow(stats, abilityKey)`：6 豁免（含 statBonusSources.savingThrows）
  - `getFinalSkillBonus(stats, skillName)`：18 技能（含 extra_data.skillBonuses 與 statBonusSources）

### 5.2 DB 欄位與 CharacterStats 對應

| CharacterStats key | DB 欄位（character_current_stats） |
|--------------------|-------------------------------------|
| ac                 | ac_basic, ac_bonus                  |
| initiative         | initiative_basic, initiative_bonus |
| speed              | speed_basic, speed_bonus           |
| maxHp              | max_hp_basic, max_hp_bonus         |
| attackHit          | attack_hit_basic, attack_hit_bonus |
| attackDamage       | attack_damage_basic, attack_damage_bonus |
| spellHit           | spell_hit_basic, spell_hit_bonus   |
| spellDc            | spell_dc_basic, spell_dc_bonus     |
| skillBonuses       | character_skill_proficiencies.misc_bonus |
| saveBonuses        | character_saving_throws.misc_bonus |

- **extra_data（JSONB）**：由 [detailedCharacter.getFullCharacter](../services/detailedCharacter.ts) 聚合寫入，包含 `abilityBonuses`、`modifierBonuses`、`skillBonuses`、`statBonusSources` 等，供 Modal「加值來源」與最終值計算使用。
- **能力/物品數值加值**：`abilities`、`global_items` 與 `character_abilities`、`character_items` 皆有 `affects_stats`、`stat_bonuses`（JSONB）；角色層未覆寫時以 ability/item 為準，上傳時寫入 DB。

---

## 6. 服務層

- **HybridDataManager**（[services/hybridDataManager.ts](../services/hybridDataManager.ts)）：統一角色資料存取介面。
- **DetailedCharacterService**（[services/detailedCharacter.ts](../services/detailedCharacter.ts)）：角色 CRUD、`updateCurrentStats`、`updateExtraData`；`getFullCharacter` 會聚合能力/物品的 `affects_stats`、`stat_bonuses` 並寫入 `extra_data`，供 [buildCharacterStats](../utils/appInit.ts) 組裝 CharacterStats。
- DB 欄位：`character_current_stats`（含 `combat_notes`）、`extra_data`（JSONB）；能力/物品的 `affects_stats`、`stat_bonuses` 見 5.2。

---

## 7. 資料庫遷移

- 若有需要更新 DB，建立 migration 後**立即**執行推送。
- 參考 [database-migration.md](database-migration.md)：`npm run db:create "描述"` 建立、`npm run db:migrate` 推送到遠端 DB。
- 重要：只要有新增 migration，必須立即推送到遠端 DB。

---

## 8. 測試慣例

- 檔名：`Xxx.test.ts` 或 `Xxx.feature.test.tsx`，置於 `src/test/`。
- Mock：如 `vi.mock('../../services/hybridDataManager')`、localStorage。
- 參考 [ai-workflow.md](ai-workflow.md)：先寫測試、再實作。

---

## 9. 程式風格

- 命名：camelCase（變數、函式）、PascalCase（元件、型別）。
- UI 文案：繁體中文。
- 註解：檔案頂部用途、複雜邏輯說明。
