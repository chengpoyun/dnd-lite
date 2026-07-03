-- 遷移: 食人魔力量手套改用通用的 abilityScoreFloors 機制，取代原本硬編碼的 specialEffectId
-- 創建時間: 2026-07-03 17:06:44
--
-- 背景：原本「設為固定屬性值」類效果（如食人魔力量手套設力量為19）透過
-- utils/specialEffects.ts 的 specialEffectId 白名單機制硬編碼實作。
-- 現已改為通用機制：StatBonusEditor 支援在屬性值欄位輸入 "=19" 語法，
-- 寫入 stat_bonuses.abilityScoreFloors，聚合邏輯（collectSourceBonusesForCharacter）
-- 不論來源是否為特殊效果都會讀取此欄位並套用「下限」規則。
-- ogrepower 已從 specialEffectId 註冊表移除，故需將現有資料改為新格式，
-- 否則會變成沒有任何效果。
--
-- 只有一筆資料受影響：global_items 裡的「食人魔力量手套」範本
-- （id=85d71a83-5e7f-4928-a8f9-3b409422c6ae）。角色 AAA 裝備此物品但沒有
-- character_items 層級的覆寫，效果完全繼承自這筆範本資料，改完後會自動生效。

UPDATE global_items
SET stat_bonuses = '{"abilityScoreFloors": {"str": 19}}'::jsonb
WHERE id = '85d71a83-5e7f-4928-a8f9-3b409422c6ae'
  AND stat_bonuses = '{"specialEffectId": "ogrePower"}'::jsonb;
