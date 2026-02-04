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
    getGlobalItems: vi.fn(),
  };
});

describe('LearnItemModal - keyword gating', () => {
  const mockedGetGlobalItems = ItemService.getGlobalItems as unknown as vi.Mock;

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

    mockedGetGlobalItems.mockResolvedValue({
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

    await waitFor(() => {
      expect(screen.getByText('木劍')).toBeInTheDocument();
    });
  });
});
