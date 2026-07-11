import { describe, it, expect } from 'vitest';
import { getTerrainRewards, getAllLandscapes } from '../../services/terrainRewardService';
import type { TerrainDef } from '../../types/terrainReward';

describe('getTerrainRewards', () => {
  it('回傳的資料應包含所有九個地形，且每筆都有 id/name/landscapes', async () => {
    const terrains = await getTerrainRewards();

    expect(terrains.length).toBe(9);
    terrains.forEach((t) => {
      expect(typeof t.id).toBe('string');
      expect(typeof t.name).toBe('string');
      expect(Array.isArray(t.landscapes)).toBe(true);
    });
  });

  it('重複呼叫時回傳同一份快取（同一個物件參考），不會每次都重新載入', async () => {
    const first = await getTerrainRewards();
    const second = await getTerrainRewards();

    expect(second).toBe(first);
  });
});

describe('getAllLandscapes', () => {
  const makeTerrain = (landscapes: string[]): TerrainDef =>
    ({ landscapes } as unknown as TerrainDef);

  it('彙整多個地形的地貌並去除重複', () => {
    const terrains = [makeTerrain(['平原', '森林']), makeTerrain(['森林', '山脈'])];

    const result = getAllLandscapes(terrains);

    expect(result).toEqual(['平原', '山脈', '森林'].sort((a, b) => a.localeCompare(b, 'zh-TW')));
    expect(new Set(result).size).toBe(result.length);
  });

  it('空陣列輸入回傳空陣列', () => {
    expect(getAllLandscapes([])).toEqual([]);
  });

  it('結果依照 zh-TW 語系排序', () => {
    const terrains = [makeTerrain(['沼澤', '沙漠', '山丘'])];

    const result = getAllLandscapes(terrains);

    const expected = ['沼澤', '沙漠', '山丘'].sort((a, b) => a.localeCompare(b, 'zh-TW'));
    expect(result).toEqual(expected);
  });
});
