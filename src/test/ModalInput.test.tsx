/**
 * ModalInput 單元測試
 * 確保在 modal 內使用時不自動聚焦（傳入 autoFocus 仍不傳給 DOM，避免一開 modal 就彈鍵盤）
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ModalInput } from '../../components/ui/Modal';

describe('ModalInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('傳入 autoFocus={true} 時，渲染後 input 不應取得 focus（避免 modal 一開就彈鍵盤）', () => {
    const { container } = render(
      <ModalInput {...defaultProps} autoFocus />
    );
    const input = container.querySelector('input');
    expect(input).toBeInTheDocument();
    expect(document.activeElement).not.toBe(input);
  });
});
