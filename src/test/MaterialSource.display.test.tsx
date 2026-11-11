/**
 * MH素材的「來源：怪物名　CR n」顯示：列表卡片、道具詳情、獲得物品搜尋結果
 * CR 不再放在標籤列，改放在來源右側；其他類別的稀有度標籤維持原樣。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ItemCard } from '../../components/ItemCard';
import ItemDetailModal from '../../components/ItemDetailModal';
import { LearnItemModal } from '../../components/LearnItemModal';
import * as ItemCatalog from '../../services/itemCatalog';
import type { CharacterItem } from '../../services/itemService';
import type { CatalogItem } from '../../services/itemCatalog';

vi.mock('../../services/itemCatalog', async () => {
  const actual = await vi.importActual<typeof import('../../services/itemCatalog')>('../../services/itemCatalog');
  return { ...actual, searchLocalCatalog: vi.fn() };
});

const material = (overrides: Partial<CharacterItem> = {}): CharacterItem =>
  ({
    id: 'ci-1',
    character_id: 'c-1',
    quantity: 2,
    is_magic: false,
    name_override: '紅蓮爆鱗龍-濃縮的爆腺液',
    name_en_override: 'Distilled Blast Fluid',
    category_override: 'MH素材',
    rarity_override: '22',
    source_override: '紅蓮爆鱗龍',
    created_at: '',
    updated_at: '',
    ...overrides,
  }) as CharacterItem;

const potion: CharacterItem = {
  ...material({ name_override: '治療藥水', name_en_override: 'Healing Potion', category_override: '藥水', rarity_override: '稀有', source_override: null }),
};

describe('道具列表卡片', () => {
  it('MH素材 顯示來源與 CR（CR 只出現一次）', () => {
    render(<ItemCard item={material()} onClick={vi.fn()} />);
    expect(screen.getByText('來源：紅蓮爆鱗龍')).toBeInTheDocument();
    expect(screen.getAllByText('CR 22')).toHaveLength(1);
  });

  it('其他類別沒有來源行，稀有度標籤維持在標籤列', () => {
    render(<ItemCard item={potion} onClick={vi.fn()} />);
    expect(screen.queryByText(/來源/)).not.toBeInTheDocument();
    expect(screen.getByText('稀有')).toBeInTheDocument();
  });
});

describe('道具詳情', () => {
  it('MH素材 顯示來源與 CR（CR 只出現一次）', () => {
    render(<ItemDetailModal isOpen onClose={vi.fn()} characterItem={material()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('來源：紅蓮爆鱗龍')).toBeInTheDocument();
    expect(screen.getAllByText('CR 22')).toHaveLength(1);
  });
});

describe('獲得物品搜尋結果', () => {
  it('MH素材 顯示來源與 CR；通用道具沒有來源行', async () => {
    const mocked = ItemCatalog.searchLocalCatalog as unknown as ReturnType<typeof vi.fn>;
    const items: CatalogItem[] = [
      { source: 'material', entry: { name: '紅蓮爆鱗龍-紅蓮玉', nameEn: 'Seething Gem', rarity: 22, source: '紅蓮爆鱗龍' } },
      { source: 'general', entry: { name: '紅蓮藥水', category: '藥水', rarity: '稀有' } },
    ];
    mocked.mockResolvedValue(items);

    render(<LearnItemModal isOpen onClose={vi.fn()} onLearnItem={vi.fn()} onCreateNew={vi.fn()} learnedItems={[]} />);
    fireEvent.change(screen.getByPlaceholderText('輸入名稱或描述...'), { target: { value: '紅蓮' } });

    await waitFor(() => expect(screen.getByText('來源：紅蓮爆鱗龍')).toBeInTheDocument());
    expect(screen.getAllByText('CR 22')).toHaveLength(1);
    expect(screen.getAllByText(/來源：/)).toHaveLength(1);
  });
});
