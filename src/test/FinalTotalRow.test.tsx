import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FinalTotalRow } from '../../components/ui/FinalTotalRow';

describe('FinalTotalRow', () => {
  it('沒有 suffix 時只顯示格式化後的數字', () => {
    render(<FinalTotalRow label="最終總計" value={8} />);
    expect(screen.getByText('+8')).toBeInTheDocument();
  });

  it('有 suffix 時接在數字後面顯示（供骰子加成合併字尾如 "+2d4" 使用）', () => {
    render(<FinalTotalRow label="最終總計" value={8} suffix="+2d4" />);
    expect(screen.getByText('+8+2d4')).toBeInTheDocument();
  });
});
