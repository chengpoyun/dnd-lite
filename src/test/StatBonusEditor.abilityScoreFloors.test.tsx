import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatBonusEditor, type StatBonusEditorValue } from '../../components/StatBonusEditor';

// 討論結論：只有六個屬性值列支援 "=19" 這種絕對值語法（如食人魔力量手套），
// 其餘欄位（調整值/豁免/技能/戰鬥屬性）維持純相對加值輸入不變。

describe('StatBonusEditor - 屬性值列支援 =N 絕對值語法', () => {
  it('輸入 "=19" 時寫入 abilityScoreFloors，並清除同屬性的 abilityScores', () => {
    const onChange = vi.fn();
    const value: StatBonusEditorValue = { abilityScores: { str: 2 } };
    render(<StatBonusEditor value={value} onChange={onChange} />);

    const strInput = screen.getAllByPlaceholderText('+2/=19')[0];
    fireEvent.blur(strInput, { target: { value: '=19' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        abilityScoreFloors: expect.objectContaining({ str: 19 }),
      })
    );
    const nextValue = onChange.mock.calls[0][0] as StatBonusEditorValue;
    expect(nextValue.abilityScores?.str).toBeUndefined();
  });

  it('輸入純數字（相對加值）時寫入 abilityScores，並清除同屬性的 abilityScoreFloors', () => {
    const onChange = vi.fn();
    const value: StatBonusEditorValue = { abilityScoreFloors: { str: 19 } };
    render(<StatBonusEditor value={value} onChange={onChange} />);

    const strInput = screen.getAllByPlaceholderText('+2/=19')[0];
    fireEvent.blur(strInput, { target: { value: '2' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        abilityScores: expect.objectContaining({ str: 2 }),
      })
    );
    const nextValue = onChange.mock.calls[0][0] as StatBonusEditorValue;
    expect(nextValue.abilityScoreFloors?.str).toBeUndefined();
  });

  it('已設定 abilityScoreFloors 時，畫面顯示 "=19"', () => {
    const value: StatBonusEditorValue = { abilityScoreFloors: { str: 19 } };
    render(<StatBonusEditor value={value} onChange={vi.fn()} />);

    const strInput = screen.getAllByPlaceholderText('+2/=19')[0] as HTMLInputElement;
    expect(strInput.value).toBe('=19');
  });

  it('負數相對加值（如 "-1"）仍正常寫入 abilityScores', () => {
    const onChange = vi.fn();
    render(<StatBonusEditor value={{}} onChange={onChange} />);

    const strInput = screen.getAllByPlaceholderText('+2/=19')[0];
    fireEvent.blur(strInput, { target: { value: '-1' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ abilityScores: expect.objectContaining({ str: -1 }) })
    );
  });

  it('調整值欄位不支援 =N 語法，仍是純數字輸入（沒有 +2/=19 提示文字）', () => {
    render(<StatBonusEditor value={{}} onChange={vi.fn()} />);
    expect(screen.getByText('力量調整值')).toBeInTheDocument();
    // 調整值行的 input 沒有 "+2/=19" placeholder，只有六個屬性值行才有
    expect(screen.getAllByPlaceholderText('+2/=19')).toHaveLength(6);
  });
});
