import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddTemporaryConditionModal } from '../../components/AddTemporaryConditionModal';

describe('AddTemporaryConditionModal', () => {
  it('關閉時不渲染', () => {
    render(<AddTemporaryConditionModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByPlaceholderText('例：中毒')).not.toBeInTheDocument();
  });

  it('預設不顯示 StatBonusEditor，勾選「影響角色數值」後才顯示', () => {
    render(<AddTemporaryConditionModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByText(/加值/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/影響角色數值/));
    expect(screen.getByText(/加值/)).toBeInTheDocument();
  });

  it('名稱為空時提交不呼叫 onSubmit', () => {
    const onSubmit = vi.fn();
    render(<AddTemporaryConditionModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('新增'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('未勾選影響角色數值時，提交的 stat_bonuses 為空物件、affects_stats 為 false', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<AddTemporaryConditionModal isOpen onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('例：中毒'), { target: { value: '中毒' } });
    fireEvent.change(screen.getByPlaceholderText('例：1 分鐘'), { target: { value: '1 分鐘' } });
    fireEvent.change(screen.getByPlaceholderText('描述臨時狀態的效果...'), { target: { value: '每回合開始受到 1d4 毒素傷害' } });
    fireEvent.click(screen.getByText('新增'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: '中毒',
        duration: '1 分鐘',
        description: '每回合開始受到 1d4 毒素傷害',
        affects_stats: false,
        stat_bonuses: {},
      });
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('勾選影響角色數值後，提交會帶上 affects_stats: true', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddTemporaryConditionModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('例：中毒'), { target: { value: '虛弱' } });
    fireEvent.click(screen.getByLabelText(/影響角色數值/));
    fireEvent.click(screen.getByText('新增'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: '虛弱', affects_stats: true })
      );
    });
  });

  it('點擊取消呼叫 onClose，不呼叫 onSubmit', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<AddTemporaryConditionModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('取消'));
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
