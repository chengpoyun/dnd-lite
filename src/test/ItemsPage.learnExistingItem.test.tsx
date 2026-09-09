/**
 * ItemsPage - 獲得物品時挑到「已擁有同名物品」的處理
 * 需求：獲得物品的搜尋結果不再排除已擁有的物品；點擊已擁有的物品時，
 * 行為等同直接在道具列表點擊該道具（開啟詳情 modal），而不是另外建立一筆重複的物品。
 * 未擁有的物品則維持原行為：以目錄資料建立新的個人物品。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ItemsPage from '../../components/ItemsPage';
import * as ItemService from '../../services/itemService';
import * as ItemCatalog from '../../services/itemCatalog';
import type { CharacterItem } from '../../services/itemService';
import type { CatalogItem } from '../../services/itemCatalog';

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../../services/itemService', async (importOriginal) => {
  const actual = await importOriginal<typeof ItemService>();
  return {
    ...actual,
    getCharacterItems: vi.fn(),
    createCharacterItem: vi.fn(),
  };
});

vi.mock('../../services/itemCatalog', async (importOriginal) => {
  const actual = await importOriginal<typeof ItemCatalog>();
  return {
    ...actual,
    searchLocalCatalog: vi.fn(),
  };
});

const mockGetCharacterItems = vi.mocked(ItemService.getCharacterItems);
const mockCreateCharacterItem = vi.mocked(ItemService.createCharacterItem);
const mockSearchLocalCatalog = vi.mocked(ItemCatalog.searchLocalCatalog);

function buildCharacterItem(overrides: Partial<CharacterItem> = {}): CharacterItem {
  return {
    id: 'ci-herb',
    character_id: 'char-1',
    quantity: 5,
    is_magic: false,
    name_override: '藥草',
    description_override: '',
    category_override: 'MH素材',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('ItemsPage - 獲得物品挑到已擁有的物品', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('搜尋結果包含已擁有的物品，點「獲得」會關閉獲得物品 modal、開啟該物品的詳情，不會另外建立新物品', async () => {
    const existing = buildCharacterItem();
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [existing] });
    const catalogItem: CatalogItem = {
      source: 'material',
      entry: { name: '藥草', nameEn: 'Herb', rarity: null },
    };
    mockSearchLocalCatalog.mockResolvedValue([catalogItem]);

    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('+ 獲得物品')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ 獲得物品'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('輸入名稱或描述...')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
      target: { value: '藥草' },
    });

    await waitFor(() => screen.getByText('獲得'));
    fireEvent.click(screen.getByText('獲得'));

    // 獲得物品 modal 關閉、詳情 modal 開啟（可見數量調整按鈕）
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('輸入名稱或描述...')).not.toBeInTheDocument();
      expect(screen.getByLabelText('數量增加')).toBeInTheDocument();
    });
    expect(mockCreateCharacterItem).not.toHaveBeenCalled();
  });

  it('搜尋結果是未擁有的物品，點「獲得」維持原行為：以目錄資料建立新物品', async () => {
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [] });
    const catalogItem: CatalogItem = {
      source: 'material',
      entry: { name: '解毒草', nameEn: 'Antidote Herb', rarity: null },
    };
    mockSearchLocalCatalog.mockResolvedValue([catalogItem]);
    mockCreateCharacterItem.mockResolvedValue({ success: true, item: buildCharacterItem({ name_override: '解毒草' }) });

    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('+ 獲得物品')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ 獲得物品'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('輸入名稱或描述...')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
      target: { value: '解毒草' },
    });

    await waitFor(() => screen.getByText('獲得'));
    fireEvent.click(screen.getByText('獲得'));

    await waitFor(() => {
      expect(mockCreateCharacterItem).toHaveBeenCalledWith(
        'char-1',
        expect.objectContaining({ name: '解毒草', category: 'MH素材' })
      );
    });
  });
});
