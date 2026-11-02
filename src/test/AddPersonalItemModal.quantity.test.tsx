/**
 * AddPersonalItemModal - 數量只對「當次新增」有效
 * 數量欄位只在 MH素材 顯示；調整過的數量不能帶到下一次新增，也不能在改選其他類別時被偷偷帶出去
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddPersonalItemModal } from '../../components/AddPersonalItemModal';

describe('AddPersonalItemModal - 數量只對當次新增有效', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const selectCategory = (category: string) =>
    fireEvent.change(screen.getByText('類別 *').parentElement!.querySelector('select') as HTMLSelectElement, { target: { value: category } });

  it('MH素材 數量調成 5 送出後，下一次再選 MH素材 時數量回到預設 1', async () => {
    const { rerender } = render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '雷狼素材' } });
    selectCategory('MH素材');
    fireEvent.change(screen.getByLabelText('數量'), { target: { value: '5' } });
    fireEvent.click(screen.getByText('新增'));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].quantity).toBe(5);

    // 送出後呼叫端會關閉再重新開啟彈窗
    rerender(<AddPersonalItemModal isOpen={false} onClose={onClose} onSubmit={onSubmit} />);
    rerender(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    selectCategory('MH素材');
    expect((screen.getByLabelText('數量') as HTMLInputElement).value).toBe('1');
  });

  it('套用組織倍數開關關掉後送出，下一次也回到預設（套用）', async () => {
    const { rerender } = render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} gatherMultiplier={2} />);
    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '雷狼素材' } });
    selectCategory('MH素材');
    fireEvent.click(screen.getByRole('checkbox', { name: /套用組織倍數/ }));
    fireEvent.click(screen.getByText('新增'));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    rerender(<AddPersonalItemModal isOpen={false} onClose={onClose} onSubmit={onSubmit} gatherMultiplier={2} />);
    rerender(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} gatherMultiplier={2} />);
    selectCategory('MH素材');
    expect(screen.getByRole('checkbox', { name: /套用組織倍數/ })).toBeChecked();
  });

  it('MH素材 數量調成 5 後改選藥水（沒有數量欄位）送出，數量固定為 1', async () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '治療藥水' } });
    selectCategory('MH素材');
    fireEvent.change(screen.getByLabelText('數量'), { target: { value: '5' } });
    selectCategory('藥水');
    expect(screen.queryByLabelText('數量')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('新增'));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].quantity).toBe(1);
  });
});
