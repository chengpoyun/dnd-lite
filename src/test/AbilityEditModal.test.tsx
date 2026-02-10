import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbilityEditModal } from '../../components/AbilityEditModal';

describe('AbilityEditModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose,
    abilityKey: 'str' as const,
    abilityLabel: '力量',
    scoreBasic: 16,
    scoreBonusSources: [{ label: '物品加值', value: 2 }],
    modifierBonusSources: [{ label: '職業能力', value: 1 }],
    saveBonusSources: [{ label: '其他效果', value: 1 }],
    isSaveProficient: true,
    level: 5,
    onSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('顯示能力值、調整值與豁免區塊，以及最終總計', () => {
    render(<AbilityEditModal {...defaultProps} />);

    // 標題與三個區塊標籤
    expect(screen.getByText(/力量 STR/i)).toBeInTheDocument();
    expect(screen.getByText('能力值')).toBeInTheDocument();
    expect(screen.getByText('屬性調整值')).toBeInTheDocument();
    expect(screen.getByText('豁免')).toBeInTheDocument();

    // bonus list 來源文字
    expect(screen.getByText('物品加值')).toBeInTheDocument();
    expect(screen.getByText('職業能力')).toBeInTheDocument();
    expect(screen.getByText('其他效果')).toBeInTheDocument();

    // 最終總計標籤存在
    expect(screen.getAllByText('最終屬性值').length).toBeGreaterThan(0);
    expect(screen.getAllByText('最終調整值').length).toBeGreaterThan(0);
    expect(screen.getAllByText('最終豁免').length).toBeGreaterThan(0);
  });

  it('變更能力值基礎後，儲存會以新基礎值呼叫 onSave', () => {
    render(<AbilityEditModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('16');
    fireEvent.change(input, { target: { value: '18' } });

    fireEvent.click(screen.getByText('儲存'));

    expect(onSave).toHaveBeenCalledWith(18, true);
  });

  it('切換豁免熟練後，再儲存會反映新的熟練狀態', () => {
    render(<AbilityEditModal {...defaultProps} />);

    // 預設為熟練，改成「無」
    fireEvent.click(screen.getByText('無'));

    fireEvent.click(screen.getByText('儲存'));

    expect(onSave).toHaveBeenCalledWith(16, false);
  });

  it('按下重置會把能力值設為 10 並取消熟練', () => {
    render(<AbilityEditModal {...defaultProps} />);

    const input = screen.getByDisplayValue('16');
    fireEvent.change(input, { target: { value: '20' } });

    fireEvent.click(screen.getByText('重置'));

    expect((input as HTMLInputElement).value).toBe('10');
    // 再按儲存確認 onSave 參數
    fireEvent.click(screen.getByText('儲存'));
    expect(onSave).toHaveBeenCalledWith(10, false);
  });
});

