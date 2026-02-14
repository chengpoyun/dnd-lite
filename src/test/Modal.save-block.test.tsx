/**
 * Modal - 儲存中阻擋關閉（disableBackdropClose）
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../../components/ui/Modal';

describe('Modal - disableBackdropClose', () => {
  it('當 disableBackdropClose 未傳或 false 時，點擊 backdrop 會呼叫 onClose', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        <span>Content</span>
      </Modal>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
    const backdrop = screen.getByTestId('modal-backdrop');
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('當 disableBackdropClose 為 true 時，點擊 backdrop 不呼叫 onClose', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} disableBackdropClose>
        <span>Content</span>
      </Modal>
    );
    const backdrop = screen.getByTestId('modal-backdrop');
    await userEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });
});
