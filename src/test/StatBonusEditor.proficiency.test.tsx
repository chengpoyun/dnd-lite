/**
 * StatBonusEditor - 豁免/技能欄位輸入「熟練」「專精」時賦予熟練度（而非一般數字加值）
 * 對應「適應力」等專長：MH素材/能力/物品可透過此輸入賦予某項豁免或技能熟練
 */
import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatBonusEditor, summarizeStatBonusEditorValue } from '../../components/StatBonusEditor';

/** 依列標籤文字（如「體質豁免」「運動」）找到該列的 input */
const getRowInput = (label: string): HTMLInputElement => {
  const labelEl = screen.getByText(label);
  const row = labelEl.closest('div')?.parentElement as HTMLElement;
  const input = row.querySelector('input');
  if (!input) throw new Error(`找不到「${label}」列的 input`);
  return input as HTMLInputElement;
};

describe('StatBonusEditor - 豁免欄位輸入「熟練」', () => {
  it('輸入「熟練」時，onChange 收到 savingThrowProficiency 包含該豁免', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{}} onChange={onChange} />);
    const input = getRowInput('體質豁免');
    fireEvent.blur(input, { target: { value: '熟練' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ savingThrowProficiency: ['con'] })
    );
  });

  it('輸入「熟練」時，不會同時寫入一般數字加值', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{}} onChange={onChange} />);
    const input = getRowInput('體質豁免');
    fireEvent.blur(input, { target: { value: '熟練' } });

    const next = onChange.mock.calls[0][0];
    expect(next.savingThrows?.con).toBeUndefined();
  });

  it('已設定 savingThrowProficiency 時，畫面顯示「熟練」', () => {
    render(<StatBonusEditor value={{ savingThrowProficiency: ['con'] }} onChange={vi.fn()} />);
    const input = getRowInput('體質豁免');
    expect(input.value).toBe('熟練');
  });

  it('從熟練狀態改回輸入數字時，移除 savingThrowProficiency 並改寫一般數字加值', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{ savingThrowProficiency: ['con'] }} onChange={onChange} />);
    const input = getRowInput('體質豁免');
    fireEvent.blur(input, { target: { value: '2' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        savingThrowProficiency: [],
        savingThrows: expect.objectContaining({ con: 2 }),
      })
    );
  });

  it('不影響其他豁免的 savingThrowProficiency', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{ savingThrowProficiency: ['str'] }} onChange={onChange} />);
    const input = getRowInput('體質豁免');
    fireEvent.blur(input, { target: { value: '熟練' } });

    const next = onChange.mock.calls[0][0];
    expect(next.savingThrowProficiency).toEqual(expect.arrayContaining(['str', 'con']));
  });
});

describe('StatBonusEditor - 技能欄位輸入「熟練」「專精」', () => {
  it('輸入「熟練」時，onChange 收到 skillProficiency[技能]=1', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{}} onChange={onChange} />);
    const input = getRowInput('運動');
    fireEvent.blur(input, { target: { value: '熟練' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ skillProficiency: { '運動': 1 } })
    );
  });

  it('輸入「專精」時，onChange 收到 skillProficiency[技能]=2', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{}} onChange={onChange} />);
    const input = getRowInput('運動');
    fireEvent.blur(input, { target: { value: '專精' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ skillProficiency: { '運動': 2 } })
    );
  });

  it('輸入「熟練」時，不會同時寫入一般數字加值', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{}} onChange={onChange} />);
    const input = getRowInput('運動');
    fireEvent.blur(input, { target: { value: '熟練' } });

    const next = onChange.mock.calls[0][0];
    expect(next.skills?.['運動']).toBeUndefined();
  });

  it('已設定 skillProficiency=1 時畫面顯示「熟練」，=2 時顯示「專精」', () => {
    const { unmount } = render(
      <StatBonusEditor value={{ skillProficiency: { '運動': 1 } }} onChange={vi.fn()} />
    );
    expect(getRowInput('運動').value).toBe('熟練');
    unmount();

    render(<StatBonusEditor value={{ skillProficiency: { '運動': 2 } }} onChange={vi.fn()} />);
    expect(getRowInput('運動').value).toBe('專精');
  });

  it('從熟練/專精狀態改回輸入數字時，移除該技能的 skillProficiency 並改寫一般數字加值', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{ skillProficiency: { '運動': 2 } }} onChange={onChange} />);
    const input = getRowInput('運動');
    fireEvent.blur(input, { target: { value: '3' } });

    const next = onChange.mock.calls[0][0];
    expect(next.skillProficiency?.['運動']).toBeUndefined();
    expect(next.skills?.['運動']).toBe(3);
  });

  it('不影響其他技能的 skillProficiency', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{ skillProficiency: { '特技': 2 } }} onChange={onChange} />);
    const input = getRowInput('運動');
    fireEvent.blur(input, { target: { value: '熟練' } });

    const next = onChange.mock.calls[0][0];
    expect(next.skillProficiency).toEqual({ '特技': 2, '運動': 1 });
  });
});

describe('summarizeStatBonusEditorValue - 熟練/專精摘要', () => {
  it('savingThrowProficiency 摘要為「豁免標籤：熟練」', () => {
    const out = summarizeStatBonusEditorValue({ savingThrowProficiency: ['con'] });
    expect(out).toContainEqual({ label: '體質豁免', text: '熟練' });
  });

  it('skillProficiency=1 摘要為「技能：熟練」，=2 摘要為「技能：專精」', () => {
    const out = summarizeStatBonusEditorValue({ skillProficiency: { '運動': 1, '特技': 2 } });
    expect(out).toContainEqual({ label: '運動', text: '熟練' });
    expect(out).toContainEqual({ label: '特技', text: '專精' });
  });
});
