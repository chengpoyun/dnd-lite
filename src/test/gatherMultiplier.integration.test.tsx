import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddPersonalItemModal } from '../../components/AddPersonalItemModal';

/**
 * 手動新增 MH素材 時套用組織倍數。
 *
 * 只有 MH素材 會顯示數量欄位與倍數開關；開關預設勾選（手動新增的素材多半也是
 * 採集來的），關掉就照輸入的數字加——用在隊友分素材那種情況。
 */
describe('AddPersonalItemModal - 組織倍數', () => {
  const onSubmit = vi.fn();

  const renderModal = (gatherMultiplier = 4, initialCategory: 'MH素材' | '藥水' = 'MH素材') =>
    render(
      <AddPersonalItemModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
        initialCategory={initialCategory}
        gatherMultiplier={gatherMultiplier}
      />
    );

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit.mockResolvedValue(undefined);
  });

  it('MH素材 才顯示數量欄位與倍數開關', () => {
    renderModal(4, 'MH素材');
    expect(screen.getByLabelText('數量')).toBeInTheDocument();
    expect(screen.getByText(/套用組織倍數 ×4/)).toBeInTheDocument();
  });

  it('其他類別不顯示數量與倍數（維持原本行為）', () => {
    renderModal(4, '藥水');
    expect(screen.queryByLabelText('數量')).not.toBeInTheDocument();
    expect(screen.queryByText(/套用組織倍數/)).not.toBeInTheDocument();
  });

  it('倍數為 1 時不顯示開關（沒加入組織就不用打擾使用者）', () => {
    renderModal(1, 'MH素材');
    expect(screen.getByLabelText('數量')).toBeInTheDocument();
    expect(screen.queryByText(/套用組織倍數/)).not.toBeInTheDocument();
  });

  it('開關預設勾選，送出時數量要乘上倍數', async () => {
    renderModal(4, 'MH素材');

    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '蜂蜜' } });
    fireEvent.change(screen.getByLabelText('數量'), { target: { value: '2' } });
    expect(screen.getByText(/實得/).textContent).toContain('8');

    fireEvent.click(screen.getByText('新增'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: '蜂蜜', quantity: 8 }));
    });
  });

  it('關掉開關後照數字加，不乘倍數', async () => {
    renderModal(4, 'MH素材');

    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '蜂蜜' } });
    fireEvent.change(screen.getByLabelText('數量'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /套用組織倍數/ }));

    fireEvent.click(screen.getByText('新增'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ quantity: 3 }));
    });
  });

  it('數量留空或非法時當作 1', async () => {
    renderModal(4, 'MH素材');

    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '蜂蜜' } });
    fireEvent.change(screen.getByLabelText('數量'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByText('新增'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ quantity: 4 }));
    });
  });
});
