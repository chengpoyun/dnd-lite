import { describe, it, expect } from 'vitest';

/**
 * AC 範圍顯示邏輯測試
 * 
 * 測試目的：確保 AC 範圍在不同狀態下正確顯示
 * - 預設狀態 (0 < AC <= 99) 顯示為 "?"
 * - 無上限狀態顯示為 "X < AC"
 * - AC 確定狀態 (min + 1 === max) 顯示為 "AC = X"
 * - 普通範圍狀態顯示為 "X < AC <= Y"
 */

// 模擬 AC 範圍顯示邏輯（與 MonsterCard 和 AdjustACModal 一致）
function getACDisplay(ac_min: number, ac_max: number | null): string {
  // 預設狀態
  if (ac_min === 0 && ac_max === 99) {
    return '?';
  }
  
  // 無上限
  if (ac_max === null) {
    return `${ac_min} < AC`;
  }
  
  // AC 已確定（開區間只剩一個值）
  if (ac_min + 1 === ac_max) {
    return `AC = ${ac_max}`;
  }
  
  // 普通範圍
  return `${ac_min} < AC <= ${ac_max}`;
}

describe('AC 範圍顯示邏輯', () => {
  describe('預設狀態', () => {
    it('應該將 0 < AC <= 99 顯示為 "?"', () => {
      expect(getACDisplay(0, 99)).toBe('?');
    });
  });

  describe('無上限狀態', () => {
    it('應該顯示 "X < AC" 當 max 為 null', () => {
      expect(getACDisplay(10, null)).toBe('10 < AC');
      expect(getACDisplay(20, null)).toBe('20 < AC');
      expect(getACDisplay(0, null)).toBe('0 < AC');
    });
  });

  describe('AC 已確定狀態', () => {
    it('應該顯示 "AC = X" 當範圍只剩一個可能值', () => {
      // 24 < AC <= 25 表示 AC 只能是 25
      expect(getACDisplay(24, 25)).toBe('AC = 25');
      
      // 14 < AC <= 15 表示 AC 只能是 15
      expect(getACDisplay(14, 15)).toBe('AC = 15');
      
      // 0 < AC <= 1 表示 AC 只能是 1
      expect(getACDisplay(0, 1)).toBe('AC = 1');
    });

    it('應該正確處理高 AC 值', () => {
      // 29 < AC <= 30 表示 AC 只能是 30
      expect(getACDisplay(29, 30)).toBe('AC = 30');
    });
  });

  describe('普通範圍狀態', () => {
    it('應該顯示 "X < AC <= Y" 當範圍包含多個可能值', () => {
      // 10 < AC <= 15 表示 AC 可能是 11, 12, 13, 14, 15
      expect(getACDisplay(10, 15)).toBe('10 < AC <= 15');
      
      // 20 < AC <= 30 表示 AC 可能是 21-30
      expect(getACDisplay(20, 30)).toBe('20 < AC <= 30');
    });

    it('應該正確處理範圍差距為 2 的情況', () => {
      // 10 < AC <= 12 表示 AC 可能是 11 或 12（兩個值）
      expect(getACDisplay(10, 12)).toBe('10 < AC <= 12');
    });
  });

  describe('邊界案例', () => {
    it('應該正確處理極小值', () => {
      expect(getACDisplay(0, 1)).toBe('AC = 1');
      expect(getACDisplay(0, 2)).toBe('0 < AC <= 2');
    });

    it('應該正確處理極大值', () => {
      expect(getACDisplay(98, 99)).toBe('AC = 99');
      expect(getACDisplay(97, 99)).toBe('97 < AC <= 99');
    });
  });
});

describe('調整 AC 按鈕顯示邏輯', () => {
  // 模擬 MonsterCard 中的按鈕顯示條件
  function shouldShowAdjustACButton(ac_min: number, ac_max: number | null): boolean {
    return ac_max === null || ac_min + 1 !== ac_max;
  }

  it('當 AC 未確定時應該顯示按鈕', () => {
    expect(shouldShowAdjustACButton(0, 99)).toBe(true);
    expect(shouldShowAdjustACButton(10, 20)).toBe(true);
    expect(shouldShowAdjustACButton(10, null)).toBe(true);
  });

  it('當 AC 已確定時應該隱藏按鈕', () => {
    expect(shouldShowAdjustACButton(24, 25)).toBe(false);
    expect(shouldShowAdjustACButton(14, 15)).toBe(false);
    expect(shouldShowAdjustACButton(0, 1)).toBe(false);
  });

  it('當範圍包含兩個或以上可能值時應該顯示按鈕', () => {
    expect(shouldShowAdjustACButton(10, 12)).toBe(true);
    expect(shouldShowAdjustACButton(20, 30)).toBe(true);
  });
});
