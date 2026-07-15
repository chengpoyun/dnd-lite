/**
 * 物品編輯畫面的「裝備類型」下拉選單應包含新的「飾品」選項
 * （AddPersonalItemModal / CharacterItemEditModal 皆直接讀 EQUIPMENT_KINDS，理論上不需額外改動）
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddPersonalItemModal } from '../../components/AddPersonalItemModal';
import { CharacterItemEditModal } from '../../components/CharacterItemEditModal';
import type { CharacterItem } from '../../services/itemService';

describe('裝備類型下拉選單 - 飾品選項', () => {
  it('AddPersonalItemModal：選擇類別為「裝備」後，裝備類型下拉選單包含「飾品」', () => {
    render(
      <AddPersonalItemModal isOpen onClose={vi.fn()} onSubmit={vi.fn().mockResolvedValue(undefined)} />
    );
    const select = screen.getByDisplayValue('臉部') as HTMLSelectElement;
    expect(Array.from(select.options).some((o) => o.textContent === '飾品')).toBe(true);
  });

  it('CharacterItemEditModal：裝備類別的裝備類型下拉選單包含「飾品」', () => {
    const characterItem: CharacterItem = {
      id: 'ci-1',
      character_id: 'c1',
      item_id: null,
      quantity: 1,
      is_magic: false,
      name_override: '測試裝備',
      description_override: null,
      category_override: '裝備',
      created_at: '',
      updated_at: '',
      item: null,
    } as any;

    render(
      <CharacterItemEditModal
        isOpen
        onClose={vi.fn()}
        characterItem={characterItem}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );
    const select = screen.getByText('裝備類型 *').parentElement?.querySelector('select') as HTMLSelectElement;
    expect(Array.from(select.options).some((o) => o.textContent === '飾品')).toBe(true);
  });
});
