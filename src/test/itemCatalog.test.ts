/**
 * itemCatalog - 合併本地 MH素材 + 通用道具兩份目錄的搜尋（供 LearnItemModal 使用）
 */
import { describe, it, expect } from 'vitest';
import { searchLocalCatalog, catalogItemToCreateData } from '../../services/itemCatalog';
import { getMHMaterials } from '../../services/mhMaterialCatalog';
import { getGeneralItems } from '../../services/generalItemCatalog';

describe('itemCatalog - searchLocalCatalog', () => {
  it('查詢字串為空時，回傳兩份目錄的全部條目', async () => {
    const [materials, generals] = await Promise.all([getMHMaterials(), getGeneralItems()]);
    const result = await searchLocalCatalog('');
    expect(result.length).toBe(materials.length + generals.length);
  });

  it('關鍵字命中 MH素材時，結果帶有 source: material', async () => {
    const result = await searchLocalCatalog('藥草');
    const hit = result.find((r) => r.entry.name === '藥草');
    expect(hit?.source).toBe('material');
  });

  it('關鍵字命中通用道具時，結果帶有 source: general', async () => {
    const generals = await getGeneralItems();
    const target = generals[0];
    const result = await searchLocalCatalog(target.name);
    const hit = result.find((r) => r.entry.name === target.name);
    expect(hit?.source).toBe('general');
  });

  it('結果依名稱排序（zh-TW）', async () => {
    const result = await searchLocalCatalog('');
    const names = result.map((r) => r.entry.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'zh-TW'));
    expect(names).toEqual(sorted);
  });
});

describe('itemCatalog - catalogItemToCreateData', () => {
  it('material 來源轉出 category 為 MH素材', async () => {
    const result = await searchLocalCatalog('藥草');
    const hit = result.find((r) => r.entry.name === '藥草')!;
    const data = catalogItemToCreateData(hit);
    expect(data.category).toBe('MH素材');
  });

  it('general 來源轉出對應的原始類別', async () => {
    const generals = await getGeneralItems();
    const target = generals[0];
    const result = await searchLocalCatalog(target.name);
    const hit = result.find((r) => r.entry.name === target.name)!;
    const data = catalogItemToCreateData(hit);
    expect(data.category).toBe(target.category);
  });
});
