import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatBonusEditor, type StatBonusEditorValue } from '../../components/StatBonusEditor';

/** 依戰鬥屬性列標籤文字（如「攻擊傷害」）找到該列的 input */
const getCombatStatInput = (label: string): HTMLInputElement => {
  const labelEl = screen.getByText(label);
  const row = labelEl.closest('div')?.parentElement as HTMLElement;
  const input = row.querySelector('input');
  if (!input) throw new Error(`找不到「${label}」列的 input`);
  return input as HTMLInputElement;
};

describe('StatBonusEditor - 戰鬥屬性支援骰子記法輸入', () => {
  it('輸入骰子記法（如 "1d8"）時，寫入字串而非數字', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{}} onChange={onChange} />);

    const input = getCombatStatInput('攻擊傷害');
    fireEvent.blur(input, { target: { value: '1d8' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ combatStats: expect.objectContaining({ attackDamage: '1d8' }) })
    );
  });

  it('輸入負號骰子記法（如 "-2d4"）同樣寫入字串', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{}} onChange={onChange} />);

    const input = getCombatStatInput('攻擊傷害');
    fireEvent.blur(input, { target: { value: '-2d4' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ combatStats: expect.objectContaining({ attackDamage: '-2d4' }) })
    );
  });

  it('輸入純數字時仍寫入數字（不受骰子記法支援影響）', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{}} onChange={onChange} />);

    const input = getCombatStatInput('攻擊傷害');
    fireEvent.blur(input, { target: { value: '3' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ combatStats: expect.objectContaining({ attackDamage: 3 }) })
    );
  });

  it('輸入無法辨識的文字（既非數字也非骰子記法）時，視為 0', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{}} onChange={onChange} />);

    const input = getCombatStatInput('攻擊傷害');
    fireEvent.blur(input, { target: { value: 'abc' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ combatStats: expect.objectContaining({ attackDamage: 0 }) })
    );
  });

  it('已設定骰子記法時，畫面顯示原始骰子文字', () => {
    render(<StatBonusEditor value={{ combatStats: { attackDamage: '1d8' } }} onChange={vi.fn()} />);
    const input = getCombatStatInput('攻擊傷害');
    expect(input.value).toBe('1d8');
  });

  it('骰子記法支援適用於所有戰鬥屬性列，不僅限攻擊傷害（如護甲值）', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{}} onChange={onChange} />);

    const input = getCombatStatInput('護甲值 (AC)');
    fireEvent.blur(input, { target: { value: '1d4' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ combatStats: expect.objectContaining({ ac: '1d4' }) })
    );
  });
});

describe('StatBonusEditor - 「其他」自由文字欄位', () => {
  it('顯示「其他」多行文字框，並帶入既有值', () => {
    render(<StatBonusEditor value={{ other: '命中後燃燒，持續3輪' }} onChange={vi.fn()} />);
    const textarea = screen.getByText('其他').closest('div')?.parentElement?.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toBe('命中後燃燒，持續3輪');
  });

  it('編輯後失焦時，onChange 收到更新後的 other 文字', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{}} onChange={onChange} />);
    const textarea = screen.getByText('其他').closest('div')?.parentElement?.querySelector('textarea') as HTMLTextAreaElement;

    fireEvent.blur(textarea, { target: { value: '每輪損失1d4生命' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ other: '每輪損失1d4生命' }));
  });
});
