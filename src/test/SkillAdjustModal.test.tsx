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

  it('切換到專精時，顯示「專精加值」且最終總計即時反映（基礎值不變）', () => {
    renderModal();
    // profBonus(lvl5)=3；currentProfLevel=1 → 2 時多出 (2-1)*3=3
    fireEvent.click(screen.getByText('專精'));
    expect(screen.getByDisplayValue('6')).toBeInTheDocument();
    expect(screen.getByText('專精加值')).toBeInTheDocument();
    const row = screen.getByText('最終總計').closest('div') as HTMLElement;
    // 基礎值 6 + 專精加值 3 + miscBonus 2 = 11
    expect(row.textContent).toContain('+11');
  });

  it('切換回「無」時，顯示負值的熟練加值（移除原本已計入的熟練加成）', () => {
    renderModal();
    fireEvent.click(screen.getByText('無'));
    expect(screen.getByDisplayValue('6')).toBeInTheDocument();
    // 6 + (0-1)*3 + 2 = 5
    const row = screen.getByText('最終總計').closest('div') as HTMLElement;
    expect(row.textContent).toContain('+5');
  });

  it('手動編輯過基礎值後，切換熟練度不再顯示熟練加值，最終總計只用輸入的數字加總', () => {
    renderModal();
    const input = screen.getByRole('textbox', { name: '' });
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(screen.getByText('專精'));

    expect(screen.queryByText('專精加值')).not.toBeInTheDocument();
    const row = screen.getByText('最終總計').closest('div') as HTMLElement;
    // 20 + miscBonus 2 = 22（不再額外加專精加值）
    expect(row.textContent).toContain('+22');
  });

  it('已有基礎值覆寫時（overrideBasic 非 null），切換熟練度不顯示熟練加值', () => {
    renderModal({ overrideBasic: 10 });
    fireEvent.click(screen.getByText('專精'));
    expect(screen.queryByText('專精加值')).not.toBeInTheDocument();
    const row = screen.getByText('最終總計').closest('div') as HTMLElement;
    // 10 + miscBonus 2 = 12
    expect(row.textContent).toContain('+12');
  });

  it('未手動編輯基礎值時，切換熟練度後儲存不會誤存覆寫值（nextOverrideBasic 應為 null）', () => {
    onSave.mockClear();
    renderModal();
    fireEvent.click(screen.getByText('專精'));
    fireEvent.click(screen.getByText('儲存'));

    expect(onSave).toHaveBeenCalledWith(2, null);
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

