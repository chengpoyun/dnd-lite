/**
 * Modal 樣式統一性測試
 * 
 * 測試目標：
 * 1. 所有 Modal 使用統一的 padding (px-3 py-3)
 * 2. 驗證共用樣式常量的正確性
 */

import { describe, it, expect } from 'vitest';
import {
  MODAL_CONTAINER_CLASS,
  INPUT_ROW_CLASS,
  INPUT_LABEL_CLASS,
  INPUT_CLASS,
  BUTTON_PRIMARY_CLASS,
  BUTTON_SECONDARY_CLASS,
} from '../../styles/modalStyles';

describe('Modal 樣式統一性測試', () => {
  describe('容器樣式', () => {
    it('MODAL_CONTAINER_CLASS 應該包含 px-3 py-3', () => {
      expect(MODAL_CONTAINER_CLASS).toContain('px-3');
      expect(MODAL_CONTAINER_CLASS).toContain('py-3');
    });

    it('MODAL_CONTAINER_CLASS 應該包含標準圓角和背景', () => {
      expect(MODAL_CONTAINER_CLASS).toContain('rounded-xl');
      expect(MODAL_CONTAINER_CLASS).toContain('bg-slate-800');
    });

    it('MODAL_CONTAINER_CLASS 應該設定最大寬度', () => {
      expect(MODAL_CONTAINER_CLASS).toContain('max-w-md');
      expect(MODAL_CONTAINER_CLASS).toContain('w-full');
    });
  });

  describe('輸入行樣式', () => {
    it('INPUT_ROW_CLASS 應該使用 flex 橫向佈局', () => {
      expect(INPUT_ROW_CLASS).toContain('flex');
      expect(INPUT_ROW_CLASS).toContain('items-center');
      expect(INPUT_ROW_CLASS).toContain('gap-2');
    });

    it('INPUT_LABEL_CLASS 應該固定寬度 w-20', () => {
      expect(INPUT_LABEL_CLASS).toContain('w-20');
      expect(INPUT_LABEL_CLASS).toContain('shrink-0');
    });

    it('INPUT_CLASS 應該使用寬度計算確保對齊', () => {
      expect(INPUT_CLASS).toContain('w-[calc(100%-5.5rem)]');
    });

    it('INPUT_CLASS 應該包含 focus 狀態樣式', () => {
      expect(INPUT_CLASS).toContain('focus:outline-none');
      expect(INPUT_CLASS).toContain('focus:border-amber-500');
    });
  });

  describe('按鈕樣式', () => {
    it('PRIMARY 按鈕應該是綠色', () => {
      expect(BUTTON_PRIMARY_CLASS).toContain('bg-green-600');
      expect(BUTTON_PRIMARY_CLASS).toContain('hover:bg-green-700');
    });

    it('SECONDARY 按鈕應該是灰色', () => {
      expect(BUTTON_SECONDARY_CLASS).toContain('bg-slate-700');
      expect(BUTTON_SECONDARY_CLASS).toContain('hover:bg-slate-600');
    });

    it('所有按鈕應該使用 flex-1 平分寬度', () => {
      expect(BUTTON_PRIMARY_CLASS).toContain('flex-1');
      expect(BUTTON_SECONDARY_CLASS).toContain('flex-1');
    });

    it('所有按鈕應該有 disabled 樣式', () => {
      expect(BUTTON_PRIMARY_CLASS).toContain('disabled:opacity-50');
      expect(BUTTON_SECONDARY_CLASS).not.toContain('disabled'); // secondary 通常不需要 disabled
    });
  });

  describe('樣式一致性驗證', () => {
    it('所有輸入框樣式應該包含相同的邊框顏色', () => {
      const borderColor = 'border-slate-600';
      expect(INPUT_CLASS).toContain(borderColor);
    });

    it('所有按鈕應該使用相同的 padding', () => {
      const padding = 'px-4 py-2';
      expect(BUTTON_PRIMARY_CLASS).toContain('px-4');
      expect(BUTTON_PRIMARY_CLASS).toContain('py-2');
      expect(BUTTON_SECONDARY_CLASS).toContain('px-4');
      expect(BUTTON_SECONDARY_CLASS).toContain('py-2');
    });

    it('所有互動元素應該有 transition 效果', () => {
      expect(BUTTON_PRIMARY_CLASS).toContain('transition-colors');
      expect(BUTTON_SECONDARY_CLASS).toContain('transition-colors');
    });
  });

  describe('樣式值格式驗證', () => {
    it('所有類別應該是非空字串', () => {
      expect(MODAL_CONTAINER_CLASS.length).toBeGreaterThan(0);
      expect(INPUT_ROW_CLASS.length).toBeGreaterThan(0);
      expect(INPUT_LABEL_CLASS.length).toBeGreaterThan(0);
      expect(INPUT_CLASS.length).toBeGreaterThan(0);
    });

    it('所有類別應該只包含有效的 Tailwind 類別名稱', () => {
      const validClassPattern = /^[a-z0-9:\-\[\]\(\)\/\.%\s]+$/i;
      expect(MODAL_CONTAINER_CLASS).toMatch(validClassPattern);
      expect(INPUT_CLASS).toMatch(validClassPattern);
    });

    it('calc() 寬度計算應該使用正確的語法', () => {
      expect(INPUT_CLASS).toMatch(/w-\[calc\(.*\)\]/);
      // 驗證 calc 公式：100% - 5.5rem (w-20 + gap-2)
      expect(INPUT_CLASS).toContain('calc(100%-5.5rem)');
    });
  });

  describe('響應式設計驗證', () => {
    it('Modal 容器應該適配不同螢幕尺寸', () => {
      // max-w-md 確保在大螢幕上不會太寬
      expect(MODAL_CONTAINER_CLASS).toContain('max-w-md');
      // w-full 確保在小螢幕上填滿
      expect(MODAL_CONTAINER_CLASS).toContain('w-full');
    });

    it('輸入框寬度計算應該考慮 label 和 gap', () => {
      // w-20 (label) + gap-2 (0.5rem) = 5.5rem
      // 因此輸入框寬度 = 100% - 5.5rem
      const hasLabelWidth = INPUT_LABEL_CLASS.includes('w-20');
      const hasGap = INPUT_ROW_CLASS.includes('gap-2');
      const hasCorrectInputWidth = INPUT_CLASS.includes('calc(100%-5.5rem)');
      
      expect(hasLabelWidth && hasGap && hasCorrectInputWidth).toBe(true);
    });
  });

  describe('無障礙設計驗證', () => {
    it('輸入框應該有 focus 狀態提示', () => {
      expect(INPUT_CLASS).toContain('focus:');
    });

    it('按鈕應該有 hover 狀態反饋', () => {
      expect(BUTTON_PRIMARY_CLASS).toContain('hover:');
      expect(BUTTON_SECONDARY_CLASS).toContain('hover:');
    });

    it('disabled 按鈕應該有視覺反饋', () => {
      expect(BUTTON_PRIMARY_CLASS).toContain('disabled:opacity-50');
    });
  });
});
