import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AcquireQuantityModal } from '../../components/AcquireQuantityModal';

describe('AcquireQuantityModal', () => {
  it('關閉時不渲染', () => {
    render(
      <AcquireQuantityModal
        isOpen={false}
        itemName="古龍的血"
        isMaterial
        gatherMultiplier={4}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.queryByLabelText('數量')).not.toBeInTheDocument();
  });

  it('顯示物品名稱與數量欄位，預設數量為 1', () => {
    render(
      <AcquireQuantityModal
        isOpen
        itemName="古龍的血"
        isMaterial
        gatherMultiplier={4}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText(/古龍的血/)).toBeInTheDocument();
    expect(screen.getByLabelText('數量')).toHaveValue('1');
  });

  it('isMaterial 為 true 且倍數大於 1 時顯示套用組織倍數開關', () => {
    render(
      <AcquireQuantityModal
        isOpen
        itemName="古龍的血"
        isMaterial
        gatherMultiplier={4}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText(/套用組織倍數 ×4/)).toBeInTheDocument();
  });

  it('isMaterial 為 false 時即使有倍數也不顯示套用開關（非 MH素材不吃倍數）', () => {
    render(
      <AcquireQuantityModal
        isOpen
        itemName="治療藥水"
        isMaterial={false}
        gatherMultiplier={4}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.queryByText(/套用組織倍數/)).not.toBeInTheDocument();
  });

  it('點確定時，套用倍數後的最終數量傳給 onConfirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <AcquireQuantityModal
        isOpen
        itemName="古龍的血"
        isMaterial
        gatherMultiplier={4}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );
    fireEvent.change(screen.getByLabelText('數量'), { target: { value: '2' } });
    fireEvent.click(screen.getByText('確定'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(8);
    });
  });

  it('關掉套用開關後，確定送出的數量不乘倍數', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <AcquireQuantityModal
        isOpen
        itemName="古龍的血"
        isMaterial
        gatherMultiplier={4}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );
    fireEvent.change(screen.getByLabelText('數量'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /套用組織倍數/ }));
    fireEvent.click(screen.getByText('確定'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(3);
    });
  });

  it('點取消呼叫 onCancel，不呼叫 onConfirm', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <AcquireQuantityModal
        isOpen
        itemName="古龍的血"
        isMaterial
        gatherMultiplier={4}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
    fireEvent.click(screen.getByText('取消'));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
