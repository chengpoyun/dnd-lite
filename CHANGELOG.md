# Changelog

本檔僅紀錄每個版本的**關鍵變更**，不包含實作細節。

---

## 1.7.2

- 修正：架構健檢發現 `CharacterSheet.tsx` 儲存兼職職業時（新增職業的 `addNewClass`、以及實際被 `CharacterInfoModal` 使用的 `saveInfoWithClasses`），`character_classes` 是「先刪除全部、再逐筆 insert」且完全不檢查錯誤，若中途失敗會讓角色卡在職業被刪光、只補回部分的半殘狀態。新增 `MulticlassService.replaceCharacterClasses` 統一處理：單次批次 insert 並檢查刪除/寫入的錯誤，失敗時不繼續、不更新本地狀態。
- 移除：`components/CharacterSelector.tsx`（架構健檢發現的死碼，全專案沒有任何地方引用，實際在用的是 `CharacterSelectPage.tsx`），以及 `CharacterSheet.tsx` 內 7 個從未被呼叫過的兼職編輯函式（`saveMulticlassInfo`、`updateExistingClassLevel`、`setExistingClassAsPrimary`、`deleteExistingClass`、`removeClassById`、`updateClassLevel`、`setPrimaryClass`）。
- 移除：`lib/supabase.ts` 對應 2026-02-02 物品系統重構前舊 schema 的 `CharacterItem` 型別（跟 `services/itemService.ts` 現行使用的同名型別撞名，容易誤 import），以及唯一使用它的 `DetailedCharacterService.addItem`/`updateItem`/`deleteItem`（全專案無呼叫的死碼）。
- 工具：`vitest.config.ts` 排除 `.claude/worktrees/**`，避免背景任務的獨立 worktree 程式碼被誤跑進本機測試結果。
- 重構：`utils/classUtils.ts` 的 `formatClassDisplay`/`formatClassDisplayLines` 抽出共用的 `sortClassesByPrimary`，取代兩處重複的排序邏輯，行為不變。
- 重構：架構健檢發現 `DowntimeModal`、`CurrencyModal` 各自手刻一份與 `NumberEditModal` 幾乎相同的 Modal/輸入框/預覽列版面。改為兩者皆改為包裝 `NumberEditModal`（新增 `decimal`、`inputLabel`、`showValuePreview`、`inputClassName`、`inputLabelClassName` 等可選 prop 支援客製樣式），外部呼叫介面不變，消除重複的 boilerplate。`ExpModal`、`RenownModal` 因需求差異較大暫不合併。
- 重構：`utils/helpers.ts` 的 `evaluateValue`/`evaluateDecimalValue` 抽出共用的 `tokenizeExpression`（消除逐字重複的運算式切 token 邏輯），`setNormalValue`/`handleDecimalInput`/`handleValueInput` 抽出共用的 `resolveEffectiveMin`；純內部重構，簽章與行為不變。
- 重構：架構健檢發現 `abilityService.ts`（`unlearnAbility`、`useAbility`、`updateAbilityMaxUses`、`updateCharacterAbility`）與 `spellService.ts`（`forgetSpell`、`togglePrepared`）共 7 處都逐字重複「用列 id，還是用 (characterId + 全域實體 id) 組合鍵定位資料列」的判斷邏輯。抽出共用的 `services/supabaseQueryHelpers.ts::byRowIdOrComposite`，7 處呼叫點皆改用它，行為不變。這 7 個函式原本完全沒有單元測試覆蓋，這次一併補上組合鍵分支的測試，並用瀏覽器對真實資料庫驗證「新增個人能力→使用→移除」流程正常。`itemService.ts` 沒有這個模式（物品只用單一 characterItemId 路徑），未受影響；三個 service 的整體 CRUD 樣板因欄位差異大，暫不做進一步的泛型抽象。
- 重構：架構健檢發現 `CombatView.tsx` 的 AC/先攻/速度/最大HP/攻擊命中/攻擊傷害/法術命中/法術DC 共 8 個戰鬥屬性編輯彈窗，各自內嵌重刻「從 basic+bonus 物件取出 bonus」（逐字重複 19 次）與「從 statBonusSources 撈出該屬性的加值明細」（重複 13 次），而非呼叫 `utils/characterAttributes.ts` 既有的邏輯。把 `getBonusValue` 改為 export，並新增 export 的 `getStatBonusSourcesBreakdown`，8 個屬性區塊全部改呼叫共用函式，行為不變。原本這些彈窗的加值顯示完全沒有測試覆蓋，這次補上單元測試與 CombatView 整合測試，並在瀏覽器對真實角色驗證 AC／攻擊命中彈窗顯示與儲存正確。
- 整理：架構健檢發現 `CategoryUsageModal`、`CharacterInfoModal`、`CombatItemEditModal`、`CombatNoteModal`、`RenownModal` 這 5 個 modal 的取消按鈕沒有用共用的 `<ModalButton variant="secondary">`，而是自己刻了一個原生 `<button>` 並整段複製貼上 `ModalButton` 元件內建的預設樣式。改為統一用 `<ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS}>`，跟其餘約 10 個 modal 對齊。已用 `getComputedStyle` 在瀏覽器比對過，改動前後取消按鈕的實際顯示顏色完全一致，純粹是移除死碼、不是外觀變更。

## 1.7.1

- 移除：`DetailedCharacterService.createDefaultCombatActions`（架構健檢發現的死碼）。此函式在建立角色時寫入 12 筆 `character_combat_actions`，但因未設定 `default_item_id` 且 `is_custom=false`，不符合 `CombatItemService.getCombatItems` 合併邏輯的任何分類，從未被戰鬥頁讀取或顯示，純粹是每次建角色都多寫的垃圾資料。
- 資料庫：新增 migration 清除過去累積的這批垃圾列（`is_default=true AND default_item_id IS NULL`，此條件只對應這個函式寫入的資料，不影響其他資料）。

## 1.7.0

- 新增：經驗值、修整期、名聲（使用/累計）、金幣皆改為支援小數與負數，小數位數不限、依使用者輸入原樣呈現。
- 資料庫：`characters.experience` 由 `INTEGER` 改為 `NUMERIC`、`character_currency.gp` 由 `NUMERIC(10,2)` 改為不限位數的 `NUMERIC`，避免小數輸入被裁切或寫入失敗；修整期與名聲原本就存於 JSONB，不需異動。
- 冒險紀錄的數值欄位維持自由文字，不受影響。

## 1.6.1

- 修正：角色頭部子職業名稱過長時爆版。根本原因是職業名稱那一行的 flex 項目缺少 `min-w-0` 導致 `truncate` 失效。改為單一職業時子職業另起一行、多職業時每個職業各自一行（並補上 `min-w-0`），不再擠在單行；總等級在多職業時單獨顯示一行。

## 1.6.0

- 新增：「筆記」分頁新增搜尋列（位於標題列與筆記列表之間），依標題與內容即時篩選（不分大小寫）；無筆記時不顯示搜尋列，搜尋不到結果時顯示「找不到符合的筆記」。

## 1.5.1

- 優化：「筆記」分頁編輯畫面的內容欄位改為撐滿剩餘畫面高度（依手機螢幕大小自動調整），取代原本固定 200px 高度、下方留有大片空白的版面。

## 1.5.0

- 新增：全施法者職業（吟遊詩人、牧師、德魯伊、術士、法師）的**法術位**依等級自動計算，顯示為戰鬥頁「職業資源」的 1~9 環卡片。多職施法者依官方規則合併施法者等級：全施法者等級直接加總、半施法者（聖騎士、遊俠）加總後除以2無條件捨去、奇械師除以2無條件進位、1/3施法者（戰士之奧術騎士、遊蕩者之奧術詭術師，須符合子職業）加總後除以3無條件捨去。
- 資料：`character_combat_actions` 新增 `max_uses_basic`／`max_uses_bonus`（沿用專案既有 basic+bonus=final 慣例），使用者手動調整上限（例如裝備額外給予的法術位）會以加值形式保留，之後升級只更新 basic，`max = basic + bonus` 不會蓋掉手動加值；`default_combat_actions` 新增 `spell_level` 標記 9 個新增的法術位範本列。尚未取得的環位（basic 為 0）不會顯示卡片。
- 修正：`CombatView` 的 `updateItemInDatabase`／`resetByRecovery` 原本以顯示用 id（預設關聯項目為 `default_item_id`）回頭比對資料庫列，導致消耗/編輯/重置這類項目時寫入被靜默略過（因動作/附贈動作/反應皆每回合重置而未被發現）；改為直接使用項目本地保存的資料庫列 ID（`item_id`，沿用刪除功能既有的正確作法），法術位等長休才重置的資源才能正確持久化。
- 測試：新增 `utils/spellSlots`（法術位表與多職合併規則）、`CombatItemService.syncSpellSlotResources`（建立/更新/保留加值）、`CombatView` 法術位整合（同步觸發、消耗與編輯上限的持久化）測試。

## 1.4.4

- 工具：移除舊版 DB 推送/查詢腳本（`db:migrate`、`db:status` 與其底層 `scripts/migrate-wrapper.sh`、`scripts/auto-migrate.sh`、`scripts/status-wrapper.sh`），統一改用 `npm run db:push`（`scripts/db-push.mjs`，內部走 `npx supabase`，免本機安裝 CLI）。查看遷移狀態改為文件中提供的手動指令（`npx supabase link` + `npx supabase migration list --linked`）。`.gitignore` 移除不再需要的 `supabase-cli` 條目；`create-migration.sh` 的完成提示改指向 `npm run db:push`。README、README-project、CLAUDE.md、docs/database-migration 同步更新。

## 1.4.3

- 文件：同步子職業與 `db:push` 相關說明。README 功能總覽補上子職業、指令表加入 `db:push`（推薦）；README-project、docs/database-migration（新增 `db:push` 段落與 `SUPABASE_ACCESS_TOKEN`／`SUPABASE_DB_PASSWORD` 環境變數）、docs/code-architecture（`ClassInfo.subclassName`、`SUBCLASSES_BY_CLASS`、3 等門檻、`character_classes.subclass_name`、`formatClassDisplay` 括號顯示）一併更新。

## 1.4.2

- 工具：新增跨平台 DB 推送指令 `npm run db:push`（`scripts/db-push.mjs`，Node 撰寫，Windows/macOS/Linux 皆可）。自 `.env` 讀取 `SUPABASE_ACCESS_TOKEN`、`SUPABASE_DB_PASSWORD` 與 project ref，透過 `npx supabase` 自動 link 並 push 未套用的 migration，取代僅限 Git Bash 的 `db:migrate`（`.sh`）。CLAUDE.md 同步更新指令說明。

## 1.4.1

- 調整：子職業僅在該職業達 **3 等（含）以上**才顯示可選下拉（1–2 等不顯示，符合 D&D 5E 於 3 等取得子職業）。多職時各職業依自身等級判定。新增 `canSelectSubclass` / `SUBCLASS_MIN_LEVEL`；儲存時會清除低於 3 等職業殘留的子職業。
- 測試：`canSelectSubclass`（1–2 等不可選、3 等以上可選、非數字視為不可選）。

## 1.4.0

- 新增：**子職業（subclass）**功能。`ClassInfo` 新增 `subclassName`（選填），並在 `types.ts` 新增 `SUBCLASSES_BY_CLASS` 常數（13 職業對應之子職業清單，如牧師→生命領域、戰士→冠軍等）。編輯角色資料時每個職業列多一個「子職業」下拉（依所選職業過濾，可選「未選擇子職業」；換職業時清空子職業）。角色標頭與 `formatClassDisplay` 以括號顯示子職業（如「LV 5 牧師（生命領域）」、多職「戰士（冠軍） Lv5 / 法師（塑能學派） Lv3」）；未選子職業時維持原顯示。
- 資料：新增 migration 為 `character_classes` 加上 `subclass_name TEXT`（可空）；讀寫（`multiclassService`、`appInit`、`saveInfoWithClasses`）皆對應 `subclass_name ↔ subclassName`。
- 測試：`formatClassDisplay` 子職業顯示、`getSubclassesForClass`、`SUBCLASSES_BY_CLASS` 完整性（涵蓋 13 職業、鍵值合法、子職業不重複）。
- 注意：此版本需在遠端 DB 執行 `ALTER TABLE character_classes ADD COLUMN IF NOT EXISTS subclass_name TEXT;`（本機無 Supabase access token／CLI，需於 Supabase SQL Editor 手動套用）後，子職業儲存才會生效。

## 1.3.1

- 文件：新增 `CLAUDE.md`（Claude Code 入口濃縮頁）：常用指令、陷阱（登入牆、migration 即推送、`scripts/` 為 `.sh`、等級/職業變更後 refetch 等）、架構速覽與慣例，並連結至現有 `docs/`；不重複既有文件內容。

## 1.3.0

- 新增：全域物品「食人魔力量手套」(Gauntlets of Ogre Power)。裝備（穿戴中）時，若「所有加值後的最終力量」低於 **19** 才補足至 19（最終已 ≥19 則無效）；不影響其他來源加的力量調整值／豁免。參考「健壯」的 specialEffect 機制，擴充特殊效果引擎：新增「屬性值下限（abilityScoreFloors）」概念，於彙總所有加值後才套用（新增 `ogrePower` 效果），並在能力／物品聚合都支援。
- 資料：新增 migration 種子該全域物品（`stat_bonuses.specialEffectId = 'ogrePower'`）。
- 測試：`ogrePower` 單元測試、屬性疊加測試（力量設 19 仍與其他調整值／豁免加值疊加）、`collectSourceBonusesForCharacter` 整合測試。

## 1.2.2

- 修正：學習特殊能力時，已學會的能力（如「健壯」）被整個濾掉而「搜尋不到」。改為仍顯示於搜尋結果，但標記「已學習」且不可點選（避免誤以為能力消失或重複學習）。
- 測試：新增 LearnAbilityModal 已學習能力顯示／不可點選的回歸測試。

## 1.2.1

- 修正：戰鬥頁刪除自訂項目（如「劍歌」）後，reload 仍會重新出現。原因為刪除時以「顯示用 id ＋ 前端類別字串」回查資料庫項目，但資料庫的 `bonus_action` 與前端的 `bonus` 不符（預設衍生項目的 id 也是 default_item_id），導致 bonus 類別項目找不到、未真正從資料庫刪除。改為直接以本地項目保存的資料庫列 ID（item_id）刪除；並讓新建項目即時記下資料庫列 ID，未 reload 前也能正確刪除。
- 測試：新增 CombatView 刪除 bonus_action 自訂項目的回歸測試。

## 1.2.0

- 移除「上傳到資料庫」與「新增到資料庫」功能：實際使用後確認共享全域庫的寫入流程是多餘的。拔除三類（法術／物品／能力）的個人項目上傳與直接新增到全域庫的入口、服務函式（`uploadCharacterXxxToGlobal`、`createSpell`/`updateSpell`、`createAbility`、`createGlobalItem`）與相關型別；刪除僅供上傳使用的 `SpellFormModal`、`GlobalItemFormModal`；`AbilityFormModal` 精簡為「編輯個人能力」專用。**保留**瀏覽／學習既有共享項目與個人項目的新增／編輯。
- 測試：移除三個 service 測試的上傳區塊（刪除 `item-service.test.ts`）、清理 `items-page.magic-filter` 對已刪元件的 mock。

## 1.1.15

- 修正：更新經驗值後，同一 session 未 reload 直接調整等級會導致經驗值被回溯。原因為角色基本資料存檔以陳舊的本地快照重建整列寫回 DB，覆蓋了剛存好的經驗值。改為各存檔只送變動欄位（partial update），並於存檔後同步本地角色快照；同類問題（戰鬥加值、頭像存檔挾帶整列）一併修正。
- 測試：新增 `utils/characterUpdate` 單元測試（驗證各 payload 只攜帶變動欄位、重現經驗值回溯情境）。

## 1.1.14

- 優化（4.1–4.3）：新增 `styles/common.ts` 單元測試（STYLES、combineStyles、conditionalStyle）；TEST-README 補上樣式測試覆蓋說明；code-architecture 明確說明 App 以 React.lazy 載入分頁並搭配 PageLoadingFallback。

## 1.1.13

- 優化：ConfirmDeleteModal、InfoModal 改用 `ModalButton` 與 modalStyles，統一 Modal 按鈕樣式；新增 `MODAL_BUTTON_DELETE_CONFIRM_CLASS`。
- 測試：新增 ConfirmDeleteModal 元件測試（標題、取消／確認行為、自訂文案與角色／項目情境）。

## 1.1.12

- 優化：detailedCharacter 改用 `AbilityDbKey` 型別，集中至 characterConstants。

## 1.1.11

- 修正文件：移除不存在的 `combatStyles`，改為 `STYLES`、`combineStyles`、`conditionalStyle`。

## 1.1.10

- 優化：抽出 `PageLoadingFallback` 元件，App.tsx 各 Suspense fallback 改為使用，統一載入樣式。

## 1.1.9

- 優化：按鈕語意統一，`modalStyles.BUTTON_PRIMARY_CLASS` 改為 amber（與 STYLES.button.primary、Modal 一致）。

## 1.1.8

- 優化：新增 `getCombatStatBonus(stats, key)`，App.tsx 儲存戰鬥屬性時改為使用，減少重複 basic/bonus 讀取。

## 1.1.7

- 優化：技能加值單一來源為 `extraData.skillBonuses`；`getFinalSkillBonus` 僅讀取該處，appInit 合併 character_skill_proficiencies.misc_bonus 進 extraData.skillBonuses，top-level `skillBonuses` 標為 deprecated。

## 1.1.6

- 優化：能力鍵對應集中至 `utils/characterConstants`（`ABILITY_STR_TO_FULL`、`ABILITY_FULL_TO_STR`），App、appInit、detailedCharacter 改為匯入使用。

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

