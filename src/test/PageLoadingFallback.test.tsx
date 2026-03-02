import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageLoadingFallback } from '../../components/ui/PageLoadingFallback';

describe('PageLoadingFallback', () => {
  it('應顯示傳入的 message 與預設高度', () => {
    const message = '載入戰鬥檢視...';
    const { container } = render(<PageLoadingFallback message={message} />);
    expect(screen.getByText(message)).toBeInTheDocument();
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('h-64');
  });

  it('可覆寫高度 class', () => {
    const { container } = render(<PageLoadingFallback message="載入測試" heightClass="h-32" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('h-32');
  });
});
