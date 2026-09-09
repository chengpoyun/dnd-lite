import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmActionModal from '../../components/ui/ConfirmActionModal';

describe('ConfirmActionModal', () => {
  it('未開啟時不渲染內容', () => {
    render(
      <ConfirmActionModal
        isOpen={false}
        title="確定？"
        message="這是說明文字"
        confirmLabel="確定"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByText('確定？')).not.toBeInTheDocument();
  });

  it('顯示標題、說明文字與按鈕文字；點擊確認按鈕會呼叫 onConfirm', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmActionModal
        isOpen
        title="結束戰鬥"
        message="確定要結束當前戰鬥嗎？"
        confirmLabel="結束戰鬥"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByText('結束戰鬥', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText('確定要結束當前戰鬥嗎？')).toBeInTheDocument();
    fireEvent.click(screen.getByText('結束戰鬥', { selector: 'button' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('點擊取消按鈕會呼叫 onClose，不呼叫 onConfirm；預設取消文字為「取消」', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmActionModal
        isOpen
        title="標題"
        message="說明"
        confirmLabel="確認"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByText('取消'));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('可自訂取消按鈕文字（如「返回」）', () => {
    render(
      <ConfirmActionModal
        isOpen
        title="標題"
        message="說明"
        cancelLabel="返回"
        confirmLabel="確認"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText('返回')).toBeInTheDocument();
    expect(screen.queryByText('取消')).not.toBeInTheDocument();
  });

  it('可傳入 confirmClassName 自訂確認按鈕樣式（如特殊顏色）', () => {
    render(
      <ConfirmActionModal
        isOpen
        title="標題"
        message="說明"
        confirmLabel="確定使用"
        confirmClassName="!bg-purple-600 hover:!bg-purple-500"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText('確定使用').className).toContain('!bg-purple-600');
  });
});
