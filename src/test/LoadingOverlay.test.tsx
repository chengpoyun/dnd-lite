/**
 * LoadingOverlay - Modal 內儲存中蓋版（spinner + 文案）
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';

describe('LoadingOverlay', () => {
  it('visible 為 true 時渲染 overlay，含 spinner 與預設文案', () => {
    render(<LoadingOverlay visible />);
    expect(screen.getByText('儲存中…')).toBeInTheDocument();
    expect(document.querySelector('[class*="animate-spin"]')).toBeInTheDocument();
  });

  it('visible 為 true 時可傳入自訂 text', () => {
    render(<LoadingOverlay visible text="更新中…" />);
    expect(screen.getByText('更新中…')).toBeInTheDocument();
  });

  it('visible 為 false 時不渲染內容', () => {
    const { container } = render(<LoadingOverlay visible={false} />);
    expect(container.firstChild).toBeNull();
  });
});
