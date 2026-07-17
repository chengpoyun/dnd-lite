/**
 * ItemsPage - initialDetailItemId：從裝備頁 ↪ 跳轉過來時，
 * 載入完成後自動開啟該道具的詳情 modal（等同點擊該道具卡片），並回報已消化避免重複開啟
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
    id: 'global-1',
    name: '測試頭盔',
    name_en: '',
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
    id: 'ci-helmet',
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

describe('ItemsPage - initialDetailItemId 自動開啟道具詳情', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('帶入 initialDetailItemId 時，載入完成後自動開啟該道具的詳情 modal，並呼叫 onInitialDetailConsumed', async () => {
    const onInitialDetailConsumed = vi.fn();
    mockGetCharacterItems.mockResolvedValue({
      success: true,
      items: [
        buildCharacterItem(),
        buildCharacterItem({ id: 'ci-other', item: buildGlobalItem({ id: 'g2', name: '其他物品' }) }),
      ],
    });

    render(
      <ItemsPage
        characterId="char-1"
        initialDetailItemId="ci-helmet"
        onInitialDetailConsumed={onInitialDetailConsumed}
      />
    );

    // 詳情 modal 開啟：畫面上會出現詳情裡的數量調整按鈕（aria-label 數量增加）
    await waitFor(() => {
      expect(screen.getByLabelText('數量增加')).toBeInTheDocument();
    });
    // modal 顯示該道具名稱（清單預設為★篩選、卡片不在列表上，名稱只出現在 modal）
    expect(screen.getAllByText('測試頭盔').length).toBeGreaterThanOrEqual(1);
    expect(onInitialDetailConsumed).toHaveBeenCalled();
  });

  it('initialDetailItemId 找不到對應道具時，不開啟詳情、也照常顯示清單', async () => {
    mockGetCharacterItems.mockResolvedValue({
      success: true,
      items: [buildCharacterItem()],
    });

    render(
      <ItemsPage characterId="char-1" initialDetailItemId="ci-nonexistent" onInitialDetailConsumed={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
    });
    expect(screen.queryByLabelText('數量增加')).not.toBeInTheDocument();
  });

  it('沒帶 initialDetailItemId 時，載入後不會自動開啟詳情', async () => {
    mockGetCharacterItems.mockResolvedValue({
      success: true,
      items: [buildCharacterItem()],
    });

    render(<ItemsPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
    });
    expect(screen.queryByLabelText('數量增加')).not.toBeInTheDocument();
  });
});
