import { describe, it, expect } from 'vitest';
import { EXP_FOR_LEVEL, getLevelFromExp, getNextLevelExp } from '../../utils/expLevelUtils';

describe('getLevelFromExp', () => {
  it('負數經驗值視為 0，回傳 1 級', () => {
    expect(getLevelFromExp(-100)).toBe(1);
  });

  it('0 經驗值回傳 1 級', () => {
    expect(getLevelFromExp(0)).toBe(1);
  });

  it('小數會無條件捨去（floor）', () => {
    expect(getLevelFromExp(299.9)).toBe(1);
  });

  it('門檻值前 1 點仍是前一級（邊界：299 vs 300）', () => {
    expect(getLevelFromExp(299)).toBe(1);
  });

  it('剛好等於門檻值時已升到下一級（邊界：300 → 2 級）', () => {
    expect(getLevelFromExp(300)).toBe(2);
  });

  it('逐一驗證每個等級門檻的邊界正確（EXP_FOR_LEVEL 全表）', () => {
    EXP_FOR_LEVEL.forEach((threshold, index) => {
      const expectedLevel = index + 1;
      expect(getLevelFromExp(threshold)).toBe(expectedLevel);
      if (threshold > 0) {
        expect(getLevelFromExp(threshold - 1)).toBe(expectedLevel - 1);
      }
    });
  });

  it('20 級為上限，超過最高門檻也不會繼續往上算', () => {
    expect(getLevelFromExp(355000)).toBe(20);
    expect(getLevelFromExp(999999999)).toBe(20);
  });
});

describe('getNextLevelExp', () => {
  it('0 經驗值時，下一級門檻是 300，非滿級', () => {
    expect(getNextLevelExp(0)).toEqual({ exp: 300, isMaxLevel: false });
  });

  it('門檻值前 1 點，下一級門檻仍是同一個值（邊界：299）', () => {
    expect(getNextLevelExp(299)).toEqual({ exp: 300, isMaxLevel: false });
  });

  it('剛好達到門檻值時，下一級門檻應前進到下下個等級（邊界：300 → 900）', () => {
    expect(getNextLevelExp(300)).toEqual({ exp: 900, isMaxLevel: false });
  });

  it('達到滿級門檻時，回傳滿級門檻本身且 isMaxLevel 為 true', () => {
    expect(getNextLevelExp(355000)).toEqual({ exp: 355000, isMaxLevel: true });
  });

  it('超過滿級門檻時，仍固定回傳滿級門檻且 isMaxLevel 為 true', () => {
    expect(getNextLevelExp(999999999)).toEqual({ exp: 355000, isMaxLevel: true });
  });

  it('負數經驗值視為 0 處理', () => {
    expect(getNextLevelExp(-500)).toEqual({ exp: 300, isMaxLevel: false });
  });
});
