import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PortentUseConfirmModal from '../../components/PortentUseConfirmModal';

describe('PortentUseConfirmModal', () => {
  it('未開啟時不渲染內容', () => {
    render(<PortentUseConfirmModal isOpen={false} dieValue={16} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText('確定使用預言骰？')).not.toBeInTheDocument();
  });

  it('開啟時顯示骰子數值，點擊確定使用會呼叫 onConfirm', () => {
    const onConfirm = vi.fn();
    render(<PortentUseConfirmModal isOpen={true} dieValue={16} onClose={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.getByText('確定使用預言骰？')).toBeInTheDocument();
    expect(screen.getByText(/16/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('確定使用'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('點擊取消會呼叫 onClose，不呼叫 onConfirm', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<PortentUseConfirmModal isOpen={true} dieValue={7} onClose={onClose} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('取消'));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
