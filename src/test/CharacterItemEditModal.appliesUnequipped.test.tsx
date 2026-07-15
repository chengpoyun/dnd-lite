/**
 * CharacterItemEditModal - 「影響角色數值」提示文案依類別區分，
 * 裝備類別另外提供「此物品無須裝備也有效果」子選項
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterItemEditModal } from '../../components/CharacterItemEditModal';
import type { CharacterItem } from '../../services/itemService';

const equipmentItem: CharacterItem = {
  id: 'ci-eq-1',
  character_id: 'c1',
  item_id: null,
  quantity: 1,
  is_magic: false,
  name_override: '護身符',
  description_override: null,
  category_override: '裝備',
  equipment_kind_override: 'neck',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  item: null,
} as any;

const miscItem: CharacterItem = {
  id: 'ci-misc-1',
  character_id: 'c1',
  item_id: null,
  quantity: 1,
  is_magic: false,
  name_override: '幸運符',
  description_override: null,
  category_override: '雜項',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  item: null,
} as any;

describe('CharacterItemEditModal - applies_unequipped 文案與子選項', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('類別為裝備時，提示文字為「此物品會影響角色數值（需裝備）」', () => {
    render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={equipmentItem} onSubmit={onSubmit} />
    );
    expect(screen.getByText('此物品會影響角色數值（需裝備）')).toBeInTheDocument();
  });

  it('類別為雜項時，提示文字為「此物品會直接影響角色數值，無須裝備」', () => {
    render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={miscItem} onSubmit={onSubmit} />
    );
    expect(screen.getByText('此物品會直接影響角色數值，無須裝備')).toBeInTheDocument();
  });

  it('裝備類別勾選影響數值後，才顯示「此物品無須裝備也有效果」子選項', () => {
    render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={equipmentItem} onSubmit={onSubmit} />
    );
    expect(screen.queryByText('此物品無須裝備也有效果')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('此物品會影響角色數值（需裝備）'));
    expect(screen.getByText('此物品無須裝備也有效果')).toBeInTheDocument();
  });

  it('非裝備類別即使勾選影響數值，也不顯示「此物品無須裝備也有效果」子選項', () => {
    render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={miscItem} onSubmit={onSubmit} />
    );
    fireEvent.click(screen.getByText('此物品會直接影響角色數值，無須裝備'));
    expect(screen.queryByText('此物品無須裝備也有效果')).not.toBeInTheDocument();
  });

  it('裝備類別勾選子選項並儲存，updates.applies_unequipped 為 true', async () => {
    render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={equipmentItem} onSubmit={onSubmit} />
    );
    fireEvent.click(screen.getByText('此物品會影響角色數值（需裝備）'));
    fireEvent.click(screen.getByText('此物品無須裝備也有效果'));
    fireEvent.click(screen.getByText('儲存修改'));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const updates = onSubmit.mock.calls[0][1];
    expect(updates.applies_unequipped).toBe(true);
  });

  it('已有 applies_unequipped=true 的物品開啟時，子選項預設為勾選狀態', () => {
    const itemWithFlag: CharacterItem = { ...equipmentItem, applies_unequipped: true } as any;
    render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={itemWithFlag} onSubmit={onSubmit} />
    );
    fireEvent.click(screen.getByText('此物品會影響角色數值（需裝備）'));
    const checkbox = screen.getByText('此物品無須裝備也有效果').closest('label')?.querySelector('input');
    expect(checkbox).toBeChecked();
  });
});
