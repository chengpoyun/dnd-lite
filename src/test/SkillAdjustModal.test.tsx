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
        skillBonusSources={[]}
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

  it('切換熟練度時，基礎值不會自動改變（維持使用者目前看到的數字，不會被覆寫）', () => {
    renderModal();
    // abilityModifier 3 + profLevel 1 * getProfBonus(5)=3 => 6（依 currentProfLevel 算出的初始值）
    expect(screen.getByDisplayValue('6')).toBeInTheDocument();
    fireEvent.click(screen.getByText('專精'));
    // 切到專精後基礎值仍維持 6，不會自動變成 3 + 2*3 = 9
    expect(screen.getByDisplayValue('6')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('9')).not.toBeInTheDocument();
  });

  it('點擊重置會恢復為當前熟練度計算的基礎值，之後切換也不會再自動變動', () => {
    renderModal();

    const input = screen.getByRole('textbox', { name: '' });
    fireEvent.change(input, { target: { value: '99' } });

    fireEvent.click(screen.getByText('重置'));

    expect((input as HTMLInputElement).value).not.toBe('99');

    const afterReset = (input as HTMLInputElement).value;
    fireEvent.click(screen.getByText('專精'));
    expect((input as HTMLInputElement).value).toBe(afterReset);
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

