/**
 * ConfirmDeleteModal 元件測試
 * 驗證標題、訊息與取消／確認按鈕行為
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';

describe('ConfirmDeleteModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('關閉時不渲染內容', () => {
    render(
      <ConfirmDeleteModal isOpen={false} onConfirm={mockOnConfirm} />
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('開啟時顯示預設標題與取消、確認按鈕', () => {
    render(
      <ConfirmDeleteModal isOpen={true} onConfirm={mockOnConfirm} />
    );
    expect(screen.getByRole('heading', { name: /確認刪除角色/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '確認刪除' })).toBeInTheDocument();
  });

  it('點擊取消會呼叫 onCancel', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDeleteModal isOpen={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
    );
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('點擊取消時若無 onCancel 會呼叫 onClose', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDeleteModal isOpen={true} onConfirm={mockOnConfirm} onClose={onClose} />
    );
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('點擊確認刪除會呼叫 onConfirm', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDeleteModal isOpen={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
    );
    await user.click(screen.getByRole('button', { name: '確認刪除' }));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('可自訂標題與確認按鈕文字', () => {
    render(
      <ConfirmDeleteModal
        isOpen={true}
        onConfirm={mockOnConfirm}
        title="刪除能力"
        confirmText="確定刪除"
      />
    );
    expect(screen.getByRole('heading', { name: '刪除能力' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '確定刪除' })).toBeInTheDocument();
  });

  it('有 characterName 時顯示角色名與對應說明', () => {
    render(
      <ConfirmDeleteModal
        isOpen={true}
        onConfirm={mockOnConfirm}
        characterName="測試角色"
      />
    );
    expect(screen.getByText(/確定要刪除角色/)).toBeInTheDocument();
    expect(screen.getByText('測試角色')).toBeInTheDocument();
  });

  it('有 itemType 與 itemName 時顯示項目刪除說明', () => {
    render(
      <ConfirmDeleteModal
        isOpen={true}
        onConfirm={mockOnConfirm}
        itemType="能力"
        itemName="健壯"
      />
    );
    expect(screen.getByText(/確定要刪除能力/)).toBeInTheDocument();
    expect(screen.getByText('健壯')).toBeInTheDocument();
  });
});
