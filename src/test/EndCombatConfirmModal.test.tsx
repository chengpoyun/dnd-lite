import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EndCombatConfirmModal from '../../components/EndCombatConfirmModal';

describe('EndCombatConfirmModal', () => {
  it('未開啟時不渲染內容', () => {
    render(<EndCombatConfirmModal isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText('結束戰鬥', { selector: 'h2' })).not.toBeInTheDocument();
  });

  it('開啟時點擊「結束戰鬥」會呼叫 onConfirm', () => {
    const onConfirm = vi.fn();
    render(<EndCombatConfirmModal isOpen onClose={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('結束戰鬥', { selector: 'button' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('點擊取消會呼叫 onClose，不呼叫 onConfirm', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<EndCombatConfirmModal isOpen onClose={onClose} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('取消'));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
