import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  getDisplayValues,
  getDisplayEquipmentKind,
  learnItem,
  createCharacterItem,
  getCharacterItems,
  searchGlobalItems,
  type CharacterItem,
  type GlobalItem,
} from '../../services/itemService';

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

const baseGlobalItem: GlobalItem = {
  id: 'g1',
  name: '長劍',
  description: '一把普通的長劍',
  category: '裝備',
  is_magic: false,
  created_at: '',
  updated_at: '',
};

function makeCharacterItem(overrides: Partial<CharacterItem> = {}): CharacterItem {
  return {
    id: 'ci1',
    character_id: 'c1',
    item_id: 'g1',
    quantity: 1,
    is_magic: false,
    created_at: '',
    updated_at: '',
    item: baseGlobalItem,
    ...overrides,
  };
}

describe('getDisplayValues（override 優先於原始值的邏輯）', () => {
  it('掛有 global item 且無任何 override 時，顯示原始的 global item 資料', () => {
    const result = getDisplayValues(makeCharacterItem());

    expect(result.displayName).toBe('長劍');
    expect(result.displayDescription).toBe('一把普通的長劍');
    expect(result.displayCategory).toBe('裝備');
    expect(result.displayIsMagic).toBe(false);
  });

  it('有 override 值時，override 優先於 global item 的原始值', () => {
    const result = getDisplayValues(
      makeCharacterItem({
        name_override: '烈焰長劍',
        description_override: '附魔過的長劍',
        category_override: 'MH素材',
        is_magic_override: true,
      })
    );

    expect(result.displayName).toBe('烈焰長劍');
    expect(result.displayDescription).toBe('附魔過的長劍');
    expect(result.displayCategory).toBe('MH素材');
    expect(result.displayIsMagic).toBe(true);
  });

  it('is_magic_override 為 false（非 undefined）時，仍應覆蓋 global item 的 is_magic', () => {
    const result = getDisplayValues(
      makeCharacterItem({ item: { ...baseGlobalItem, is_magic: true }, is_magic_override: false })
    );

    expect(result.displayIsMagic).toBe(false);
  });

  it('純個人物品（item_id 為 null）時，is_magic 直接取用 character_item 自己的值', () => {
    const result = getDisplayValues(
      makeCharacterItem({ item_id: null, item: undefined, is_magic: true, name_override: '手抄筆記' })
    );

    expect(result.displayIsMagic).toBe(true);
    expect(result.displayName).toBe('手抄筆記');
  });

  it('沒有任何名稱來源時，displayCategory 退回預設值「雜項」', () => {
    const result = getDisplayValues(
      makeCharacterItem({ item_id: null, item: undefined, category_override: undefined })
    );

    expect(result.displayCategory).toBe('雜項');
  });
});

describe('getDisplayEquipmentKind', () => {
  it('有 equipment_kind_override 時優先使用', () => {
    const item = makeCharacterItem({
      equipment_kind_override: 'head',
      item: { ...baseGlobalItem, equipment_kind: 'body' },
    });
    expect(getDisplayEquipmentKind(item)).toBe('head');
  });

  it('equipment_kind_override 為空字串時視為未覆寫，改用 global item 的值', () => {
    const item = makeCharacterItem({
      equipment_kind_override: '',
      item: { ...baseGlobalItem, equipment_kind: 'body' },
    });
    expect(getDisplayEquipmentKind(item)).toBe('body');
  });

  it('都沒有時回傳 null', () => {
    const item = makeCharacterItem({ equipment_kind_override: undefined, item: { ...baseGlobalItem, equipment_kind: undefined } });
    expect(getDisplayEquipmentKind(item)).toBeNull();
  });
});

describe('learnItem', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('characterId 或 itemId 缺少時直接回傳失敗，不呼叫 DB', async () => {
    expect(await learnItem('', 'g1')).toEqual({ success: false, error: '角色 ID 或物品 ID 無效' });
    expect(await learnItem('c1', '')).toEqual({ success: false, error: '角色 ID 或物品 ID 無效' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('重複獲得物品（唯一鍵衝突 23505）時，回傳友善錯誤訊息而非原始 DB 錯誤', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { code: '23505', message: 'duplicate key value' } }));

    const result = await learnItem('c1', 'g1');

    expect(result).toEqual({ success: false, error: '已經擁有此物品' });
  });

  it('其他資料庫錯誤時，原樣回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { code: 'OTHER', message: 'boom' } }));

    const result = await learnItem('c1', 'g1');

    expect(result).toEqual({ success: false, error: 'boom' });
  });

  it('成功時把裝備選項一併寫入 payload', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456);
    const builder = createChainable({ data: null, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await learnItem('c1', 'g1', { equipment_slot: 'head', is_equipped: true });

    expect(builder.insert).toHaveBeenCalledWith({
      character_id: 'c1',
      item_id: 'g1',
      quantity: 1,
      sort_order: -123456,
      equipment_slot: 'head',
      is_equipped: true,
    });
    vi.restoreAllMocks();
  });
});

describe('createCharacterItem', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('characterId 缺少時直接回傳失敗', async () => {
    const result = await createCharacterItem('', { name: '筆記', category: '雜項', is_magic: false });
    expect(result).toEqual({ success: false, error: '角色 ID 無效' });
  });

  it('名稱為空白字元時視為未填寫，回傳失敗', async () => {
    const result = await createCharacterItem('c1', { name: '   ', category: '雜項', is_magic: false });
    expect(result).toEqual({ success: false, error: '名稱和類別為必填' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('缺少 category 時回傳失敗', async () => {
    const result = await createCharacterItem('c1', { name: '筆記', category: undefined as any, is_magic: false });
    expect(result).toEqual({ success: false, error: '名稱和類別為必填' });
  });

  it('名稱與描述會被 trim 後才寫入，quantity 未傳入時預設為 1', async () => {
    const builder = createChainable({ data: { id: 'ci1' }, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await createCharacterItem('c1', { name: '  神秘卷軸  ', category: '雜項', description: '  一份卷軸  ', is_magic: true });

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name_override: '神秘卷軸',
        description_override: '一份卷軸',
        quantity: 1,
        is_magic: true,
      })
    );
  });
});

describe('getCharacterItems', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('characterId 缺少時直接回傳失敗', async () => {
    const result = await getCharacterItems('');
    expect(result).toEqual({ success: false, error: '角色 ID 無效' });
  });

  it('JOIN 回傳陣列形式的 item 時，取陣列第一筆展開', async () => {
    mockedSupabase.from.mockReturnValue(
      createChainable({
        data: [{ id: 'ci1', character_id: 'c1', item: [baseGlobalItem] }],
        error: null,
      })
    );

    const result = await getCharacterItems('c1');

    expect(result.items?.[0].item).toEqual(baseGlobalItem);
  });

  it('JOIN 回傳空陣列形式的 item 時（無對應 global item），item 維持為空陣列（typeof [] === "object" 導致沒有真的轉成 undefined）', async () => {
    // 這是目前實作的真實行為（非期望行為的斷言）：程式碼用 `typeof row.item === 'object' ? row.item : undefined`
    // 當作 fallback，但 `typeof [] === 'object'` 也是 true，所以空陣列不會被轉成 undefined，
    // 而是原封不動地留著（跟型別宣告 CharacterItem['item']?: GlobalItem 不符）。
    mockedSupabase.from.mockReturnValue(
      createChainable({ data: [{ id: 'ci1', character_id: 'c1', item: [] }], error: null })
    );

    const result = await getCharacterItems('c1');

    expect(result.items?.[0].item).toEqual([]);
  });

  it('JOIN 的 item 欄位為 null 時，item 維持為 null（同樣因 typeof null === "object" 而未被轉成 undefined）', async () => {
    mockedSupabase.from.mockReturnValue(
      createChainable({ data: [{ id: 'ci1', character_id: 'c1', item: null }], error: null })
    );

    const result = await getCharacterItems('c1');

    expect(result.items?.[0].item).toBeNull();
  });

  it('JOIN 完全沒有 item 屬性時，item 才會真的變成 undefined', async () => {
    mockedSupabase.from.mockReturnValue(
      createChainable({ data: [{ id: 'ci1', character_id: 'c1' }], error: null })
    );

    const result = await getCharacterItems('c1');

    expect(result.items?.[0].item).toBeUndefined();
  });

  it('查詢失敗時回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { message: 'fail' } }));

    const result = await getCharacterItems('c1');

    expect(result).toEqual({ success: false, error: 'fail' });
  });
});

describe('searchGlobalItems', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('空字串（含純空白）查詢時直接回傳空陣列，不呼叫 DB', async () => {
    const result = await searchGlobalItems('   ');

    expect(result).toEqual({ success: true, items: [] });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('查詢字串中的 % 與 _ 會被跳脫，避免被誤判成 ilike 萬用字元', async () => {
    const builder = createChainable({ data: [], error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await searchGlobalItems('50%_off');

    const orArg = builder.or.mock.calls[0][0] as string;
    expect(orArg).toContain('50\\%\\_off');
  });
});
