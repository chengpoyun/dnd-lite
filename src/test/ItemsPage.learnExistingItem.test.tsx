/**
 * ItemsPage - 獲得物品時挑到「已擁有同名物品」的處理
 * 需求：獲得物品的搜尋結果不再排除已擁有的物品；點擊已擁有物品的「獲得」按鈕時，
 * 會跳出獲得數量彈窗，確定後把數量累加到既有物品上，而不是另外建立一筆重複的物品，
 * 也不會再直接開啟該物品的詳情。未擁有的物品則以目錄資料＋輸入的數量建立新的個人物品。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ItemsPage from '../../components/ItemsPage';
import * as ItemService from '../../services/itemService';
import * as ItemCatalog from '../../services/itemCatalog';
import type { CharacterItem } from '../../services/itemService';
import type { CatalogItem } from '../../services/itemCatalog';

const showSuccess = vi.fn();

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess,
    showError: vi.fn(),
  }),
}));

vi.mock('../../services/itemService', async (importOriginal) => {
  const actual = await importOriginal<typeof ItemService>();
  return {
    ...actual,
    getCharacterItems: vi.fn(),
    createCharacterItem: vi.fn(),
    updateCharacterItem: vi.fn(),
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
const mockUpdateCharacterItem = vi.mocked(ItemService.updateCharacterItem);
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

async function openLearnModalAndSearch(query: string) {
  await waitFor(() => {
    expect(screen.getByText('+ 獲得物品')).toBeInTheDocument();
  });
  fireEvent.click(screen.getByText('+ 獲得物品'));

  await waitFor(() => {
    expect(screen.getByPlaceholderText('輸入名稱或描述...')).toBeInTheDocument();
  });
  fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
    target: { value: query },
  });
}

describe('ItemsPage - 獲得物品挑到已擁有的物品', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('搜尋結果包含已擁有的物品：顯示「已持有」標籤，點「獲得」跳出數量彈窗，確定後累加數量、不建立新物品、不開詳情', async () => {
    const existing = buildCharacterItem();
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [existing] });
    const catalogItem: CatalogItem = {
      source: 'material',
      entry: { name: '藥草', nameEn: 'Herb', rarity: null },
    };
    mockSearchLocalCatalog.mockResolvedValue([catalogItem]);
    mockUpdateCharacterItem.mockResolvedValue({ success: true });

    render(<ItemsPage characterId="char-1" />);
    await openLearnModalAndSearch('藥草');

    await waitFor(() => screen.getByText('已持有'));
    fireEvent.click(screen.getByText('獲得'));

    const heading = await screen.findByText(/獲得數量/);
    const quantityModal = heading.closest('div.fixed') as HTMLElement;
    fireEvent.change(within(quantityModal).getByLabelText('數量'), { target: { value: '3' } });
    fireEvent.click(within(quantityModal).getByText('確定'));

    await waitFor(() => {
      expect(mockUpdateCharacterItem).toHaveBeenCalledWith('ci-herb', { quantity: 8 });
    });
    expect(mockCreateCharacterItem).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('輸入名稱或描述...')).not.toBeInTheDocument();
    });
    expect(screen.queryByLabelText('數量增加')).not.toBeInTheDocument();
    expect(showSuccess).toHaveBeenCalledWith('已加入 藥草 × 3');
  });

  it('搜尋結果是未擁有的物品，點「獲得」→輸入數量→確定：以目錄資料＋輸入數量建立新物品', async () => {
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [] });
    const catalogItem: CatalogItem = {
      source: 'material',
      entry: { name: '解毒草', nameEn: 'Antidote Herb', rarity: null },
    };
    mockSearchLocalCatalog.mockResolvedValue([catalogItem]);
    mockCreateCharacterItem.mockResolvedValue({ success: true, item: buildCharacterItem({ name_override: '解毒草' }) });

    render(<ItemsPage characterId="char-1" />);
    await openLearnModalAndSearch('解毒草');

    await waitFor(() => screen.getByText('獲得'));
    fireEvent.click(screen.getByText('獲得'));

    const heading = await screen.findByText(/獲得數量/);
    const quantityModal = heading.closest('div.fixed') as HTMLElement;
    fireEvent.click(within(quantityModal).getByText('確定'));

    await waitFor(() => {
      expect(mockCreateCharacterItem).toHaveBeenCalledWith(
        'char-1',
        expect.objectContaining({ name: '解毒草', category: 'MH素材', quantity: 1 })
      );
    });
    expect(showSuccess).toHaveBeenCalledWith('已加入 解毒草 × 1');
  });
});
