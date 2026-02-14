/**
 * ModalSaveButton - 儲存按鈕 loading 狀態（spinner + 儲存中…）
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalSaveButton } from '../../components/ui/ModalSaveButton';

describe('ModalSaveButton', () => {
  it('loading 為 true 時按鈕 disabled，內容為 spinner + 儲存中…', () => {
    const onClick = vi.fn();
    render(
      <ModalSaveButton loading onClick={onClick}>
        儲存
      </ModalSaveButton>
    );
    const btn = screen.getByRole('button', { name: /儲存中/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('儲存中…');
    expect(btn.querySelector('[class*="animate-spin"]')).toBeInTheDocument();
    userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading 為 false 時按鈕可點，內容為 children', async () => {
    const onClick = vi.fn();
    render(
      <ModalSaveButton loading={false} onClick={onClick}>
        儲存修改
      </ModalSaveButton>
    );
    const btn = screen.getByRole('button', { name: '儲存修改' });
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveTextContent('儲存修改');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
