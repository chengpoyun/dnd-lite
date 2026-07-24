/**
 * 新增物品（獲得物品 learnItem / 新增個人物品 createCharacterItem）應該出現在列表最上面。
 * getCharacterItems 依 sort_order 升序排序（null 排最後），所以新物品要寫入一個
 * 比目前所有物品都小的 sort_order。做法：sort_order = -Date.now()，越晚新增的值越小
 * （負得越多），永遠排在所有既有的正數 sort_order 之前，也永遠排在更早新增的物品之前。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { supabase } from '../../lib/supabase';
import { learnItem, createCharacterItem } from '../../services/itemService';

function createChainable(finalResult: { data?: any; error: any }) {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(finalResult)),
    then: (resolve: any) => Promise.resolve(finalResult).then(resolve),
  };
  return builder;
}

describe('新增物品時寫入 sort_order，讓它排在列表最上面', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('learnItem（獲得物品）寫入 sort_order = -Date.now()', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const builder = createChainable({ data: null, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await learnItem('c1', 'g1');

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ sort_order: -1_000_000 })
    );
  });

  it('createCharacterItem（新增個人物品）寫入 sort_order = -Date.now()', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(2_000_000);
    const builder = createChainable({ data: { id: 'ci1' }, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await createCharacterItem('c1', { name: '筆記', category: '雜項', is_magic: false });

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ sort_order: -2_000_000 })
    );
  });

  it('依序新增兩筆物品，越晚新增的 sort_order 越小（排序時會排在更前面）', async () => {
    const builder = createChainable({ data: { id: 'ci1' }, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    vi.spyOn(Date, 'now').mockReturnValue(1000);
    await createCharacterItem('c1', { name: '第一個', category: '雜項', is_magic: false });
    const firstOrder = builder.insert.mock.calls[0][0].sort_order;

    vi.spyOn(Date, 'now').mockReturnValue(2000);
    await createCharacterItem('c1', { name: '第二個', category: '雜項', is_magic: false });
    const secondOrder = builder.insert.mock.calls[1][0].sort_order;

    expect(secondOrder).toBeLessThan(firstOrder);
  });
});
