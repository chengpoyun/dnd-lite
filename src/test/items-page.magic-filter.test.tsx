import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ItemsPage from '../../components/ItemsPage';
import type { CharacterItem, GlobalItem } from '../../services/itemService';
import * as ItemService from '../../services/itemService';

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../../components/LearnItemModal', () => ({ LearnItemModal: () => null }));
vi.mock('../../components/AddPersonalItemModal', () => ({ AddPersonalItemModal: () => null }));
vi.mock('../../components/GlobalItemFormModal', () => ({ GlobalItemFormModal: () => null }));
vi.mock('../../components/CharacterItemEditModal', () => ({ CharacterItemEditModal: () => null }));
vi.mock('../../components/ItemDetailModal', () => ({ default: () => null }));
vi.mock('../../components/ConfirmDeleteModal', () => ({ ConfirmDeleteModal: () => null }));

vi.mock('../../services/itemService', async () => {
  const actual = await vi.importActual<typeof import('../../services/itemService')>('../../services/itemService');
  return {
    ...actual,
    getCharacterItems: vi.fn(),
  };
});

describe('ItemsPage - 魔法物品篩選', () => {
  const mockedGetCharacterItems = ItemService.getCharacterItems as unknown as vi.Mock;

  const buildItem = (overrides: Partial<GlobalItem>): GlobalItem => ({
    id: `global-${overrides.name || 'item'}`,
    name: overrides.name || '物品',
    name_en: overrides.name_en || '',
    description: overrides.description || '',
    category: overrides.category || '裝備',
    is_magic: overrides.is_magic ?? false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const buildCharacterItem = (overrides: Partial<CharacterItem>): CharacterItem => ({
    id: overrides.id || `char-${overrides.item_id || 'item'}`,
    character_id: overrides.character_id || 'char-1',
    item_id: overrides.item_id ?? 'global-1',
    quantity: overrides.quantity ?? 1,
    is_magic: overrides.is_magic ?? false,
    is_magic_override: overrides.is_magic_override ?? null,
    name_override: overrides.name_override ?? null,
    description_override: overrides.description_override ?? null,
    category_override: overrides.category_override ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    item: overrides.item,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應該只顯示魔法物品', async () => {
    const normalItem = buildCharacterItem({
      item_id: 'global-normal',
      item: buildItem({ name: '普通劍', category: '裝備', is_magic: false }),
    });
    const magicItem = buildCharacterItem({
      item_id: 'global-magic',
      item: buildItem({ name: '魔法劍', category: '裝備', is_magic: true }),
    });

    mockedGetCharacterItems.mockResolvedValue({
      success: true,
      items: [normalItem, magicItem],
    });

    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('普通劍')).toBeInTheDocument();
      expect(screen.getByText('魔法劍')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('魔法物品'));

    await waitFor(() => {
      expect(screen.queryByText('普通劍')).not.toBeInTheDocument();
      expect(screen.getByText('魔法劍')).toBeInTheDocument();
    });
  });
});
