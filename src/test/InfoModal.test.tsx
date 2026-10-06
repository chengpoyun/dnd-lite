import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoModal } from '../../components/ui/InfoModal';

describe('InfoModal', () => {
  it('關閉時不渲染', () => {
    render(<InfoModal isOpen={false} message="訊息" onClose={vi.fn()} />);
    expect(screen.queryByText('訊息')).not.toBeInTheDocument();
  });

  it('顯示標題與訊息，按確定呼叫 onClose', () => {
    const onClose = vi.fn();
    render(<InfoModal isOpen title="長休恢復" message="訊息" onClose={onClose} />);
    expect(screen.getByText('長休恢復')).toBeInTheDocument();
    fireEvent.click(screen.getByText('確定'));
    expect(onClose).toHaveBeenCalled();
  });

  it('多行訊息保留換行（whitespace-pre-line），長文字可斷行（break-words），避免被切斷或撐破版面', () => {
    render(<InfoModal isOpen message={'第一行\n第二行'} onClose={vi.fn()} />);
    const p = screen.getByText(/第一行/);
    expect(p).toHaveClass('whitespace-pre-line');
    expect(p).toHaveClass('break-words');
  });
});
