import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PortentRerollModal from '../../components/PortentRerollModal';

describe('PortentRerollModal', () => {
  it('依 diceCount 顯示對應數量的輸入框與標籤', () => {
    render(<PortentRerollModal isOpen={true} diceCount={3} onSubmit={vi.fn()} />);
    expect(screen.getByText('骰1')).toBeInTheDocument();
    expect(screen.getByText('骰2')).toBeInTheDocument();
    expect(screen.getByText('骰3')).toBeInTheDocument();
  });

  it('尚未填完所有骰值時，套用按鈕為 disabled', () => {
    render(<PortentRerollModal isOpen={true} diceCount={2} onSubmit={vi.fn()} />);
    const applyButton = screen.getByText('套用');
    expect(applyButton).toBeDisabled();
  });

  it('填入超出 1~20 範圍的數值時，套用按鈕仍為 disabled', () => {
    render(<PortentRerollModal isOpen={true} diceCount={2} onSubmit={vi.fn()} />);
    const inputs = screen.getAllByPlaceholderText('1-20');
    fireEvent.change(inputs[0], { target: { value: '25' } });
    fireEvent.change(inputs[1], { target: { value: '10' } });
    expect(screen.getByText('套用')).toBeDisabled();
  });

  it('填入合法數值後，套用按鈕可點擊，onSubmit 收到解析後的整數陣列', () => {
    const onSubmit = vi.fn();
    render(<PortentRerollModal isOpen={true} diceCount={2} onSubmit={onSubmit} />);
    const inputs = screen.getAllByPlaceholderText('1-20');
    fireEvent.change(inputs[0], { target: { value: '12' } });
    fireEvent.change(inputs[1], { target: { value: '20' } });
    const applyButton = screen.getByText('套用');
    expect(applyButton).not.toBeDisabled();
    fireEvent.click(applyButton);
    expect(onSubmit).toHaveBeenCalledWith([12, 20]);
  });

  it('重新開啟時（diceCount 不變）應清空先前輸入', () => {
    const { rerender } = render(<PortentRerollModal isOpen={true} diceCount={2} onSubmit={vi.fn()} />);
    const inputs = screen.getAllByPlaceholderText('1-20');
    fireEvent.change(inputs[0], { target: { value: '12' } });
    fireEvent.change(inputs[1], { target: { value: '20' } });

    rerender(<PortentRerollModal isOpen={false} diceCount={2} onSubmit={vi.fn()} />);
    rerender(<PortentRerollModal isOpen={true} diceCount={2} onSubmit={vi.fn()} />);

    const reopenedInputs = screen.getAllByPlaceholderText('1-20') as HTMLInputElement[];
    expect(reopenedInputs[0].value).toBe('');
    expect(reopenedInputs[1].value).toBe('');
  });
});
