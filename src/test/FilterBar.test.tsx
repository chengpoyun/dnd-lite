/**
 * FilterBar 共用篩選列核心測試
 * 驗收：選項渲染、選中狀態、點擊呼叫 onSelect
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FilterBar } from '../../components/ui/FilterBar';

describe('FilterBar', () => {
  const options = [
    { label: '全部', value: 'all' },
    { label: '職業', value: '職業' },
    { label: '種族', value: '種族' },
  ];
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應渲染所有選項', () => {
    render(
      <FilterBar options={options} selectedValue="all" onSelect={onSelect} />
    );
    expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '職業' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '種族' })).toBeInTheDocument();
  });

  it('點擊選項時應呼叫 onSelect 並傳入該 value', () => {
    render(
      <FilterBar options={options} selectedValue="all" onSelect={onSelect} />
    );
    fireEvent.click(screen.getByRole('button', { name: '職業' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('職業');

    fireEvent.click(screen.getByRole('button', { name: '種族' }));
    expect(onSelect).toHaveBeenCalledWith('種族');
  });

  it('selectedValue 對應的按鈕應有選中樣式（amber）', () => {
    const { rerender } = render(
      <FilterBar options={options} selectedValue="all" onSelect={onSelect} />
    );
    const allBtn = screen.getByRole('button', { name: '全部' });
    expect(allBtn.className).toMatch(/amber-600/);

    rerender(
      <FilterBar options={options} selectedValue="職業" onSelect={onSelect} />
    );
    const jobBtn = screen.getByRole('button', { name: '職業' });
    expect(jobBtn.className).toMatch(/amber-600/);
    expect(screen.getByRole('button', { name: '全部' }).className).toMatch(/slate-800/);
  });
});
