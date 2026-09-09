import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillAdjustModal } from '../../components/SkillAdjustModal';

/**
 * 「基礎值」永遠只代表屬性調整值本身（本測試預設 abilityModifier=3），
 * 不論目前熟練度為何、也不論是第一次開啟還是重新開啟；熟練/專精加值
 * （profLevel * profBonus，本測試 characterLevel=5 → profBonus=3）一律
 * 另外顯示成獨立的加值來源列，跟著目前選擇的熟練度即時反映。
 */
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

  it('開啟時基礎值一律只顯示屬性調整值本身，熟練加值另外顯示（不論目前已存的熟練度為何）', () => {
    renderModal({ currentProfLevel: 1 });
    // 基礎值 = abilityModifier(3)，不因目前已是熟練(1)而把 profBonus(3) 併進去
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByText('熟練加值')).toBeInTheDocument();
    const row = screen.getByText('最終總計').closest('div') as HTMLElement;
    // 3 + 1*3 + miscBonus(2) = 8
    expect(row.textContent).toContain('+8');
  });

  it('重新開啟時若目前熟練度已是專精，基礎值仍只顯示屬性調整值，專精加值正確顯示（不會像「基礎值」被烘進 10 那樣跑掉）', () => {
    renderModal({ currentProfLevel: 2 });
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByText('專精加值')).toBeInTheDocument();
    const row = screen.getByText('最終總計').closest('div') as HTMLElement;
    // 3 + 2*3 + miscBonus(2) = 11
    expect(row.textContent).toContain('+11');
  });

  it('切換熟練度時，基礎值不會自動改變，加值來源列表與最終總計即時反映新的熟練度', () => {
    renderModal();
    fireEvent.click(screen.getByText('專精'));
    // 基礎值仍是 3，不會變成 3+2*3=9
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByText('專精加值')).toBeInTheDocument();
    const row = screen.getByText('最終總計').closest('div') as HTMLElement;
    // 3 + 2*3 + 2 = 11
    expect(row.textContent).toContain('+11');
  });

  it('切換為「無」時，不顯示熟練加值，最終總計只剩基礎值與其他加值', () => {
    renderModal();
    fireEvent.click(screen.getByText('無'));
    expect(screen.queryByText('熟練加值')).not.toBeInTheDocument();
    expect(screen.queryByText('專精加值')).not.toBeInTheDocument();
    const row = screen.getByText('最終總計').closest('div') as HTMLElement;
    // 3 + 0 + 2 = 5
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

  it('已有基礎值覆寫時（overrideBasic 非 null），不顯示熟練加值，基礎值直接顯示覆寫值', () => {
    renderModal({ overrideBasic: 10 });
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
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

  it('點擊重置會恢復為屬性調整值本身，並清除手動編輯狀態（之後切換會重新顯示熟練加值）', () => {
    renderModal();

    const input = screen.getByRole('textbox', { name: '' });
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.click(screen.getByText('重置'));

    expect((input as HTMLInputElement).value).toBe('3');

    fireEvent.click(screen.getByText('專精'));
    expect(screen.getByText('專精加值')).toBeInTheDocument();
  });

  it('點擊儲存時會帶入目前熟練度與對應的 overrideBasic', () => {
    onSave.mockClear();
    renderModal();

    const input = screen.getByRole('textbox', { name: '' });
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.click(screen.getByText('專精'));

    fireEvent.click(screen.getByText('儲存'));

    expect(onSave).toHaveBeenCalledWith(2, 10);
  });
});
