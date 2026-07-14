/**
 * ItemsPage 核心行為測試（載入、空狀態、獲得物品 modal、詳情 modal）
 * 僅 mock ItemService 部分方法與 useToast，不 mock modal 組件。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
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
    searchGlobalItems: vi.fn(),
    socketDecoration: vi.fn(),
    updateCharacterItemFavorite: vi.fn(),
  };
});

const mockGetCharacterItems = vi.mocked(ItemService.getCharacterItems);
const mockSearchGlobalItems = vi.mocked(ItemService.searchGlobalItems);
const mockSocketDecoration = vi.mocked(ItemService.socketDecoration);
const mockUpdateCharacterItemFavorite = vi.mocked(ItemService.updateCharacterItemFavorite);

function buildGlobalItem(overrides: Partial<GlobalItem> = {}): GlobalItem {
  return {
    id: 'global-1',
    name: '長劍',
    name_en: 'Longsword',
    description: '',
    category: '裝備',
    is_magic: false,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function buildCharacterItem(overrides: Partial<CharacterItem> = {}): CharacterItem {
  return {
    id: 'ci-1',
    character_id: 'char-1',
    item_id: 'global-1',
    quantity: 1,
    is_magic: false,
    created_at: '',
    updated_at: '',
    item: buildGlobalItem(),
    ...overrides,
  };
}

describe('ItemsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [] });
    mockSearchGlobalItems.mockResolvedValue({ success: true, items: [] });
  });

  it('載入後無物品時（預設顯示★列表）顯示「尚無收藏的道具」與「獲得第一個物品」按鈕', async () => {
    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(mockGetCharacterItems).toHaveBeenCalledWith('char-1');
    });

    await waitFor(() => {
      expect(screen.getByText('尚無收藏的道具')).toBeInTheDocument();
    });
    expect(screen.getByText('獲得第一個物品')).toBeInTheDocument();
    expect(screen.getByText('+ 獲得物品')).toBeInTheDocument();
  });

  it('切到「全部」分類後，無物品時顯示「尚無道具」', async () => {
    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('尚無收藏的道具')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '全部' }));

    await waitFor(() => {
      expect(screen.getByText('尚無道具')).toBeInTheDocument();
    });
  });

  it('點「+ 獲得物品」會打開獲得物品 modal', async () => {
    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('+ 獲得物品')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ 獲得物品'));

    await waitFor(() => {
      expect(screen.getByText('獲得物品')).toBeInTheDocument();
    });
  });

  it('點「獲得第一個物品」會打開獲得物品 modal', async () => {
    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('獲得第一個物品')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('獲得第一個物品'));

    await waitFor(() => {
      expect(screen.getByText('獲得物品')).toBeInTheDocument();
    });
  });

  it('有物品時點物品卡會打開詳情 modal（編輯、刪除）', async () => {
    const item = buildCharacterItem({ is_favorite: true });
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [item] });

    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('長劍')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('長劍'));

    await waitFor(() => {
      expect(screen.getByText('編輯')).toBeInTheDocument();
      expect(screen.getByText('刪除')).toBeInTheDocument();
    });
  });

  it('點有插槽裝備的空插槽 → 選素材 → 填效果 → 確認鑲嵌，會呼叫 ItemService.socketDecoration 帶正確參數', async () => {
    const weapon = buildCharacterItem({
      id: 'ci-weapon',
      name_override: '大劍',
      item_id: null,
      item: undefined,
      category_override: '裝備',
      equipment_kind_override: 'melee_weapon',
      decoration_slots: 1,
      sockets: [null],
      is_favorite: true,
    });
    const material = buildCharacterItem({
      id: 'ci-material',
      name_override: '火龍逆鱗',
      item_id: null,
      item: undefined,
      category_override: 'MH素材',
      weapon_decoration: true,
      quantity: 1,
    });
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [weapon, material] });
    mockSocketDecoration.mockResolvedValue({ success: true });

    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('大劍')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('大劍'));

    const emptySlotButton = await screen.findByRole('button', { name: '（空）' });
    fireEvent.click(emptySlotButton);

    await waitFor(() => {
      expect(screen.getByText('火龍逆鱗', { selector: 'div' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('火龍逆鱗', { selector: 'div' }));

    const noteInput = await screen.findByPlaceholderText('描述鑲嵌後的效果，留空表示沒有效果');
    fireEvent.change(noteInput, { target: { value: '劍身覆上熾焰' } });
    fireEvent.click(screen.getByText('下一步'));

    await waitFor(() => {
      expect(screen.getByText('確認鑲嵌', { selector: 'p' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('確認鑲嵌', { selector: 'button' }));

    await waitFor(() => {
      expect(mockSocketDecoration).toHaveBeenCalledWith('ci-weapon', 0, 'ci-material', '劍身覆上熾焰', undefined);
    });
  });

  it('同一素材武器/護甲效果各自獨立設定時，鑲嵌畫面只會依裝備實際類型帶入對應那一份（不會混用）', async () => {
    const weapon = buildCharacterItem({
      id: 'ci-weapon3',
      name_override: '雙劍',
      item_id: null,
      item: undefined,
      category_override: '裝備',
      equipment_kind_override: 'melee_weapon',
      decoration_slots: 1,
      sockets: [null],
      is_favorite: true,
    });
    const material = buildCharacterItem({
      id: 'ci-material3',
      name_override: '雷狼素材',
      item_id: null,
      item: undefined,
      category_override: 'MH素材',
      weapon_decoration: true,
      armor_decoration: true,
      quantity: 1,
      decoration_effects: {
        weapon: { note: '雷電附加傷害', stat_bonuses: {} },
        armor: { note: '雷屬性抗性', stat_bonuses: {} },
      },
    });
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [weapon, material] });

    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('雙劍')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('雙劍'));

    const emptySlotButton = await screen.findByRole('button', { name: '（空）' });
    fireEvent.click(emptySlotButton);

    await waitFor(() => {
      expect(screen.getByText('雷狼素材', { selector: 'div' })).toBeInTheDocument();
    });
    // 選材列表預覽也應顯示武器插槽效果，而非護甲插槽效果
    expect(screen.getByText('雷電附加傷害')).toBeInTheDocument();
    expect(screen.queryByText('雷屬性抗性')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('雷狼素材', { selector: 'div' }));

    const noteInput = await screen.findByPlaceholderText('描述鑲嵌後的效果，留空表示沒有效果');
    expect((noteInput as HTMLTextAreaElement).value).toBe('雷電附加傷害');
  });

  it('類別篩選按鈕：★排最前面、全部排最後面', async () => {
    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '★' })).toBeInTheDocument();
    });

    const labels = ['★', '裝備', '藥水', 'MH素材', '雜項', '魔法物品', '全部'];
    const buttons = labels.map((label) => screen.getByRole('button', { name: label }));
    const positions = buttons.map((btn) => Array.from(btn.parentElement!.children).indexOf(btn));

    expect(positions).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('預設進入道具頁面時，只顯示已收藏的物品（不需額外點擊★分類）', async () => {
    const favorited = buildCharacterItem({ id: 'ci-fav', name_override: '收藏物品', item_id: null, item: undefined, is_favorite: true });
    const notFavorited = buildCharacterItem({ id: 'ci-normal', name_override: '一般物品', item_id: null, item: undefined, is_favorite: false });
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [favorited, notFavorited] });

    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('收藏物品')).toBeInTheDocument();
    });
    expect(screen.queryByText('一般物品')).not.toBeInTheDocument();
  });

  it('切到「全部」再切回★分類時，只顯示已收藏的物品', async () => {
    const favorited = buildCharacterItem({ id: 'ci-fav', name_override: '收藏物品', item_id: null, item: undefined, is_favorite: true });
    const notFavorited = buildCharacterItem({ id: 'ci-normal', name_override: '一般物品', item_id: null, item: undefined, is_favorite: false });
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [favorited, notFavorited] });

    render(<ItemsPage characterId="char-1" />);
    await waitFor(() => {
      expect(screen.getByText('收藏物品')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '全部' }));
    await waitFor(() => {
      expect(screen.getByText('一般物品')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '★' }));
    await waitFor(() => {
      expect(screen.getByText('收藏物品')).toBeInTheDocument();
      expect(screen.queryByText('一般物品')).not.toBeInTheDocument();
    });
  });

  it('在道具詳情彈窗點擊★收藏切換鈕，會呼叫 ItemService.updateCharacterItemFavorite', async () => {
    const item = buildCharacterItem({ id: 'ci-star', name_override: '測試物品', item_id: null, item: undefined, is_favorite: false });
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [item] });
    mockUpdateCharacterItemFavorite.mockResolvedValue({ success: true });

    render(<ItemsPage characterId="char-1" />);

    // 此物品尚未收藏，預設的★分類看不到，需先切到「全部」
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '全部' }));

    await waitFor(() => {
      expect(screen.getByText('測試物品')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('測試物品'));

    const favoriteButton = await screen.findByRole('button', { name: '加入★列表' });
    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(mockUpdateCharacterItemFavorite).toHaveBeenCalledWith('ci-star', true);
    });
  });

  it('已收藏物品的卡片，★顯示在名稱左側且沒有外框', async () => {
    const item = buildCharacterItem({ id: 'ci-star2', name_override: '收藏卡片', item_id: null, item: undefined, is_favorite: true });
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [item] });

    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('收藏卡片')).toBeInTheDocument();
    });

    // RTL 的 getByText 只比對元素「直接文字節點」，故此處取得的就是包住名稱文字的 <h3>
    const titleEl = screen.getByText('收藏卡片');
    const children = Array.from(titleEl.childNodes);
    const star = children.find(
      (n) => n.nodeType === Node.ELEMENT_NODE && n.textContent?.trim() === '★'
    ) as HTMLElement | undefined;
    const nameTextNode = children.find(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.includes('收藏卡片')
    );

    expect(star).toBeTruthy();
    expect(nameTextNode).toBeTruthy();
    // ★ 必須排在名稱文字節點之前（視覺上在左側）
    expect(children.indexOf(star!)).toBeLessThan(children.indexOf(nameTextNode!));
    expect(star!.className).not.toMatch(/border/);
  });
});
