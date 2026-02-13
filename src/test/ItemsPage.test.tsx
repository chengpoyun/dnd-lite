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
  };
});

const mockGetCharacterItems = vi.mocked(ItemService.getCharacterItems);
const mockSearchGlobalItems = vi.mocked(ItemService.searchGlobalItems);

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

  it('載入後無物品時顯示「尚無道具」與「獲得第一個物品」按鈕', async () => {
    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(mockGetCharacterItems).toHaveBeenCalledWith('char-1');
    });

    await waitFor(() => {
      expect(screen.getByText('尚無道具')).toBeInTheDocument();
    });
    expect(screen.getByText('獲得第一個物品')).toBeInTheDocument();
    expect(screen.getByText('+ 獲得物品')).toBeInTheDocument();
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
    const item = buildCharacterItem();
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
});
