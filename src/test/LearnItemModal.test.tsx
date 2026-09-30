import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { LearnItemModal } from '../../components/LearnItemModal';
import * as ItemCatalog from '../../services/itemCatalog';
import type { CatalogItem } from '../../services/itemCatalog';

vi.mock('../../services/itemCatalog', async () => {
  const actual = await vi.importActual<typeof import('../../services/itemCatalog')>(
    '../../services/itemCatalog'
  );
  return {
    ...actual,
    searchLocalCatalog: vi.fn(),
  };
});

describe('LearnItemModal - keyword gating', () => {
  const mockedSearchLocalCatalog = ItemCatalog.searchLocalCatalog as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show items until keyword entered', async () => {
    const items: CatalogItem[] = [
      {
        source: 'general',
        entry: { name: '木劍', nameEn: 'Wooden Sword', description: 'desc', category: '裝備', rarity: null },
      },
    ];

    mockedSearchLocalCatalog.mockResolvedValue(items);

    render(
      <LearnItemModal
        isOpen
        onClose={vi.fn()}
        onLearnItem={vi.fn()}
        onCreateNew={vi.fn()}
        learnedNames={[]}
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
    expect(mockedSearchLocalCatalog).toHaveBeenCalledWith('木');
  });

  it('shows items with no description when name matches search', async () => {
    const items: CatalogItem[] = [
      {
        source: 'material',
        entry: { name: '誇爾羽符鳥', nameEn: '', rarity: null },
      },
    ];

    mockedSearchLocalCatalog.mockResolvedValue(items);

    render(
      <LearnItemModal
        isOpen
        onClose={vi.fn()}
        onLearnItem={vi.fn()}
        onCreateNew={vi.fn()}
        learnedNames={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('輸入名稱或描述...')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
      target: { value: '誇爾羽符' },
    });

    await waitFor(() => {
      expect(screen.getByText('誇爾羽符鳥')).toBeInTheDocument();
    });
    expect(mockedSearchLocalCatalog).toHaveBeenCalledWith('誇爾羽符');
  });

  it('已擁有的物品（依名稱比對）也會照樣出現在搜尋結果，不再被排除', async () => {
    const items: CatalogItem[] = [
      { source: 'material', entry: { name: '藥草', nameEn: 'Herb', rarity: null } },
    ];
    mockedSearchLocalCatalog.mockResolvedValue(items);

    render(
      <LearnItemModal
        isOpen
        onClose={vi.fn()}
        onLearnItem={vi.fn()}
        onCreateNew={vi.fn()}
        learnedNames={['藥草']}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
      target: { value: '藥草' },
    });

    await waitFor(() => {
      expect(screen.getByText('藥草')).toBeInTheDocument();
    });
  });
});

describe('LearnItemModal - 統一「獲得」按鈕＋已持有標籤', () => {
  const mockedSearchLocalCatalog = ItemCatalog.searchLocalCatalog as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未擁有的物品：只顯示「獲得」按鈕，不顯示「已持有」標籤', async () => {
    const item: CatalogItem = { source: 'material', entry: { name: '藥草', nameEn: 'Herb', rarity: null } };
    mockedSearchLocalCatalog.mockResolvedValue([item]);

    render(
      <LearnItemModal
        isOpen
        onClose={vi.fn()}
        onLearnItem={vi.fn()}
        onCreateNew={vi.fn()}
        learnedNames={[]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
      target: { value: '藥草' },
    });

    await waitFor(() => {
      expect(screen.getByText('獲得')).toBeInTheDocument();
    });
    expect(screen.queryByText('已持有')).not.toBeInTheDocument();
  });

  it('已擁有的物品：顯示「已持有」標籤，且仍顯示「獲得」按鈕', async () => {
    const item: CatalogItem = { source: 'material', entry: { name: '藥草', nameEn: 'Herb', rarity: null } };
    mockedSearchLocalCatalog.mockResolvedValue([item]);

    render(
      <LearnItemModal
        isOpen
        onClose={vi.fn()}
        onLearnItem={vi.fn()}
        onCreateNew={vi.fn()}
        learnedNames={['藥草']}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
      target: { value: '藥草' },
    });

    await waitFor(() => {
      expect(screen.getByText('已持有')).toBeInTheDocument();
      expect(screen.getByText('獲得')).toBeInTheDocument();
    });
  });

  it('點「獲得」會先跳出獲得數量彈窗，不會立刻呼叫 onLearnItem', async () => {
    const item: CatalogItem = { source: 'material', entry: { name: '藥草', nameEn: 'Herb', rarity: null } };
    mockedSearchLocalCatalog.mockResolvedValue([item]);
    const onLearnItem = vi.fn().mockResolvedValue(undefined);

    render(
      <LearnItemModal
        isOpen
        onClose={vi.fn()}
        onLearnItem={onLearnItem}
        onCreateNew={vi.fn()}
        learnedNames={[]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
      target: { value: '藥草' },
    });
    await waitFor(() => screen.getByText('獲得'));
    fireEvent.click(screen.getByText('獲得'));

    await waitFor(() => {
      expect(screen.getByText(/獲得數量/)).toBeInTheDocument();
    });
    expect(onLearnItem).not.toHaveBeenCalled();
  });

  it('獲得數量彈窗確定後，把 CatalogItem 與數量一併傳給 onLearnItem', async () => {
    const item: CatalogItem = { source: 'material', entry: { name: '藥草', nameEn: 'Herb', rarity: null } };
    mockedSearchLocalCatalog.mockResolvedValue([item]);
    const onLearnItem = vi.fn().mockResolvedValue(undefined);

    render(
      <LearnItemModal
        isOpen
        onClose={vi.fn()}
        onLearnItem={onLearnItem}
        onCreateNew={vi.fn()}
        learnedNames={[]}
        gatherMultiplier={4}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
      target: { value: '藥草' },
    });
    await waitFor(() => screen.getByText('獲得'));
    fireEvent.click(screen.getByText('獲得'));

    await waitFor(() => screen.getByText(/獲得數量/));
    fireEvent.change(screen.getByLabelText('數量'), { target: { value: '2' } });
    fireEvent.click(screen.getByText('確定'));

    await waitFor(() => {
      expect(onLearnItem).toHaveBeenCalledWith(item, 8);
    });
  });

  it('一般道具（非 MH素材）獲得數量彈窗不顯示套用組織倍數開關', async () => {
    const item: CatalogItem = {
      source: 'general',
      entry: { name: '治療藥水', nameEn: 'Potion of Healing', description: '', category: '藥水', rarity: null },
    };
    mockedSearchLocalCatalog.mockResolvedValue([item]);

    render(
      <LearnItemModal
        isOpen
        onClose={vi.fn()}
        onLearnItem={vi.fn()}
        onCreateNew={vi.fn()}
        learnedNames={[]}
        gatherMultiplier={4}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
      target: { value: '治療' },
    });
    await waitFor(() => screen.getByText('獲得'));
    fireEvent.click(screen.getByText('獲得'));

    await waitFor(() => screen.getByText(/獲得數量/));
    expect(screen.queryByText(/套用組織倍數/)).not.toBeInTheDocument();
  });

  it('點取消會關閉獲得數量彈窗，不呼叫 onLearnItem', async () => {
    const item: CatalogItem = { source: 'material', entry: { name: '藥草', nameEn: 'Herb', rarity: null } };
    mockedSearchLocalCatalog.mockResolvedValue([item]);
    const onLearnItem = vi.fn();

    render(
      <LearnItemModal
        isOpen
        onClose={vi.fn()}
        onLearnItem={onLearnItem}
        onCreateNew={vi.fn()}
        learnedNames={[]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
      target: { value: '藥草' },
    });
    await waitFor(() => screen.getByText('獲得'));
    fireEvent.click(screen.getByText('獲得'));
    const heading = await screen.findByText(/獲得數量/);
    const quantityModal = heading.closest('div.fixed') as HTMLElement;

    fireEvent.click(within(quantityModal).getByText('取消'));

    await waitFor(() => {
      expect(screen.queryByText(/獲得數量/)).not.toBeInTheDocument();
    });
    expect(onLearnItem).not.toHaveBeenCalled();
  });
});
