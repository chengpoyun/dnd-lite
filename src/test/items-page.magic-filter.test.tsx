import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ItemsPage from '../../components/ItemsPage';
import type { CharacterItem } from '../../services/itemService';
import * as ItemService from '../../services/itemService';

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../../components/LearnItemModal', () => ({ LearnItemModal: () => null }));
vi.mock('../../components/AddPersonalItemModal', () => ({ AddPersonalItemModal: () => null }));
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
  const mockedGetCharacterItems = ItemService.getCharacterItems as unknown as ReturnType<typeof vi.fn>;

  const buildCharacterItem = (overrides: Partial<CharacterItem>): CharacterItem => ({
    id: overrides.id || `char-${overrides.name_override || 'item'}`,
    character_id: overrides.character_id || 'char-1',
    quantity: overrides.quantity ?? 1,
    is_magic: overrides.is_magic ?? false,
    name_override: overrides.name_override ?? null,
    description_override: overrides.description_override ?? null,
    category_override: overrides.category_override ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應該只顯示魔法物品', async () => {
    const normalItem = buildCharacterItem({
      name_override: '普通劍',
      category_override: '裝備',
      is_magic: false,
    });
    const magicItem = buildCharacterItem({
      name_override: '魔法劍',
      category_override: '裝備',
      is_magic: true,
    });

    mockedGetCharacterItems.mockResolvedValue({
      success: true,
      items: [normalItem, magicItem],
    });

    render(<ItemsPage characterId="char-1" />);

    // 預設分類為★，兩筆測試資料皆未收藏，需先切到「全部」才看得到
    await waitFor(() => {
      expect(screen.getByText('全部')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('全部'));

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
