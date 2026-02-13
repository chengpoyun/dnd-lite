# 測試審閱：重複與不必要情形

**已於 2025-02 依建議完成調整，測試數由 358 → 355，全部通過。**

## 一、建議合併或刪除（已處理）

### 1. CharacterSheet.test.tsx

| 問題 | 說明 |
|------|------|
| **「應該正確傳遞保存函數作為 props」** | 只對 `expect(mockOnSaveXxx).toBeDefined()` 做斷言，驗的是測試裡的變數存在，沒有驗證 CharacterSheet 是否真的收到或使用這些 props。可刪除，或改為透過「觸發儲存行為並 assert 對應 callback 被呼叫」來驗證。 |
| **「當沒有保存函數時應該正常運作」與「應該正確處理 undefined 的保存函數」** | 兩則都是「缺少／undefined 的 callback 時仍能渲染不崩潰」，情境重疊。可合併為一則：例如「當部分或全部保存函數未傳入時應正常渲染不崩潰」。 |
| **「應該正確渲染角色基本信息」** | 僅 `expect(container).toBeInTheDocument()`，與後面「應該正確顯示角色名稱」「應該正確顯示職業和等級」「應該正確顯示冒險紀錄」重疊（後者已隱含有渲染）。可刪除此則，或與上述顯示類斷言合併成單一「應正確渲染並顯示名稱、職業等級與冒險紀錄」測試。 |

### 2. CombatView.bonusTable.test.tsx（可選）

- **「給定 proficiencies 和 savingProficiencies 為 undefined 時應不崩潰」** 與 **「給定 proficiencies 為 undefined 時應不崩潰」**  
- 都是邊界／防崩潰測試，情境類似（一個兩者都 undefined，一個只 proficiencies undefined）。  
- 可維持現狀（兩個情境都保留），或合併成一個用 `it.each` 跑兩種 stats 的單一測試，以減少重複 setup。

---

## 二、描述與斷言不一致（建議修正描述或加強斷言）

### stat-bonuses.display.test.tsx

- **「AbilityEditModal 應顯示來自 statBonusSources 的能力／豁免來源」**  
  - 實際只斷言 `getByText(/敏捷/)`，註解也寫「僅確保組件可以正常渲染」。  
  - 建議二擇一：  
    - 改描述為「AbilityEditModal 在傳入 statBonusSources 時能正常渲染（含敏捷標籤）」，或  
    - 加強斷言，真的驗證「來源」相關 UI（例如某個 statBonusSources 的 label 有被顯示）。

---

## 三、無重複／保留即可

- **CharacterSheet 三支檔案**：`CharacterSheet.test.tsx`（基本渲染與 props）、`CharacterSheet.modals.test.tsx`（各 modal 開啟與儲存）、`CharacterSheet.skill-modal.test.tsx`（技能詳情 modal）— 各自負責不同層面，無重複。  
- **SpellsPage**：「學習第一個法術」與「+ 學習新法術」兩則都是打開同一 LearnSpellModal，但對應不同入口與使用者行為，兩則都保留合理。  
- **ability-service / item-service / spell-service**：上傳邏輯（已有相同 name_en vs 新建）是同一業務模式在不同實體上的實作，各測各的服務，非重複。  
- **各 Modal 元件**：NumberEditModal、AbilityEditModal、SkillAdjustModal、CombatStatEditModal、CombatItemEditModal、ModalInput 等，每個測不同元件或不同行為，無重複。  
- **LearnItemModal / LearnAbilityModal**：皆有關鍵字 gating，但是不同元件，各保留。  
- **CombatView.* 多檔**：bonusTable、bonusNote、defaultItems、combatItemDescription 各測不同功能，無重複。  
- **characterAttributes.test.ts vs appInit.characterAttributes.test.ts**：前者測 `characterAttributes` 工具函數，後者測 app init 的 `buildCharacterStats`（basic+bonus 結構），模組與目的不同，無重複。

---

## 四、建議動作摘要

1. **CharacterSheet.test.tsx**：刪除或改寫「應該正確傳遞保存函數作為 props」；合併兩則「無/undefined 保存函數」為一則；刪除或合併「應該正確渲染角色基本信息」。  
2. **CombatView.bonusTable.test.tsx**（可選）：將兩則 undefined 不崩潰測試合併為 `it.each` 以減少重複。  
3. **stat-bonuses.display.test.tsx**：修正「AbilityEditModal 應顯示來自 statBonusSources…」的測試名稱或斷言，使描述與內容一致。

以上調整後，測試套件可減少輕微重複、避免誤導性描述，並維持現有覆蓋範圍。
