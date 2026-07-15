/**
 * AddPersonalItemModal - 「影響角色數值」提示文案依類別區分，
 * 裝備類別另外提供「此物品無須裝備也有效果」子選項
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddPersonalItemModal } from '../../components/AddPersonalItemModal';

describe('AddPersonalItemModal - applies_unequipped 文案與子選項', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('類別為裝備時，提示文字為「此物品會影響角色數值（需裝備）」', () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    // 預設類別就是「裝備」
    expect(screen.getByText('此物品會影響角色數值（需裝備）')).toBeInTheDocument();
  });

  it('類別為藥水時，提示文字為「此物品會直接影響角色數值，無須裝備」', () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByDisplayValue('裝備'), { target: { value: '藥水' } });
    expect(screen.getByText('此物品會直接影響角色數值，無須裝備')).toBeInTheDocument();
  });

  it('類別為雜項時，提示文字為「此物品會直接影響角色數值，無須裝備」', () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByDisplayValue('裝備'), { target: { value: '雜項' } });
    expect(screen.getByText('此物品會直接影響角色數值，無須裝備')).toBeInTheDocument();
  });

  it('裝備類別勾選影響數值後，才顯示「此物品無須裝備也有效果」子選項', () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    expect(screen.queryByText('此物品無須裝備也有效果')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('此物品會影響角色數值（需裝備）'));
    expect(screen.getByText('此物品無須裝備也有效果')).toBeInTheDocument();
  });

  it('非裝備類別即使勾選影響數值，也不顯示「此物品無須裝備也有效果」子選項', () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByDisplayValue('裝備'), { target: { value: '雜項' } });
    fireEvent.click(screen.getByText('此物品會直接影響角色數值，無須裝備'));
    expect(screen.queryByText('此物品無須裝備也有效果')).not.toBeInTheDocument();
  });

  it('裝備類別勾選子選項並送出，data.applies_unequipped 為 true', async () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '護身符' } });
    fireEvent.click(screen.getByText('此物品會影響角色數值（需裝備）'));
    fireEvent.click(screen.getByText('此物品無須裝備也有效果'));
    fireEvent.click(screen.getByText('新增'));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const data = onSubmit.mock.calls[0][0];
    expect(data.applies_unequipped).toBe(true);
  });

  it('裝備類別勾選影響數值但不勾選子選項送出時，applies_unequipped 不為 true', async () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '護身符' } });
    fireEvent.click(screen.getByText('此物品會影響角色數值（需裝備）'));
    fireEvent.click(screen.getByText('新增'));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const data = onSubmit.mock.calls[0][0];
    expect(data.applies_unequipped).not.toBe(true);
  });

  it('取消勾選影響數值時，子選項一併重置隱藏', () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('此物品會影響角色數值（需裝備）'));
    fireEvent.click(screen.getByText('此物品無須裝備也有效果'));
    fireEvent.click(screen.getByText('此物品會影響角色數值（需裝備）'));
    expect(screen.queryByText('此物品無須裝備也有效果')).not.toBeInTheDocument();
  });
});
