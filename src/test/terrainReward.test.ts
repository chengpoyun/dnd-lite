/**
 * 地形獎勵工具函式：parseRewardCell、getTierForLevel、getRewardFromTable
 */
import { describe, it, expect } from 'vitest';
import {
  parseRewardCell,
  getTierForLevel,
  getRewardFromTable,
  resolveXKeyForRoll,
  getBackupSkillsForCategory,
  getColumnKeys,
  getRewardsForCategoryInTier,
  getRewardSummaryNames,
} from '../../utils/terrainReward';
import type { TerrainDef, TierTable } from '../../types/terrainReward';

describe('terrainReward - getBackupSkillsForCategory', () => {
  it('依資源類別 id（英文）回傳固定備用技能（規則書對照）', () => {
    expect(getBackupSkillsForCategory('bonepiles')).toEqual(['歷史', '觀察']);
    expect(getBackupSkillsForCategory('fish')).toEqual(['運動', '巧手']);
    expect(getBackupSkillsForCategory('insects')).toEqual(['巧手', '觀察']);
    expect(getBackupSkillsForCategory('minerals')).toEqual(['運動']);
    expect(getBackupSkillsForCategory('mushrooms')).toEqual(['自然', '求生']);
    expect(getBackupSkillsForCategory('plants')).toEqual(['自然', '求生']);
  });

  it('未知類別回傳空陣列', () => {
    expect(getBackupSkillsForCategory('unknown')).toEqual([]);
  });
});

describe('terrainReward - parseRewardCell', () => {
  it('單一物品無 x 時 quantity 為 1', () => {
    expect(parseRewardCell('藥草')).toEqual({ name: '藥草', quantity: 1 });
    expect(parseRewardCell('骨')).toEqual({ name: '骨', quantity: 1 });
  });

  it('「藥草 x 2」解析為 name + quantity', () => {
    expect(parseRewardCell('藥草 x 2')).toEqual({ name: '藥草', quantity: 2 });
    expect(parseRewardCell('藥草 x 3')).toEqual({ name: '藥草', quantity: 3 });
  });

  it('支援 x2、x 2、X2 等變體', () => {
    expect(parseRewardCell('藥草 x2')).toEqual({ name: '藥草', quantity: 2 });
    expect(parseRewardCell('青菇X2')).toEqual({ name: '青菇', quantity: 2 });
  });

  it('空字串或僅空白回傳預設', () => {
    expect(parseRewardCell('')).toEqual({ name: '', quantity: 1 });
    expect(parseRewardCell('   ')).toEqual({ name: '', quantity: 1 });
  });
});

describe('terrainReward - getTierForLevel', () => {
  const terrain: TerrainDef = {
    id: 'test',
    name: '測試',
    nameEn: 'Test',
    landscapes: [],
    skillDc: { 求生: 10, 觀察: 10, 自然: 10 },
    tiers: ['initial', 'advanced', 'high', 'special'],
    tables: {
      initial: { levelMin: 1, levelMax: 5, xDie: 6, categories: [], columns: {} },
      advanced: { levelMin: 6, levelMax: 10, xDie: 6, categories: [], columns: {} },
      high: { levelMin: 11, levelMax: 16, xDie: 6, categories: [], columns: {} },
      special: { levelMin: 17, levelMax: 20, xDie: 6, categories: [], columns: {} },
    },
  };

  it('依等級回傳對應 tier', () => {
    expect(getTierForLevel(terrain, 1)).toBe('initial');
    expect(getTierForLevel(terrain, 5)).toBe('initial');
    expect(getTierForLevel(terrain, 6)).toBe('advanced');
    expect(getTierForLevel(terrain, 10)).toBe('advanced');
    expect(getTierForLevel(terrain, 11)).toBe('high');
    expect(getTierForLevel(terrain, 16)).toBe('high');
    expect(getTierForLevel(terrain, 17)).toBe('special');
    expect(getTierForLevel(terrain, 20)).toBe('special');
  });

  it('等級超出範圍或無表時回傳 null', () => {
    const noHigh: TerrainDef = {
      ...terrain,
      tables: {
        ...terrain.tables,
        high: null,
        special: null,
      },
    };
    expect(getTierForLevel(noHigh, 15)).toBe(null);
  });
});

describe('terrainReward - getRewardFromTable', () => {
  const table: TierTable = {
    levelMin: 1,
    levelMax: 5,
    xDie: 6,
    categories: [],
    columns: {
      '1': ['骨', '骨', '小型怪獸骨', '鳥龍骨', '大骨', '野獸骨'],
      '2': ['刺身魚', '爆裂龍魚', '飛魚彈', '爆裂龍魚', '莢油魚', '小金魚'],
      '3': ['蟲殼', '苦蟲', '蜂蜜', '閃光蟲', '蜘蛛網', '不死蟲'],
      '4': ['石頭', '鎧玉', '鎧玉', '大地結晶', '大地結晶', '重鎧玉'],
      '5': ['青菇', '青菇', '青菇', '青菇', '青菇', '興奮菇'],
      '6': ['藥草', '解毒草', '常春藤葉', '樹液草', '木天蔘', '飛散核桃'],
    },
  };

  it('依 x, y 查表回傳解析後獎勵', () => {
    expect(getRewardFromTable(table, 1, 1)).toEqual({ name: '骨', quantity: 1 });
    expect(getRewardFromTable(table, 6, 6)).toEqual({ name: '飛散核桃', quantity: 1 });
    expect(getRewardFromTable(table, 3, 4)).toEqual({ name: '閃光蟲', quantity: 1 });
  });

  it('支援 x 2 數量解析', () => {
    const tableX2: TierTable = {
      ...table,
      columns: {
        ...table.columns,
        '6': [...(table.columns['6'] ?? [])],
      },
    };
    tableX2.columns['6'][4] = '藥草 x 2';
    expect(getRewardFromTable(tableX2, 6, 5)).toEqual({ name: '藥草', quantity: 2 });
  });

  it('x 或 y 越界、空格回傳 null', () => {
    expect(getRewardFromTable(table, 0, 1)).toBeNull();
    expect(getRewardFromTable(table, 7, 1)).toBeNull();
    expect(getRewardFromTable(table, 1, 0)).toBeNull();
    expect(getRewardFromTable(table, 1, 7)).toBeNull();
  });
});

describe('terrainReward - resolveXKeyForRoll (1d10)', () => {
  const table1d10: TierTable = {
    levelMin: 1,
    levelMax: 5,
    xDie: 10,
    categories: [
      { id: 'bonepiles', label: '骨堆', backupDc: 14 },
      { id: 'fish', label: '魚類', backupDc: 14 },
      { id: 'insects', label: '昆蟲', backupDc: 14 },
      { id: 'minerals', label: '礦物', backupDc: 14 },
      { id: 'plants', label: '植物', backupDc: 10 },
    ],
    columns: {
      '1~2': ['骨', '骨', '小骨堆', '大骨堆', '小骨堆', '小骨怪獸骨'],
      '3~4': ['刺身魚', '磨魚', '磨魚', '磨魚', '刺針鮪魚', '刺針鮪魚'],
      '5~6': ['蟲殼', '蟲殼', '蟋蟀', '螢火蟲', '蛇蜂幼蟲', '光蟲'],
      '7~8': ['石頭', '大地結晶', '大地結晶', '鎧玉', '鎧玉', '燕雀石'],
      '9~10': ['藥草', '熱帶莓果', '仙人掌花', '仙人掌花', '火藥草', '火藥草'],
    },
  };

  it('1d10 時 roll 1,2 -> 1~2, 3,4 -> 3~4, 9,10 -> 9~10', () => {
    expect(resolveXKeyForRoll(table1d10, 1)).toBe('1~2');
    expect(resolveXKeyForRoll(table1d10, 2)).toBe('1~2');
    expect(resolveXKeyForRoll(table1d10, 3)).toBe('3~4');
    expect(resolveXKeyForRoll(table1d10, 4)).toBe('3~4');
    expect(resolveXKeyForRoll(table1d10, 9)).toBe('9~10');
    expect(resolveXKeyForRoll(table1d10, 10)).toBe('9~10');
  });

  it('1d6 時 roll 1..6 對應 key "1".."6"', () => {
    const table1d6: TierTable = { ...table1d10, xDie: 6, columns: { '1': ['骨'], '2': ['魚'], '3': ['蟲'], '4': ['石'], '5': ['菇'], '6': ['草'] } };
    expect(resolveXKeyForRoll(table1d6, 1)).toBe('1');
    expect(resolveXKeyForRoll(table1d6, 6)).toBe('6');
  });
});

describe('terrainReward - getColumnKeys', () => {
  it('xDie 6 時回傳 ["1","2","3","4","5","6"]', () => {
    const table: TierTable = { levelMin: 1, levelMax: 5, xDie: 6, categories: [], columns: {} };
    expect(getColumnKeys(table)).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('xDie 10 時回傳 1~2, 3~4, ..., 9~10', () => {
    const table: TierTable = { levelMin: 1, levelMax: 5, xDie: 10, categories: [], columns: {} };
    expect(getColumnKeys(table)).toEqual(['1~2', '3~4', '5~6', '7~8', '9~10']);
  });
});

describe('terrainReward - getRewardsForCategoryInTier', () => {
  const table: TierTable = {
    levelMin: 1,
    levelMax: 5,
    xDie: 6,
    categories: [
      { id: 'bonepiles', label: '骨堆', backupDc: 14 },
      { id: 'fish', label: '魚類', backupDc: 14 },
    ],
    columns: {
      '1': ['骨', '骨 x 2', '小型怪獸骨', '', '', ''],
      '2': ['刺身魚', '爆裂龍魚', '飛魚彈', '爆裂龍魚', '莢油魚', '小金魚'],
    },
  };

  it('依 categoryIndex 回傳該欄所有解析後獎勵', () => {
    const rewards = getRewardsForCategoryInTier(table, 0);
    expect(rewards).toEqual([
      { name: '骨', quantity: 1 },
      { name: '骨', quantity: 2 },
      { name: '小型怪獸骨', quantity: 1 },
    ]);
    const fishRewards = getRewardsForCategoryInTier(table, 1);
    expect(fishRewards).toHaveLength(6);
    expect(fishRewards[0]).toEqual({ name: '刺身魚', quantity: 1 });
  });

  it('categoryIndex 越界回傳空陣列', () => {
    expect(getRewardsForCategoryInTier(table, 5)).toEqual([]);
  });
});

describe('terrainReward - getRewardSummaryNames', () => {
  const table: TierTable = {
    levelMin: 1,
    levelMax: 5,
    xDie: 6,
    categories: [],
    columns: {
      '1': ['骨', '藥草', '骨'],
      '2': ['藥草', '刺身魚', '藥草 x 2'],
    },
  };

  it('收集所有欄位獎勵名稱並去重、排序', () => {
    const names = getRewardSummaryNames(table);
    expect(names).toHaveLength(3);
    expect(names).toContain('刺身魚');
    expect(names).toContain('骨');
    expect(names).toContain('藥草');
    expect(names).toEqual([...names].sort());
  });
});
