import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddPersonalAbilityModal } from '../../components/AddPersonalAbilityModal';

describe('AddPersonalAbilityModal', () => {
  it('預填名稱、預設來源「職業」與恢復類型「常駐」', () => {
    render(
      <AddPersonalAbilityModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} initialName="靈巧動作" />
    );
    expect(screen.getByPlaceholderText('輸入能力名稱')).toHaveValue('靈巧動作');
    expect(screen.getByText('職業', { selector: 'option' }).closest('select')).toHaveValue('職業');
  });

  it('常駐時不顯示最大使用次數欄位', () => {
    render(<AddPersonalAbilityModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByText(/最大使用次數/)).not.toBeInTheDocument();
  });

  it('切換恢復類型為非常駐時顯示最大使用次數欄位', () => {
    render(<AddPersonalAbilityModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);
    const selects = screen.getAllByRole('combobox');
    const recoverySelect = selects[1];
    fireEvent.change(recoverySelect, { target: { value: '短休' } });
    expect(screen.getByText(/最大使用次數/)).toBeInTheDocument();
  });

  it('提交時把表單資料傳給 onSubmit，name_en 固定為空字串', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<AddPersonalAbilityModal isOpen onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('輸入能力名稱'), { target: { value: '測試能力' } });
    fireEvent.change(screen.getByPlaceholderText('輸入能力描述'), { target: { value: '測試描述' } });
    fireEvent.click(screen.getByText('新增'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: '測試能力',
        name_en: '',
        source: '職業',
        recovery_type: '常駐',
        description: '測試描述',
        max_uses: 0,
      });
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('點擊取消呼叫 onClose，不呼叫 onSubmit', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<AddPersonalAbilityModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('取消'));
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
