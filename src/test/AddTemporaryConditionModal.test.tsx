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

  describe('編輯模式（傳入 editingCondition）', () => {
    const editingCondition = {
      id: 'tc-1',
      character_id: 'char-1',
      name: '虛弱',
      duration: '1 分鐘',
      description: '力量減弱',
      affects_stats: true,
      stat_bonuses: { abilityModifiers: { str: -2 } },
      created_at: '',
      updated_at: '',
    };

    it('標題顯示「編輯臨時狀態」、按鈕顯示「儲存」，且欄位預先帶入既有資料', () => {
      render(
        <AddTemporaryConditionModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} editingCondition={editingCondition} />
      );

      expect(screen.getByText('編輯臨時狀態')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('例：中毒')).toHaveValue('虛弱');
      expect(screen.getByPlaceholderText('例：1 分鐘')).toHaveValue('1 分鐘');
      expect(screen.getByPlaceholderText('描述臨時狀態的效果...')).toHaveValue('力量減弱');
      expect(screen.getByLabelText(/影響角色數值/)).toBeChecked();
      expect(screen.getByText('儲存')).toBeInTheDocument();
    });

    it('編輯後儲存，onSubmit 帶上修改後的資料', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(
        <AddTemporaryConditionModal
          isOpen
          onClose={onClose}
          onSubmit={onSubmit}
          editingCondition={editingCondition}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('例：1 分鐘'), { target: { value: '2 分鐘' } });
      fireEvent.click(screen.getByText('儲存'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: '虛弱',
          duration: '2 分鐘',
          description: '力量減弱',
          affects_stats: true,
          stat_bonuses: { abilityModifiers: { str: -2 } },
        });
      });
      await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
  });
});
