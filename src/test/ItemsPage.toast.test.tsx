/**
 * ItemsPage - 成功/失敗操作要實際顯示 toast 訊息
 * 不 mock useToast（用真正的 hook），確保 ItemsPage 有渲染 ToastContainer，
 * 而不是只呼叫了 showSuccess/showError 但畫面上什麼都沒出現。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ItemsPage from '../../components/ItemsPage';
import * as ItemService from '../../services/itemService';
import * as ItemCatalog from '../../services/itemCatalog';
import type { CatalogItem } from '../../services/itemCatalog';

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

describe('ItemsPage - toast 實際顯示', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [] });
  });

  it('獲得數量確定後，畫面上要實際出現「已加入 X × N」的 toast', async () => {
    const catalogItem: CatalogItem = {
      source: 'material',
      entry: { name: '解毒草', nameEn: 'Antidote Herb', rarity: null },
    };
    mockSearchLocalCatalog.mockResolvedValue([catalogItem]);
    mockCreateCharacterItem.mockResolvedValue({
      success: true,
      item: {
        id: 'ci-1',
        character_id: 'char-1',
        quantity: 1,
        is_magic: false,
        name_override: '解毒草',
        description_override: '',
        category_override: 'MH素材',
        created_at: '',
        updated_at: '',
      },
    });

    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => expect(screen.getByText('+ 獲得物品')).toBeInTheDocument());
    fireEvent.click(screen.getByText('+ 獲得物品'));

    await waitFor(() => expect(screen.getByPlaceholderText('輸入名稱或描述...')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), { target: { value: '解毒草' } });

    await waitFor(() => screen.getByText('獲得'));
    fireEvent.click(screen.getByText('獲得'));

    const heading = await screen.findByText(/獲得數量/);
    const quantityModal = heading.closest('div.fixed') as HTMLElement;
    fireEvent.click(within(quantityModal).getByText('確定'));

    await waitFor(() => {
      expect(screen.getByText('已加入 解毒草 × 1')).toBeInTheDocument();
    });
  });
});
