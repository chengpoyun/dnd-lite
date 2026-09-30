import { describe, it, expect } from 'vitest';
import { parseQuantityInput, resolveFinalQuantity } from '../../utils/quantityMultiplier';

describe('parseQuantityInput', () => {
  it('回傳正整數本身', () => {
    expect(parseQuantityInput('5')).toBe(5);
  });

  it('前後有空白時仍能解析', () => {
    expect(parseQuantityInput('  7  ')).toBe(7);
  });

  it('空字串時回傳 1', () => {
    expect(parseQuantityInput('')).toBe(1);
  });

  it('非數字字串時回傳 1', () => {
    expect(parseQuantityInput('abc')).toBe(1);
  });

  it('0 或負數時回傳 1', () => {
    expect(parseQuantityInput('0')).toBe(1);
    expect(parseQuantityInput('-3')).toBe(1);
  });
});

describe('resolveFinalQuantity', () => {
  it('applyMultiplier 為 true 時乘上倍數', () => {
    expect(resolveFinalQuantity('2', 4, true)).toBe(8);
  });

  it('applyMultiplier 為 false 時不乘倍數', () => {
    expect(resolveFinalQuantity('3', 4, false)).toBe(3);
  });

  it('倍數為 1 時無論開關為何都不變', () => {
    expect(resolveFinalQuantity('5', 1, true)).toBe(5);
    expect(resolveFinalQuantity('5', 1, false)).toBe(5);
  });

  it('輸入非法時視為 1 再乘倍數', () => {
    expect(resolveFinalQuantity('abc', 4, true)).toBe(4);
  });
});
