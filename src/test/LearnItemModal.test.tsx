import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LearnItemModal } from '../../components/LearnItemModal';
import * as ItemService from '../../services/itemService';
import type { GlobalItem } from '../../services/itemService';

vi.mock('../../services/itemService', async () => {
  const actual = await vi.importActual<typeof import('../../services/itemService')>(
    '../../services/itemService'
  );
  return {
    ...actual,
    searchGlobalItems: vi.fn(),
  };
});

describe('LearnItemModal - keyword gating', () => {
  const mockedSearchGlobalItems = ItemService.searchGlobalItems as unknown as vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show items until keyword entered', async () => {
    const items: GlobalItem[] = [
      {
        id: 'item-1',
        name: '木劍',
        name_en: 'Wooden Sword',
        description: 'desc',
        category: '裝備',
        is_magic: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockedSearchGlobalItems.mockResolvedValue({
      success: true,
      items,
    });

    render(
      <LearnItemModal
        isOpen
        onClose={vi.fn()}
        onLearnItem={vi.fn()}
        onCreateNew={vi.fn()}
        learnedItemIds={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('請輸入關鍵字以搜尋物品')).toBeInTheDocument();
    });
    expect(screen.queryByText('木劍')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
      target: { value: '木' },
    });

    await waitFor(
      () => {
        expect(screen.getByText('木劍')).toBeInTheDocument();
      },
      { timeout: 600 }
    );
    expect(mockedSearchGlobalItems).toHaveBeenCalledWith('木');
  });

  it('shows items with null description when name matches search', async () => {
    const items: GlobalItem[] = [
      {
        id: 'item-1',
        name: '誇爾羽符鳥',
        name_en: null,
        description: null as unknown as string,
        category: '雜項',
        is_magic: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockedSearchGlobalItems.mockResolvedValue({
      success: true,
      items,
    });

    render(
      <LearnItemModal
        isOpen
        onClose={vi.fn()}
        onLearnItem={vi.fn()}
        onCreateNew={vi.fn()}
        learnedItemIds={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('輸入名稱或描述...')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
      target: { value: '誇爾羽符' },
    });

    await waitFor(
      () => {
        expect(screen.getByText('誇爾羽符鳥')).toBeInTheDocument();
      },
      { timeout: 600 }
    );
    expect(mockedSearchGlobalItems).toHaveBeenCalledWith('誇爾羽符');
  });
});
