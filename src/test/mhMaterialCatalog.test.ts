/**
 * mhMaterialCatalog - 讀取 data/mh-materials.json、依名稱查找、依關鍵字搜尋、轉成新增物品用的 payload
 */
import { describe, it, expect } from 'vitest';
import {
  getMHMaterials,
  findMHMaterialByName,
  searchMHMaterials,
  mhMaterialToCreateData,
  resolveGatheredMaterialCreateData,
} from '../../services/mhMaterialCatalog';
import type { MHMaterialDef } from '../../types/mhMaterial';

describe('mhMaterialCatalog', () => {
  it('getMHMaterials 讀得到 data/mh-materials.json 的內容（陣列、有資料）', async () => {
    const list = await getMHMaterials();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('name');
  });

  it('findMHMaterialByName 依名稱精準比對', async () => {
    const found = await findMHMaterialByName('藥草');
    expect(found?.name).toBe('藥草');
    expect(await findMHMaterialByName('不存在的素材xyz')).toBeUndefined();
  });

  it('searchMHMaterials 依名稱／英文名／描述關鍵字篩選，不分大小寫', async () => {
    const byEn = await searchMHMaterials('herb');
    expect(byEn.some((m) => m.name === '藥草')).toBe(true);

    const byZh = await searchMHMaterials('藥草');
    expect(byZh.some((m) => m.name === '藥草')).toBe(true);
  });

  it('searchMHMaterials 查詢字串為空時回傳全部', async () => {
    const all = await getMHMaterials();
    const result = await searchMHMaterials('');
    expect(result.length).toBe(all.length);
  });

  describe('mhMaterialToCreateData', () => {
    it('純名稱素材（無效果）轉出的 payload 只有基本欄位', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: null };
      const data = mhMaterialToCreateData(entry);
      expect(data).toMatchObject({ name: '藥草', category: 'MH素材', is_magic: false, quantity: 1 });
      expect(data.decoration_effects).toBeUndefined();
    });

    it('有插槽效果的素材，效果說明與數值加成會一併帶入 decoration_effects', () => {
      const entry: MHMaterialDef = {
        name: '測試素材',
        nameEn: 'Test Material',
        rarity: null,
        armorDecoration: true,
        decorationEffects: {
          armor: { note: 'AC+2', statBonuses: { combatStats: { ac: 2 } } },
        },
      };
      const data = mhMaterialToCreateData(entry);
      expect(data.armor_decoration).toBe(true);
      expect(data.decoration_effects?.armor).toEqual({
        note: 'AC+2',
        stat_bonuses: { combatStats: { ac: 2 } },
      });
    });

    it('可指定數量', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: null };
      const data = mhMaterialToCreateData(entry, 5);
      expect(data.quantity).toBe(5);
    });
  });

  describe('resolveGatheredMaterialCreateData（地形採集自動加入物品時用）', () => {
    it('採集到的名稱在目錄裡有插槽效果時，一併帶入 decoration_effects', async () => {
      const data = await resolveGatheredMaterialCreateData('千刃龍的飛膜+', 2);
      expect(data.name).toBe('千刃龍的飛膜+');
      expect(data.quantity).toBe(2);
      expect(data.category).toBe('MH素材');
      expect(data.weapon_decoration).toBe(true);
      expect(data.armor_decoration).toBe(true);
      expect(data.decoration_effects?.weapon?.note).toContain('額外造成1d6傷害');
    });

    it('採集到的名稱在目錄裡沒有效果資料時，只帶基本欄位', async () => {
      const data = await resolveGatheredMaterialCreateData('藥草', 3);
      expect(data).toMatchObject({ name: '藥草', category: 'MH素材', quantity: 3, is_magic: false });
      expect(data.decoration_effects).toBeUndefined();
    });

    it('採集到的名稱完全不在目錄裡時，退回只有名稱的基本欄位，不報錯', async () => {
      const data = await resolveGatheredMaterialCreateData('尚未收錄的素材xyz', 1);
      expect(data).toEqual({ name: '尚未收錄的素材xyz', category: 'MH素材', quantity: 1, is_magic: false });
    });
  });
});
