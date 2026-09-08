/**
 * ItemsPage - 搜尋列
 * 位於類別篩選 chip 列下方；依名稱＋效果說明（含鑲嵌效果摘要）過濾道具列表，
 * 與類別篩選同時套用（AND）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ItemsPage from '../../components/ItemsPage';
import * as ItemService from '../../services/itemService';
import type { CharacterItem, GlobalItem } from '../../services/itemService';

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
  };
});

const mockGetCharacterItems = vi.mocked(ItemService.getCharacterItems);

function buildGlobalItem(overrides: Partial<GlobalItem> = {}): GlobalItem {
  return {
    id: `global-${Math.random()}`,
    name: '未命名',
    name_en: '',
    description: '',
    category: '雜項',
    is_magic: false,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function buildCharacterItem(overrides: Partial<CharacterItem> = {}): CharacterItem {
  return {
    id: `ci-${Math.random()}`,
    character_id: 'char-1',
    item_id: 'global-1',
    quantity: 1,
    is_magic: false,
    is_favorite: true,
    created_at: '',
    updated_at: '',
    item: buildGlobalItem(),
    ...overrides,
  };
}

describe('ItemsPage - 搜尋列', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 全部設為 is_favorite，讓預設的★分類就直接看得到全部三筆，不用先切類別
  const items: CharacterItem[] = [
    buildCharacterItem({
      id: 'ci-1',
      name_override: '長劍',
      description_override: '',
      item: buildGlobalItem({ name: '長劍', description: '' }),
    }),
    buildCharacterItem({
      id: 'ci-2',
      name_override: '治療藥水',
      category_override: '藥水',
      description_override: '恢復生命值',
      item: buildGlobalItem({ name: '治療藥水', category: '藥水' }),
    }),
    buildCharacterItem({
      id: 'ci-3',
      name_override: '重甲',
      decoration_slots: 1,
      armor_decoration: true,
      sockets: [{ decoration_name: '力量結晶', note: '力量+2的護甲鑲嵌石' }],
      item: buildGlobalItem({ name: '重甲' }),
    }),
  ];

  it('有道具時顯示搜尋列，預設顯示全部道具', async () => {
    mockGetCharacterItems.mockResolvedValue({ success: true, items });
    render(<ItemsPage characterId="char-1" />);

    expect(await screen.findByText('長劍')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜尋道具...')).toBeInTheDocument();
    expect(screen.getByText('治療藥水')).toBeInTheDocument();
    expect(screen.getByText('重甲')).toBeInTheDocument();
  });

  it('輸入名稱關鍵字只篩出符合的道具', async () => {
    mockGetCharacterItems.mockResolvedValue({ success: true, items });
    render(<ItemsPage characterId="char-1" />);
    await screen.findByText('長劍');

    fireEvent.change(screen.getByPlaceholderText('搜尋道具...'), { target: { value: '長劍' } });

    await waitFor(() => {
      expect(screen.queryByText('治療藥水')).not.toBeInTheDocument();
    });
    expect(screen.getByText('長劍')).toBeInTheDocument();
    expect(screen.queryByText('重甲')).not.toBeInTheDocument();
  });

  it('輸入效果說明關鍵字也能篩出符合的道具', async () => {
    mockGetCharacterItems.mockResolvedValue({ success: true, items });
    render(<ItemsPage characterId="char-1" />);
    await screen.findByText('治療藥水');

    fireEvent.change(screen.getByPlaceholderText('搜尋道具...'), { target: { value: '恢復生命值' } });

    await waitFor(() => {
      expect(screen.queryByText('長劍')).not.toBeInTheDocument();
    });
    expect(screen.getByText('治療藥水')).toBeInTheDocument();
  });

  it('輸入已鑲嵌素材的名稱或備註關鍵字，能篩出裝備該素材的道具', async () => {
    mockGetCharacterItems.mockResolvedValue({ success: true, items });
    render(<ItemsPage characterId="char-1" />);
    await screen.findByText('重甲');

    fireEvent.change(screen.getByPlaceholderText('搜尋道具...'), { target: { value: '力量結晶' } });
    await waitFor(() => {
      expect(screen.getByText('重甲')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('搜尋道具...'), { target: { value: '力量+2' } });
    await waitFor(() => {
      expect(screen.getByText('重甲')).toBeInTheDocument();
    });
  });

  it('搜尋與類別篩選同時套用：選了類別後搜尋範圍只在該類別內', async () => {
    mockGetCharacterItems.mockResolvedValue({ success: true, items });
    render(<ItemsPage characterId="char-1" />);
    await screen.findByText('長劍');

    fireEvent.click(screen.getByRole('button', { name: '藥水' }));
    await waitFor(() => {
      expect(screen.queryByText('長劍')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('搜尋道具...'), { target: { value: '長劍' } });

    await waitFor(() => {
      expect(screen.getByText('找不到符合的道具')).toBeInTheDocument();
    });
  });

  it('搜尋不到結果時顯示「找不到符合的道具」', async () => {
    mockGetCharacterItems.mockResolvedValue({ success: true, items });
    render(<ItemsPage characterId="char-1" />);
    await screen.findByText('長劍');

    fireEvent.change(screen.getByPlaceholderText('搜尋道具...'), { target: { value: '不存在的關鍵字xyz' } });

    await waitFor(() => {
      expect(screen.getByText('找不到符合的道具')).toBeInTheDocument();
    });
  });

  it('點清空按鈕後恢復目前類別下的全部道具', async () => {
    mockGetCharacterItems.mockResolvedValue({ success: true, items });
    render(<ItemsPage characterId="char-1" />);
    await screen.findByText('長劍');

    const search = screen.getByPlaceholderText('搜尋道具...');
    fireEvent.change(search, { target: { value: '長劍' } });
    await waitFor(() => {
      expect(screen.queryByText('治療藥水')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('清空搜尋'));
    await waitFor(() => {
      expect(screen.getByText('治療藥水')).toBeInTheDocument();
    });
  });

  it('搜尋不分大小寫', async () => {
    mockGetCharacterItems.mockResolvedValue({
      success: true,
      items: [
        buildCharacterItem({
          id: 'ci-en',
          name_override: 'Ring of Power',
          item: buildGlobalItem({ name: 'Ring of Power' }),
        }),
      ],
    });
    render(<ItemsPage characterId="char-1" />);
    await screen.findByText('Ring of Power');

    fireEvent.change(screen.getByPlaceholderText('搜尋道具...'), { target: { value: 'ring' } });
    await waitFor(() => {
      expect(screen.getByText('Ring of Power')).toBeInTheDocument();
    });
  });
});
