/**
 * styles/common.ts 單元測試
 * 驗證 STYLES、combineStyles、conditionalStyle 行為
 */
import { describe, it, expect } from 'vitest';
import { STYLES, combineStyles, conditionalStyle } from '../../styles/common';

describe('styles/common', () => {
  describe('STYLES', () => {
    it('應包含預期的頂層鍵', () => {
      const keys = Object.keys(STYLES);
      expect(keys).toContain('container');
      expect(keys).toContain('button');
      expect(keys).toContain('text');
      expect(keys).toContain('input');
      expect(keys).toContain('loading');
      expect(keys).toContain('layout');
      expect(keys).toContain('emptyState');
      expect(keys).toContain('filterChip');
      expect(keys).toContain('listCard');
    });

    it('button.primary 應為字串且含 amber', () => {
      expect(typeof STYLES.button.primary).toBe('string');
      expect(STYLES.button.primary).toContain('amber');
    });

    it('listCard.base 應含 rounded-lg', () => {
      expect(STYLES.listCard.base).toContain('rounded-lg');
    });
  });

  describe('combineStyles', () => {
    it('應以空白串接多個樣式', () => {
      expect(combineStyles('a', 'b', 'c')).toBe('a b c');
    });

    it('應過濾掉空字串', () => {
      expect(combineStyles('a', '', 'b')).toBe('a b');
    });

    it('空參數應回傳空字串', () => {
      expect(combineStyles()).toBe('');
    });

    it('單一參數應回傳該字串', () => {
      expect(combineStyles('only')).toBe('only');
    });
  });

  describe('conditionalStyle', () => {
    it('condition 為 true 時回傳 trueStyle', () => {
      expect(conditionalStyle(true, 'yes', 'no')).toBe('yes');
    });

    it('condition 為 false 時回傳 falseStyle', () => {
      expect(conditionalStyle(false, 'yes', 'no')).toBe('no');
    });

    it('false 且未傳 falseStyle 時回傳空字串', () => {
      expect(conditionalStyle(false, 'yes')).toBe('');
    });
  });
});
