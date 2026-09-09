/**
 * generalItemCatalog - 讀取 data/general-items.json、依關鍵字搜尋、轉成新增物品用的 payload
 */
import { describe, it, expect } from 'vitest';
import {
  getGeneralItems,
  searchGeneralItems,
  generalItemToCreateData,
} from '../../services/generalItemCatalog';
import type { GeneralItemDef } from '../../types/generalItem';

describe('generalItemCatalog', () => {
  it('getGeneralItems 讀得到 data/general-items.json 的內容（陣列、有資料）', async () => {
    const list = await getGeneralItems();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('name');
    expect(list[0]).toHaveProperty('category');
  });

  it('searchGeneralItems 依名稱／英文名／描述關鍵字篩選，不分大小寫', async () => {
    const list = await getGeneralItems();
    const target = list[0];
    const result = await searchGeneralItems(target.name);
    expect(result.some((i) => i.name === target.name)).toBe(true);
  });

  it('searchGeneralItems 查詢字串為空時回傳全部', async () => {
    const all = await getGeneralItems();
    const result = await searchGeneralItems('');
    expect(result.length).toBe(all.length);
  });

  describe('generalItemToCreateData', () => {
    it('基本欄位轉換正確', () => {
      const entry: GeneralItemDef = {
        name: '強效治療藥水',
        category: '藥水',
        rarity: null,
        description: '回復生命值',
        isMagic: true,
      };
      const data = generalItemToCreateData(entry);
      expect(data).toMatchObject({
        name: '強效治療藥水',
        category: '藥水',
        description: '回復生命值',
        is_magic: true,
      });
    });

    it('有數值加成的裝備，statBonuses 與 equipmentKind 會帶入 payload', () => {
      const entry: GeneralItemDef = {
        name: '食人魔力量手套',
        category: '裝備',
        rarity: null,
        isMagic: true,
        affectsStats: true,
        equipmentKind: 'hands',
        statBonuses: { abilityScoreFloors: { str: 19 } },
      };
      const data = generalItemToCreateData(entry);
      expect(data.affects_stats).toBe(true);
      expect(data.equipment_kind_override).toBe('hands');
      expect(data.stat_bonuses).toEqual({ abilityScoreFloors: { str: 19 } });
    });

    it('nameEn／rarity 會原樣帶入 payload', () => {
      const entry: GeneralItemDef = {
        name: '強效治療藥水',
        category: '藥水',
        rarity: '非常見',
        nameEn: 'Potion of Superior Healing',
        isMagic: true,
      };
      const data = generalItemToCreateData(entry);
      expect(data.name_en).toBe('Potion of Superior Healing');
      expect(data.rarity).toBe('非常見');
    });

    it('沒有 rarity 時，payload 的 rarity 為 null', () => {
      const entry: GeneralItemDef = {
        name: '強效治療藥水',
        category: '藥水',
        rarity: null,
        isMagic: true,
      };
      const data = generalItemToCreateData(entry);
      expect(data.rarity).toBeNull();
    });
  });
});
