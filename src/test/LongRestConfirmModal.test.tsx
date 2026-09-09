import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LongRestConfirmModal from '../../components/LongRestConfirmModal';

describe('LongRestConfirmModal', () => {
  it('未開啟時不渲染內容', () => {
    render(<LongRestConfirmModal isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText('確定要長休？')).not.toBeInTheDocument();
  });

  it('開啟時點擊「確認長休」會呼叫 onConfirm', () => {
    const onConfirm = vi.fn();
    render(<LongRestConfirmModal isOpen onClose={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('確認長休'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('取消按鈕文字為「返回」，點擊會呼叫 onClose 不呼叫 onConfirm', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<LongRestConfirmModal isOpen onClose={onClose} onConfirm={onConfirm} />);
    expect(screen.queryByText('取消')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('返回'));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
