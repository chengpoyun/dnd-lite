import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('未擁有的物品，按鈕文字顯示「獲得」', async () => {
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

  it('已擁有的物品（依名稱比對），按鈕文字改顯示「已持有」', async () => {
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
    });
    expect(screen.queryByText('獲得')).not.toBeInTheDocument();
  });

  it('點「獲得」時把整筆 CatalogItem 傳給 onLearnItem（是否已擁有交由呼叫端判斷）', async () => {
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
      expect(onLearnItem).toHaveBeenCalledWith(item);
    });
  });

  it('已擁有的物品點「已持有」按鈕，一樣把整筆 CatalogItem 傳給 onLearnItem', async () => {
    const item: CatalogItem = { source: 'material', entry: { name: '藥草', nameEn: 'Herb', rarity: null } };
    mockedSearchLocalCatalog.mockResolvedValue([item]);
    const onLearnItem = vi.fn().mockResolvedValue(undefined);

    render(
      <LearnItemModal
        isOpen
        onClose={vi.fn()}
        onLearnItem={onLearnItem}
        onCreateNew={vi.fn()}
        learnedNames={['藥草']}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), {
      target: { value: '藥草' },
    });
    await waitFor(() => screen.getByText('已持有'));
    fireEvent.click(screen.getByText('已持有'));

    await waitFor(() => {
      expect(onLearnItem).toHaveBeenCalledWith(item);
    });
  });
});
