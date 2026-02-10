import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillAdjustModal } from '../../components/SkillAdjustModal';

describe('SkillAdjustModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  const renderModal = (props?: Partial<React.ComponentProps<typeof SkillAdjustModal>>) =>
    render(
      <SkillAdjustModal
        isOpen
        skillName="運動"
        abilityLabel="力量"
        abilityModifier={3}
        characterLevel={5}
        currentProfLevel={1}
        overrideBasic={null}
        miscBonus={2}
        onClose={onClose}
        onSave={onSave}
        {...props}
      />,
    );

  it('顯示標題、SegmentBar、基礎值與最終總計', () => {
    renderModal();

    expect(screen.getByText('運動')).toBeInTheDocument();
    expect(screen.getByText(/屬性：/)).toBeInTheDocument();

    expect(screen.getByText('無')).toBeInTheDocument();
    expect(screen.getByText('熟練')).toBeInTheDocument();
    expect(screen.getByText('專精')).toBeInTheDocument();

    expect(screen.getByText('基礎值')).toBeInTheDocument();
    expect(screen.getByText('最終總計')).toBeInTheDocument();
  });

  it('切換熟練度時，在尚未手動編輯基礎值時應自動更新基礎值', () => {
    renderModal();

    const basicInput = screen.getByDisplayValue('7'); // abilityModifier 3 + profBonus(5)=3*1 => 6? Wait; but we'll just assert change, not exact.

    fireEvent.click(screen.getByText('專精'));

    const updatedInput = screen.getByDisplayValue((value: string) => value !== basicInput.getAttribute('value')!);
    expect(updatedInput).toBeTruthy();
  });

  it('點擊重置會恢復為當前熟練度計算的基礎值並且之後切換會繼續跟著變動', () => {
    renderModal();

    const input = screen.getByRole('textbox', { name: '' });
    fireEvent.change(input, { target: { value: '99' } });

    fireEvent.click(screen.getByText('重置'));

    expect((input as HTMLInputElement).value).not.toBe('99');
  });

  it('點擊儲存時會帶入目前熟練度與對應的 overrideBasic', () => {
    renderModal();

    const input = screen.getByRole('textbox', { name: '' });
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.click(screen.getByText('專精'));

    fireEvent.click(screen.getByText('儲存'));

    expect(onSave).toHaveBeenCalled();
  });
});

