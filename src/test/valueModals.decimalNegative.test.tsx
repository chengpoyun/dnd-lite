/**
 * 經驗值 / 修整期 / 名聲 / 金幣 四個彈窗：支援小數與負數輸入
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ExpModal from '../../components/ExpModal';
import DowntimeModal from '../../components/DowntimeModal';
import RenownModal from '../../components/RenownModal';
import CurrencyModal from '../../components/CurrencyModal';

describe('ExpModal - 小數與負數', () => {
  it('可輸入負數並套用（"-500" 為相對扣減，100-500=-400）', () => {
    const onApply = vi.fn();
    render(
      <ExpModal isOpen value="-500" onChange={() => {}} placeholder="100" onApply={onApply} onClose={() => {}} />
    );
    fireEvent.click(screen.getByText('套用'));
    expect(onApply).toHaveBeenCalledWith(-400);
  });

  it('可輸入小數並保留完整精度', () => {
    const onApply = vi.fn();
    render(
      <ExpModal isOpen value="100.25" onChange={() => {}} placeholder="6500" onApply={onApply} onClose={() => {}} />
    );
    fireEvent.click(screen.getByText('套用'));
    expect(onApply).toHaveBeenCalledWith(100.25);
  });
});

describe('DowntimeModal - 小數與負數', () => {
  it('可輸入負數並套用', () => {
    const onApply = vi.fn();
    render(
      <DowntimeModal isOpen value="-3" onChange={() => {}} currentDowntime={5} onApply={onApply} onClose={() => {}} />
    );
    fireEvent.click(screen.getByText('套用'));
    expect(onApply).toHaveBeenCalledWith(2); // 5 - 3
  });

  it('可輸入小數並保留完整精度', () => {
    const onApply = vi.fn();
    render(
      <DowntimeModal isOpen value="2.5" onChange={() => {}} currentDowntime={5} onApply={onApply} onClose={() => {}} />
    );
    fireEvent.click(screen.getByText('套用'));
    expect(onApply).toHaveBeenCalledWith(2.5);
  });
});

describe('RenownModal - 小數與負數', () => {
  const baseProps = {
    isOpen: true,
    onClose: () => {},
    onChangeUsed: () => {},
    onChangeTotal: () => {},
    currentUsed: 2,
    currentTotal: 8,
  };

  it('使用/累計皆可輸入負數並套用', async () => {
    const onApply = vi.fn();
    render(
      <RenownModal {...baseProps} usedValue="-1" totalValue="-8" onApply={onApply} />
    );
    fireEvent.click(screen.getByText('儲存'));
    expect(onApply).toHaveBeenCalledWith(1, 0); // 2-1=1, 8-8=0（減到0不算負，換一個真正變負的案例見下）
  });

  it('累計可輸入小數並保留完整精度', () => {
    const onApply = vi.fn();
    render(
      <RenownModal {...baseProps} usedValue="2" totalValue="8.5" onApply={onApply} />
    );
    fireEvent.click(screen.getByText('儲存'));
    expect(onApply).toHaveBeenCalledWith(2, 8.5);
  });

  it('使用可以變成負數（超額使用，"-20" 為相對扣減，2-20=-18）', () => {
    const onApply = vi.fn();
    render(
      <RenownModal {...baseProps} usedValue="-20" totalValue="8" onApply={onApply} />
    );
    fireEvent.click(screen.getByText('儲存'));
    expect(onApply).toHaveBeenCalledWith(-18, 8);
  });
});

describe('CurrencyModal - 小數與負數', () => {
  it('可輸入負數並套用（不再被 gpPreview>=0 擋掉）', () => {
    const onApply = vi.fn();
    render(
      <CurrencyModal isOpen value="-500" onChange={() => {}} currentGp={150} onApply={onApply} onClose={() => {}} />
    );
    fireEvent.click(screen.getByText('套用'));
    expect(onApply).toHaveBeenCalledWith(-350); // 150-500
  });

  it('可輸入不限位數的小數並保留完整精度', () => {
    const onApply = vi.fn();
    render(
      <CurrencyModal isOpen value="100.12345" onChange={() => {}} currentGp={150} onApply={onApply} onClose={() => {}} />
    );
    fireEvent.click(screen.getByText('套用'));
    expect(onApply).toHaveBeenCalledWith(100.12345);
  });
});
